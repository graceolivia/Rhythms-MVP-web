import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import sunPng from '../assets/sky/sun001.png';
import moonPng from '../assets/sky/moon001.png';
import { useTaskStore } from '../stores/useTaskStore';
import { useChildStore } from '../stores/useChildStore';
import { useNapState } from '../hooks/useNapState';
import { useSunTimes } from '../hooks/useSunTimes';
import { useAvailability } from '../hooks/useAvailability';
import { ChildStatusBar } from '../components/care/ChildStatusBar';
import { TransitionPrompts } from '../components/care/TransitionPrompts';
import { useTransitionCheck } from '../hooks/useTransitionCheck';
import { useEventStore } from '../stores/useEventStore';
import { useNapPrediction } from '../hooks/useNapPrediction';
import { GoodEnoughModal } from '../components/common/GoodEnoughModal';
import { QuickAddSeed } from '../components/tasks/QuickAddSeed';
import { TaskEditor } from '../components/tasks/TaskEditor';
import { DayTimeline } from '../components/today/DayTimeline';
import { YourWindow } from '../components/today/YourWindow';
import { ComingUp } from '../components/today/ComingUp';
import { TaskCard } from '../components/today/TaskCard';
import { GrowingPlot } from '../components/today/GrowingPlot';
import { HabitBlockCard } from '../components/today/HabitBlockCard';
import { ChoreQueueBanner } from '../components/today/ChoreQueueBanner';
import { useActiveBlock } from '../hooks/useActiveBlock';
import { useChallengeProgress } from '../hooks/useChallengeProgress';
import { useChallengeStore } from '../stores/useChallengeStore';
import type { Task, TaskInstance, TaskTier, NapContext, CareContext } from '../types';

// ────────────────────────────────────────────────
//  Legacy helpers (kept for backward compat)
// ────────────────────────────────────────────────

/** @deprecated */
function isTaskSuggestedForNapState(task: Task, napState: NapContext): boolean {
  if (!task.napContext || task.napContext === 'any') return false;
  if (napState === 'any') return false;
  switch (napState) {
    case 'both-asleep':
      return task.napContext === 'both-asleep'
        || task.napContext === 'baby-asleep'
        || task.napContext === 'toddler-asleep';
    case 'baby-asleep': return task.napContext === 'baby-asleep';
    case 'toddler-asleep': return task.napContext === 'toddler-asleep';
    case 'both-awake': return task.napContext === 'both-awake';
    default: return false;
  }
}

/** @deprecated */
function isTaskSuggestedForCareContext(task: Task, currentContext: CareContext): boolean {
  if (!task.careContext || task.careContext === 'any') return false;
  switch (currentContext) {
    case 'all-away': return task.careContext === 'all-away' || task.careContext === 'any-away';
    case 'any-away': return task.careContext === 'any-away';
    case 'all-home': return task.careContext === 'all-home';
    default: return false;
  }
}

// ────────────────────────────────────────────────
//  Types & constants
// ────────────────────────────────────────────────

interface TaskWithInstance {
  task: Task;
  instance: TaskInstance;
}

const TIER_ORDER: TaskTier[] = ['anchor', 'rhythm', 'tending'];
const TIER_CONFIG: Record<TaskTier, { label: string; subtitle: string; color: string; bg: string }> = {
  anchor: { label: 'Anchor', subtitle: 'Fixed events that structure your day', color: 'text-terracotta', bg: 'bg-terracotta/10' },
  rhythm: { label: 'Rhythm', subtitle: 'Daily non-negotiables, flexible in timing', color: 'text-sage', bg: 'bg-sage/10' },
  tending: { label: 'Tending', subtitle: 'Nice-to-haves that maintain your life', color: 'text-lavender', bg: 'bg-lavender/10' },
};

// ────────────────────────────────────────────────
//  Sky Header (unchanged)
// ────────────────────────────────────────────────

function getSkyGradient(dayProgress: number): string {
  if (dayProgress < -0.15) return 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)';
  if (dayProgress < -0.02) return 'linear-gradient(180deg, #1e1b4b 0%, #581c87 40%, #831843 70%, #1e1b4b 100%)';
  if (dayProgress < 0.08) return 'linear-gradient(180deg, #fecdd3 0%, #fed7aa 40%, #bae6fd 80%, #FAF6F1 100%)';
  if (dayProgress < 0.2) return 'linear-gradient(180deg, #7dd3fc 0%, #bae6fd 50%, #fef3c7 80%, #FAF6F1 100%)';
  if (dayProgress < 0.8) return 'linear-gradient(180deg, #38bdf8 0%, #7dd3fc 40%, #e0f2fe 75%, #FAF6F1 100%)';
  if (dayProgress < 0.92) return 'linear-gradient(180deg, #7dd3fc 0%, #fdba74 45%, #fecdd3 75%, #FAF6F1 100%)';
  if (dayProgress < 1.02) return 'linear-gradient(180deg, #f97316 0%, #ec4899 35%, #7c3aed 70%, #2e1065 100%)';
  if (dayProgress < 1.15) return 'linear-gradient(180deg, #4c1d95 0%, #1e1b4b 60%, #0f172a 100%)';
  return 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)';
}

function SkyHeader({ justBloomedId }: { justBloomedId?: string | null }) {
  const { sunrise, sunset } = useSunTimes();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const sunriseMs = sunrise.getTime();
  const sunsetMs = sunset.getTime();
  const nowMs = now.getTime();
  const dayLength = sunsetMs - sunriseMs;
  const dayProgress = (nowMs - sunriseMs) / dayLength;

  const sunPosition = useMemo(() => {
    const visible = dayProgress > -0.05 && dayProgress < 1.05;
    const clamped = Math.max(0, Math.min(1, dayProgress));
    const x = 8 + clamped * 84;
    const arc = 4 * clamped * (1 - clamped);
    const bottomPx = 8 + arc * 80;
    const opacity = dayProgress < 0
      ? Math.max(0, 1 + dayProgress * 20)
      : dayProgress > 1
        ? Math.max(0, 1 - (dayProgress - 1) * 20)
        : 1;
    return { visible, x, bottomPx, opacity };
  }, [dayProgress]);

  const moonPosition = useMemo(() => {
    const nightLength = 24 * 60 * 60 * 1000 - dayLength;
    let nightProgress: number;
    if (dayProgress > 1) {
      nightProgress = (nowMs - sunsetMs) / nightLength;
    } else if (dayProgress < 0) {
      nightProgress = 1 - (sunriseMs - nowMs) / nightLength;
    } else {
      nightProgress = -1;
    }
    const visible = nightProgress > -0.05 && nightProgress < 1.05;
    const clamped = Math.max(0, Math.min(1, nightProgress));
    const x = 8 + clamped * 84;
    const arc = 4 * clamped * (1 - clamped);
    const bottomPx = 8 + arc * 80;
    const opacity = nightProgress < 0
      ? Math.max(0, 1 + nightProgress * 20)
      : nightProgress > 1
        ? Math.max(0, 1 - (nightProgress - 1) * 20)
        : 1;
    return { visible, x, bottomPx, opacity };
  }, [dayProgress, nowMs, sunriseMs, sunsetMs, dayLength]);

  const skyGradient = getSkyGradient(dayProgress);
  const isNight = dayProgress < -0.1 || dayProgress > 1.1;
  const isDawnOrDusk = (dayProgress > -0.05 && dayProgress < 0.08) || (dayProgress > 0.92 && dayProgress < 1.05);

  return (
    <header
      className="-mx-4 -mt-4 px-4 pt-6 pb-0 mb-4 relative overflow-hidden flex flex-col"
      style={{ background: skyGradient, minHeight: '200px' }}
    >
      {sunPosition.visible && (
        <img src={sunPng} alt="" className="absolute w-10 h-10 pointer-events-none select-none"
          style={{ left: `${sunPosition.x}%`, bottom: `${sunPosition.bottomPx}px`, transform: 'translateX(-50%)', opacity: sunPosition.opacity, filter: isDawnOrDusk ? 'brightness(1.3) saturate(0.7)' : 'none', transition: 'bottom 60s linear, left 60s linear' }} />
      )}
      {moonPosition.visible && (
        <img src={moonPng} alt="" className="absolute w-9 h-9 pointer-events-none select-none"
          style={{ left: `${moonPosition.x}%`, bottom: `${moonPosition.bottomPx}px`, transform: 'translateX(-50%)', opacity: moonPosition.opacity, transition: 'bottom 60s linear, left 60s linear' }} />
      )}
      {isNight && (
        <>
          <div className="absolute w-1 h-1 bg-white/60 rounded-full" style={{ left: '15%', top: '20px' }} />
          <div className="absolute w-1 h-1 bg-white/40 rounded-full" style={{ left: '35%', top: '45px' }} />
          <div className="absolute w-1.5 h-1.5 bg-white/50 rounded-full" style={{ left: '55%', top: '15px' }} />
          <div className="absolute w-1 h-1 bg-white/30 rounded-full" style={{ left: '75%', top: '55px' }} />
          <div className="absolute w-1 h-1 bg-white/50 rounded-full" style={{ left: '85%', top: '30px' }} />
          <div className="absolute w-1 h-1 bg-white/40 rounded-full" style={{ left: '25%', top: '65px' }} />
        </>
      )}
      {/* Top bar: icons only */}
      <div className="relative z-10 flex justify-between items-start">
        <div className={`text-right text-sm ${isNight ? 'text-white/60' : 'text-bark/50'}`}>
          <p>☀️ {format(sunrise, 'h:mm a')}</p>
          <p>🌙 {format(sunset, 'h:mm a')}</p>
        </div>
        <Link to="/timeline" className={`p-2 rounded-lg transition-colors ${isNight ? 'bg-white/10 hover:bg-white/20 text-white/80' : 'bg-bark/5 hover:bg-bark/10 text-bark/60'}`} title="View Timeline">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </Link>
      </div>
      {/* Date below the sun/moon arc */}
      <div className="relative z-10 mt-auto">
        <p className={`text-sm ${isNight ? 'text-white/70' : 'text-bark/60'}`}>{format(now, 'EEEE')}</p>
        <h1 className={`font-display text-3xl ${isNight ? 'text-white' : 'text-bark'}`}>{format(now, 'MMMM d')}</h1>
      </div>

      {/* Growing plot at bottom of header */}
      <div className="relative z-10">
        <GrowingPlot isNight={isNight} justBloomedId={justBloomedId} />
      </div>
    </header>
  );
}

// ────────────────────────────────────────────────
//  All Tasks view (accessed via "See all tasks")
// ────────────────────────────────────────────────

function AllTasksView({
  tasksWithInstances,
  onTaskTap,
  onDefer,
  recentlyCompleted,
  fadingOut,
  expandedDoneSections,
  toggleDoneSection,
  setEditingTier,
  today,
}: {
  tasksWithInstances: TaskWithInstance[];
  onTaskTap: (instance: TaskInstance) => void;
  onDefer: (instanceId: string) => void;
  recentlyCompleted: Set<string>;
  fadingOut: Set<string>;
  expandedDoneSections: Set<string>;
  toggleDoneSection: (key: string) => void;
  setEditingTier: (tier: TaskTier) => void;
  today: string;
}) {
  const { napState } = useNapState();
  const getCurrentCareContext = useChildStore((state) => state.getCurrentCareContext);
  const careContext = getCurrentCareContext();
  const { isTaskSuggested } = useAvailability();

  const groupedByTier = TIER_ORDER.map((tier) => ({
    tier,
    config: TIER_CONFIG[tier],
    items: tasksWithInstances.filter((item) => item.task.tier === tier),
  })).filter((group) => group.items.length > 0);

  const tierProgress = new Map(
    groupedByTier.map((group) => [
      group.tier,
      {
        total: group.items.length,
        completed: group.items.filter((item) => item.instance.status === 'completed').length,
      },
    ])
  );

  return (
    <div className="space-y-4">
      {groupedByTier.map((group) => {
        const visibleItems = group.items
          .filter((item) => item.instance.status !== 'completed' || recentlyCompleted.has(item.instance.id))
          .sort((a, b) => {
            const aSuggested = isTaskSuggested(a.task) && a.instance.status !== 'completed';
            const bSuggested = isTaskSuggested(b.task) && b.instance.status !== 'completed';
            const aSuggestedNap = isTaskSuggestedForNapState(a.task, napState) && a.instance.status !== 'completed';
            const bSuggestedNap = isTaskSuggestedForNapState(b.task, napState) && b.instance.status !== 'completed';
            const aSuggestedCare = isTaskSuggestedForCareContext(a.task, careContext) && a.instance.status !== 'completed';
            const bSuggestedCare = isTaskSuggestedForCareContext(b.task, careContext) && b.instance.status !== 'completed';
            const aAny = aSuggested || aSuggestedNap || aSuggestedCare;
            const bAny = bSuggested || bSuggestedNap || bSuggestedCare;
            if (aAny && !bAny) return -1;
            if (!aAny && bAny) return 1;
            return 0;
          });
        const doneItems = group.items.filter(
          (item) => item.instance.status === 'completed' && !recentlyCompleted.has(item.instance.id)
        );
        const isExpanded = expandedDoneSections.has(group.tier);

        return (
          <section key={group.tier}>
            <div className="mb-2">
              <div className="flex items-center gap-2">
                <h2 className={`font-body font-semibold text-sm ${group.config.color}`}>
                  {group.config.label}s
                </h2>
                <span className="text-xs text-bark/40">
                  {tierProgress.get(group.tier)?.completed ?? 0}/{tierProgress.get(group.tier)?.total ?? 0}
                </span>
                <button
                  onClick={() => setEditingTier(group.tier)}
                  className="ml-auto text-bark/30 hover:text-bark/60 p-1"
                  aria-label={`Edit ${group.config.label}s`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-bark/40 mt-0.5">{group.config.subtitle}</p>
            </div>
            <div className="space-y-2">
              {visibleItems.map(({ task, instance }) => {
                const isFading = fadingOut.has(instance.id);
                const suggestedAvailability = isTaskSuggested(task) && instance.status !== 'completed';
                const suggestedNap = isTaskSuggestedForNapState(task, napState) && instance.status !== 'completed';
                const suggestedCare = isTaskSuggestedForCareContext(task, careContext) && instance.status !== 'completed';
                const suggested = suggestedAvailability || suggestedNap || suggestedCare;
                return (
                  <div key={instance.id} className={`transition-all duration-300 ease-in-out ${isFading ? 'opacity-0 max-h-0 overflow-hidden -my-1' : 'opacity-100 max-h-40'}`}>
                    <TaskCard
                      task={task} instance={instance} today={today} suggested={suggested}
                      onTap={() => onTaskTap(instance)}
                      onDefer={task.tier === 'tending' && instance.status !== 'completed' ? () => onDefer(instance.id) : undefined}
                    />
                  </div>
                );
              })}
              {doneItems.length > 0 && (
                <div>
                  <button onClick={() => toggleDoneSection(group.tier)} className="flex items-center gap-2 text-xs text-bark/40 hover:text-bark/60 py-1 transition-colors">
                    <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                    <span>{doneItems.length} done</span>
                  </button>
                  {isExpanded && (
                    <div className="space-y-2 mt-2">
                      {doneItems.map(({ task, instance }) => (
                        <TaskCard key={instance.id} task={task} instance={instance} today={today} onTap={() => onTaskTap(instance)} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────
//  Main Today screen
// ────────────────────────────────────────────────

export function Today() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [editingTier, setEditingTier] = useState<TaskTier | null>(null);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [recentlyCompleted, setRecentlyCompleted] = useState<Set<string>>(new Set());
  const [fadingOut, setFadingOut] = useState<Set<string>>(new Set());
  const [expandedDoneSections, setExpandedDoneSections] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>[]>>(new Map());

  const tasks = useTaskStore((state) => state.tasks);
  const taskInstances = useTaskStore((state) => state.taskInstances);
  const generateDailyInstances = useTaskStore((state) => state.generateDailyInstances);
  const completeTask = useTaskStore((state) => state.completeTask);
  const deferTask = useTaskStore((state) => state.deferTask);
  const resetTaskInstance = useTaskStore((state) => state.resetTaskInstance);
  const { stateLabel, stateDescription } = useAvailability();
  const hasEventFired = useEventStore((state) => state.hasEventFired);
  const getEventTimestamp = useEventStore((state) => state.getEventTimestamp);
  const napPredictions = useNapPrediction();
  const { activeBlock } = useActiveBlock();
  const { justBloomedId, bloomToast } = useChallengeProgress();
  const clearBloomedChallenges = useChallengeStore((s) => s.clearBloomedChallenges);

  // Check for transitions on mount + every 5 min
  useTransitionCheck();

  // Generate today's instances on mount + clear yesterday's bloomed challenges
  useEffect(() => {
    generateDailyInstances(new Date());
    clearBloomedChallenges();
  }, [generateDailyInstances, clearBloomedChallenges]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timers) => timers.forEach(clearTimeout));
    };
  }, []);

  // Get today's instances with their task templates
  const todaysInstances = taskInstances.filter(
    (instance) => instance.date === today && instance.status !== 'deferred'
  );

  const tasksWithInstances: TaskWithInstance[] = todaysInstances
    .map((instance) => {
      const task = tasks.find((t) => t.id === instance.taskId);
      return task ? { task, instance } : null;
    })
    .filter((item): item is TaskWithInstance => item !== null)
    .filter((item) => !item.task.isInformational && item.task.childTaskType !== 'pickup' && item.task.childTaskType !== 'dropoff')
    .filter((item) => {
      if (!item.task.triggeredBy) return true;
      if (!hasEventFired(item.task.triggeredBy)) return false;
      if (item.task.triggerDelayMinutes) {
        const firedAt = getEventTimestamp(item.task.triggeredBy);
        if (firedAt) {
          const elapsed = (Date.now() - new Date(firedAt).getTime()) / 60000;
          return elapsed >= item.task.triggerDelayMinutes;
        }
        return false;
      }
      return true;
    });

  const handleTaskTap = useCallback((instance: TaskInstance) => {
    if (instance.status === 'completed') {
      const existing = timersRef.current.get(instance.id);
      if (existing) {
        existing.forEach(clearTimeout);
        timersRef.current.delete(instance.id);
      }
      setFadingOut((prev) => { const next = new Set(prev); next.delete(instance.id); return next; });
      setRecentlyCompleted((prev) => { const next = new Set(prev); next.delete(instance.id); return next; });
      resetTaskInstance(instance.id);
    } else {
      completeTask(instance.id);
      setRecentlyCompleted((prev) => new Set(prev).add(instance.id));

      const fadeTimer = setTimeout(() => {
        setFadingOut((prev) => new Set(prev).add(instance.id));
      }, 2700);

      const removeTimer = setTimeout(() => {
        setRecentlyCompleted((prev) => { const next = new Set(prev); next.delete(instance.id); return next; });
        setFadingOut((prev) => { const next = new Set(prev); next.delete(instance.id); return next; });
        timersRef.current.delete(instance.id);
      }, 3000);

      timersRef.current.set(instance.id, [fadeTimer, removeTimer]);
    }
  }, [completeTask, resetTaskInstance]);

  const handleDefer = useCallback((instanceId: string) => {
    deferTask(instanceId, null);
  }, [deferTask]);

  const toggleDoneSection = (key: string) => {
    setExpandedDoneSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-parchment/30">
      <div className="max-w-lg mx-auto p-4">
        <SkyHeader justBloomedId={justBloomedId} />

        {/* Transition prompts (Phase 2) */}
        <TransitionPrompts napContext={Object.fromEntries(
          Object.entries(napPredictions).map(([id, p]) => [id, { wakeWindowText: p.wakeWindowText ?? undefined }])
        )} />

        {/* Child status bar (Phase 1) */}
        <ChildStatusBar napPredictions={Object.fromEntries(
          Object.entries(napPredictions).map(([id, p]) => [id, {
            nextNapTime: p.nextNapTime ?? undefined,
            probableWakeTime: p.probableWakeTime ?? undefined,
            wakeWindowWarning: p.wakeWindowWarning ?? undefined,
          }])
        )} />

        {/* Day timeline (Phase 5) */}
        <DayTimeline />

        {tasksWithInstances.length === 0 ? (
          <div className="text-center py-12 bg-cream rounded-xl">
            <p className="text-bark/60">No tasks for today.</p>
            <p className="text-bark/40 text-sm mt-2">Add some tasks to get started.</p>
          </div>
        ) : showAllTasks ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium text-bark/50 uppercase tracking-wide">All Tasks</h2>
              <button
                onClick={() => setShowAllTasks(false)}
                className="text-xs text-sage hover:text-sage/80 font-medium"
              >
                Back to focus view
              </button>
            </div>
            <AllTasksView
              tasksWithInstances={tasksWithInstances}
              onTaskTap={handleTaskTap}
              onDefer={handleDefer}
              recentlyCompleted={recentlyCompleted}
              fadingOut={fadingOut}
              expandedDoneSections={expandedDoneSections}
              toggleDoneSection={toggleDoneSection}
              setEditingTier={setEditingTier}
              today={today}
            />
          </>
        ) : (
          <>
            {/* Active block view — shows when a habit block is currently active */}
            {activeBlock ? (
              <HabitBlockCard
                block={activeBlock}
                onTaskTap={handleTaskTap}
                fadingOut={fadingOut}
                recentlyCompleted={recentlyCompleted}
              />
            ) : (
              <>
                {/* Chore queue banner — shows between blocks if chore not yet done */}
                <ChoreQueueBanner />

                {/* Your Window — primary focus (Phase 5) */}
                <YourWindow
                  availabilityLabel={stateLabel}
                  availabilityDescription={stateDescription}
                  tasksWithInstances={tasksWithInstances}
                  onTaskTap={handleTaskTap}
                  onDefer={handleDefer}
                  recentlyCompleted={recentlyCompleted}
                  fadingOut={fadingOut}
                />
              </>
            )}

            {/* Coming Up (Phase 5) */}
            <ComingUp />

            {/* See all tasks link */}
            <div className="text-center mt-2 mb-4">
              <button
                onClick={() => setShowAllTasks(true)}
                className="text-xs text-bark/40 hover:text-bark/60 underline underline-offset-2"
              >
                See all tasks by priority
              </button>
            </div>
          </>
        )}

        {/* Bottom padding for mobile */}
        <div className="h-20" />
      </div>

      <GoodEnoughModal />

      {/* Bloom toast */}
      {bloomToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-cream border border-sage/30 rounded-xl px-4 py-3 shadow-lg text-center">
            <p className="text-sm font-medium text-bark">
              Your {bloomToast} bloomed! 🌺
            </p>
            <p className="text-xs text-bark/50 mt-0.5">Check your garden</p>
          </div>
        </div>
      )}

      {/* Floating Add Button */}
      <div className="fixed bottom-20 left-0 right-0 flex justify-center z-40 pointer-events-none">
        <div className="w-full max-w-lg px-4 flex justify-end pointer-events-auto">
          <button
            onClick={() => setShowQuickAdd(true)}
            className="w-14 h-14 bg-terracotta text-cream rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-1 hover:bg-terracotta/90 transition-all duration-200 flex items-center justify-center"
            aria-label="Add new seed"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      <QuickAddSeed isOpen={showQuickAdd} onClose={() => setShowQuickAdd(false)} />

      {editingTier && (
        <TaskEditor tier={editingTier} isOpen={true} onClose={() => { setEditingTier(null); generateDailyInstances(new Date()); }} />
      )}
    </div>
  );
}
