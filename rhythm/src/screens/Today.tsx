import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import sunPng from '../assets/sky/sun001.png';
import moonPng from '../assets/sky/moon001.png';
import { useTaskStore, getTaskDisplayTitle } from '../stores/useTaskStore';
import { useChildStore } from '../stores/useChildStore';
import { useGoodEnoughDay } from '../hooks/useGoodEnoughDay';
import { useNapState } from '../hooks/useNapState';
import { useSunTimes } from '../hooks/useSunTimes';
import { useAvailability } from '../hooks/useAvailability';
import { NapControls } from '../components/naps/NapControls';
import { AwayControls } from '../components/care/AwayControls';
import { GoodEnoughModal } from '../components/common/GoodEnoughModal';
import { QuickAddSeed } from '../components/tasks/QuickAddSeed';
import { TaskEditor } from '../components/tasks/TaskEditor';
import type { Task, TaskInstance, TaskTier, NapContext, TimeBlock, CareContext } from '../types';

/**
 * @deprecated Use isTaskSuggestedForAvailability from useTaskStore instead.
 * This function is kept for backwards compatibility during migration.
 *
 * Determines if a task is specifically suited to the current nap window.
 * Only highlights tasks with a specific nap preference (not 'any' or null).
 */
function isTaskSuggestedForNapState(task: Task, napState: NapContext): boolean {
  if (!task.napContext || task.napContext === 'any') return false;
  if (napState === 'any') return false;

  switch (napState) {
    case 'both-asleep':
      // Golden hour — all nap-specific tasks are doable
      return task.napContext === 'both-asleep'
        || task.napContext === 'baby-asleep'
        || task.napContext === 'toddler-asleep';
    case 'baby-asleep':
      return task.napContext === 'baby-asleep';
    case 'toddler-asleep':
      return task.napContext === 'toddler-asleep';
    case 'both-awake':
      return task.napContext === 'both-awake';
    default:
      return false;
  }
}

/**
 * @deprecated Use isTaskSuggestedForAvailability from useTaskStore instead.
 * This function is kept for backwards compatibility during migration.
 *
 * Determines if a task is suggested based on care context.
 */
function isTaskSuggestedForCareContext(task: Task, currentContext: CareContext): boolean {
  if (!task.careContext || task.careContext === 'any') return false;

  switch (currentContext) {
    case 'all-away':
      // All children away - can do all-away, any-away tasks
      return task.careContext === 'all-away' || task.careContext === 'any-away';
    case 'any-away':
      // Some children away - can do any-away tasks
      return task.careContext === 'any-away';
    case 'all-home':
      // All children home - can do all-home tasks
      return task.careContext === 'all-home';
    default:
      return false;
  }
}

const TIME_BLOCK_ORDER: TimeBlock[] = ['morning', 'midday', 'afternoon', 'evening'];

const TIME_BLOCK_CONFIG: Record<TimeBlock, { label: string; timeRange: string }> = {
  morning: { label: 'Morning', timeRange: '6 AM – 11 AM' },
  midday: { label: 'Midday', timeRange: '11 AM – 2 PM' },
  afternoon: { label: 'Afternoon', timeRange: '2 PM – 5 PM' },
  evening: { label: 'Evening', timeRange: '5 PM – 9 PM' },
};

function getTimeBlockForTask(task: Task): TimeBlock {
  if (task.preferredTimeBlock) return task.preferredTimeBlock;
  if (task.scheduledTime) {
    const hour = parseInt(task.scheduledTime.split(':')[0], 10);
    if (hour < 11) return 'morning';
    if (hour < 14) return 'midday';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }
  // Infer from category
  switch (task.category) {
    case 'meals':
      if (task.type === 'meal') {
        if (task.mealType === 'breakfast') return 'morning';
        if (task.mealType === 'lunch') return 'midday';
        return 'evening';
      }
      return 'midday';
    case 'kids': return 'morning';
    case 'laundry': return 'morning';
    case 'focus-work': return 'midday';
    case 'kitchen': return 'afternoon';
    case 'cleaning': return 'afternoon';
    case 'tidying': return 'evening';
    case 'self-care': return 'morning';
    case 'errands': return 'midday';
    default: return 'midday';
  }
}

type ViewMode = 'priority' | 'chronological';

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

function getSkyGradient(dayProgress: number): string {
  // dayProgress: 0 = sunrise, 1 = sunset
  if (dayProgress < -0.15) {
    // Deep night
    return 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)';
  }
  if (dayProgress < -0.02) {
    // Pre-dawn twilight
    return 'linear-gradient(180deg, #1e1b4b 0%, #581c87 40%, #831843 70%, #1e1b4b 100%)';
  }
  if (dayProgress < 0.08) {
    // Sunrise / dawn
    return 'linear-gradient(180deg, #fecdd3 0%, #fed7aa 40%, #bae6fd 80%, #FAF6F1 100%)';
  }
  if (dayProgress < 0.2) {
    // Morning
    return 'linear-gradient(180deg, #7dd3fc 0%, #bae6fd 50%, #fef3c7 80%, #FAF6F1 100%)';
  }
  if (dayProgress < 0.8) {
    // Full day
    return 'linear-gradient(180deg, #38bdf8 0%, #7dd3fc 40%, #e0f2fe 75%, #FAF6F1 100%)';
  }
  if (dayProgress < 0.92) {
    // Late afternoon / pre-sunset
    return 'linear-gradient(180deg, #7dd3fc 0%, #fdba74 45%, #fecdd3 75%, #FAF6F1 100%)';
  }
  if (dayProgress < 1.02) {
    // Sunset
    return 'linear-gradient(180deg, #f97316 0%, #ec4899 35%, #7c3aed 70%, #2e1065 100%)';
  }
  if (dayProgress < 1.15) {
    // Dusk
    return 'linear-gradient(180deg, #4c1d95 0%, #1e1b4b 60%, #0f172a 100%)';
  }
  // Night
  return 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)';
}

function SkyHeader() {
  const { sunrise, sunset } = useSunTimes();
  const [now, setNow] = useState(() => new Date());

  // Update every minute so the sun moves
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const sunriseMs = sunrise.getTime();
  const sunsetMs = sunset.getTime();
  const nowMs = now.getTime();
  const dayLength = sunsetMs - sunriseMs;

  // Progress: 0 at sunrise, 1 at sunset
  const dayProgress = (nowMs - sunriseMs) / dayLength;

  const sunPosition = useMemo(() => {
    // Sun visible from just before sunrise to just after sunset
    const visible = dayProgress > -0.05 && dayProgress < 1.05;
    const clamped = Math.max(0, Math.min(1, dayProgress));

    // Horizontal: 8% to 92% of container width
    const x = 8 + clamped * 84;

    // Parabolic arc: peaks at 1 when progress = 0.5
    const arc = 4 * clamped * (1 - clamped);

    // Map arc to bottom offset in pixels
    // arc=0 → 8px from bottom (horizon), arc=1 → 88px from bottom (zenith)
    const bottomPx = 8 + arc * 80;

    // Fade in/out near horizon
    const opacity = dayProgress < 0
      ? Math.max(0, 1 + dayProgress * 20)
      : dayProgress > 1
        ? Math.max(0, 1 - (dayProgress - 1) * 20)
        : 1;

    return { visible, x, bottomPx, opacity };
  }, [dayProgress]);

  const moonPosition = useMemo(() => {
    // Moon arcs across the sky at night: sunset → sunrise
    // nightProgress: 0 at sunset, 1 at next sunrise
    const nightLength = 24 * 60 * 60 * 1000 - dayLength;
    let nightProgress: number;

    if (dayProgress > 1) {
      // After sunset tonight
      nightProgress = (nowMs - sunsetMs) / nightLength;
    } else if (dayProgress < 0) {
      // Before sunrise this morning
      nightProgress = 1 - (sunriseMs - nowMs) / nightLength;
    } else {
      nightProgress = -1; // Daytime
    }

    const visible = nightProgress > -0.05 && nightProgress < 1.05;
    const clamped = Math.max(0, Math.min(1, nightProgress));

    // Same arc math as the sun
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
      className="-mx-4 -mt-4 px-4 pt-6 pb-4 mb-4 relative overflow-hidden"
      style={{ background: skyGradient, minHeight: '148px' }}
    >
      {/* Sun traveling on its arc */}
      {sunPosition.visible && (
        <img
          src={sunPng}
          alt=""
          className="absolute w-10 h-10 pointer-events-none select-none"
          style={{
            left: `${sunPosition.x}%`,
            bottom: `${sunPosition.bottomPx}px`,
            transform: 'translateX(-50%)',
            opacity: sunPosition.opacity,
            filter: isDawnOrDusk ? 'brightness(1.3) saturate(0.7)' : 'none',
            transition: 'bottom 60s linear, left 60s linear',
          }}
        />
      )}

      {/* Moon traveling on its arc at night */}
      {moonPosition.visible && (
        <img
          src={moonPng}
          alt=""
          className="absolute w-9 h-9 pointer-events-none select-none"
          style={{
            left: `${moonPosition.x}%`,
            bottom: `${moonPosition.bottomPx}px`,
            transform: 'translateX(-50%)',
            opacity: moonPosition.opacity,
            transition: 'bottom 60s linear, left 60s linear',
          }}
        />
      )}

      {/* Stars at night */}
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

      {/* Content */}
      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p className={`text-sm ${isNight ? 'text-white/70' : 'text-bark/60'}`}>
            {format(now, 'EEEE')}
          </p>
          <h1 className={`font-display text-3xl ${isNight ? 'text-white' : 'text-bark'}`}>
            {format(now, 'MMMM d')}
          </h1>
        </div>
        <div className="flex items-start gap-3">
          <Link
            to="/timeline"
            className={`p-2 rounded-lg transition-colors ${
              isNight
                ? 'bg-white/10 hover:bg-white/20 text-white/80'
                : 'bg-bark/5 hover:bg-bark/10 text-bark/60'
            }`}
            title="View Timeline"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </Link>
          <div className={`text-right text-sm ${isNight ? 'text-white/60' : 'text-bark/50'}`}>
            <p>☀️ {format(sunrise, 'h:mm a')}</p>
            <p>🌙 {format(sunset, 'h:mm a')}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function TimeBlockBanner() {
  const { sleepingChildren } = useNapState();
  const { currentState, stateLabel, stateIcon, stateColor } = useAvailability();
  const now = new Date();
  const hours = now.getHours();

  const getTimeBlock = () => {
    if (hours < 9) return { name: 'Morning Rhythm', icon: '🌅' };
    if (hours < 12) return { name: 'Mid-Morning', icon: '☀️' };
    if (hours < 14) return { name: 'Midday', icon: '🌞' };
    if (hours < 17) return { name: 'Afternoon', icon: '🌤️' };
    if (hours < 19) return { name: 'Evening Rhythm', icon: '🌆' };
    return { name: 'Wind Down', icon: '🌙' };
  };

  const block = getTimeBlock();
  const napMessage =
    sleepingChildren.length > 0
      ? `${sleepingChildren.map((c) => c.name).join(' & ')} sleeping`
      : null;

  return (
    <div className="bg-parchment rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{block.icon}</span>
          <div>
            <p className="font-medium text-bark">{block.name}</p>
            {napMessage && (
              <p className="text-sm text-sage">{napMessage} 💤</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-display text-bark">{format(now, 'h:mm')}</p>
          <p className="text-xs text-bark/50">{format(now, 'a')}</p>
        </div>
      </div>
      {/* Availability status */}
      <div className={`mt-3 pt-3 border-t border-bark/10 flex items-center gap-2 ${stateColor}`}>
        <span>{stateIcon}</span>
        <span className="text-sm font-medium">{stateLabel}</span>
        {currentState !== 'parenting' && (
          <span className="text-xs text-bark/40 ml-auto">
            Suggesting matching tasks
          </span>
        )}
      </div>
    </div>
  );
}

function GoodEnoughProgress() {
  const { rhythmsCompleted, rhythmsTotal, completionPercentage, isGoodEnough } = useGoodEnoughDay();

  if (rhythmsTotal === 0) return null;

  return (
    <div className="bg-linen rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-bark/70">Good Enough Day</span>
        <span className="text-sm text-bark/50">
          {rhythmsCompleted}/{rhythmsTotal} rhythms
        </span>
      </div>
      <div className="h-2 bg-cream rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isGoodEnough ? 'bg-sage' : 'bg-terracotta/60'
          }`}
          style={{ width: `${completionPercentage}%` }}
        />
      </div>
      {isGoodEnough && (
        <p className="text-xs text-sage mt-2 flex items-center gap-1">
          <span>✓</span> You've done enough today
        </p>
      )}
    </div>
  );
}


function TaskCard({
  task,
  instance,
  today,
  suggested,
  onTap,
  onDefer,
}: {
  task: Task;
  instance: TaskInstance;
  today: string;
  suggested?: boolean;
  onTap: () => void;
  onDefer?: () => void;
}) {
  const updateMealPlan = useTaskStore((state) => state.updateMealPlan);
  const getChild = useChildStore((state) => state.getChild);
  const config = TIER_CONFIG[task.tier];
  const isCompleted = instance.status === 'completed';
  const isMeal = task.type === 'meal';
  const savedMeal = isMeal ? (task.plannedMeals?.[today] ?? '') : '';
  const [mealInput, setMealInput] = useState(savedMeal);
  const displayTitle = getTaskDisplayTitle(task, getChild);

  const handleMealBlur = () => {
    if (isMeal && mealInput !== savedMeal) {
      updateMealPlan(task.id, today, mealInput);
    }
  };

  return (
    <div
      onClick={onTap}
      className={`w-full text-left p-4 rounded-xl transition-all cursor-pointer ${
        isCompleted
          ? 'bg-sage/10 border border-sage/20'
          : suggested
            ? 'bg-cream border border-sage/40 shadow-sm ring-1 ring-sage/20'
            : 'bg-cream border border-bark/5 shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <span
          className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isCompleted
              ? 'border-sage bg-sage text-cream'
              : 'border-bark/20'
          }`}
        >
          {isCompleted && (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
              {config.label}
            </span>
            {suggested && !isCompleted && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-sage/15 text-sage font-medium">
                Suggested Now
              </span>
            )}
            {task.scheduledTime && (
              <span className="text-xs text-bark/40">{task.scheduledTime}</span>
            )}
          </div>
          <p className={`font-medium ${isCompleted ? 'text-bark/50 line-through' : 'text-bark'}`}>
            {displayTitle}
          </p>
          {isMeal && (
            <input
              type="text"
              placeholder={`What's for ${task.mealType}?`}
              value={mealInput}
              onChange={(e) => setMealInput(e.target.value)}
              onBlur={handleMealBlur}
              onClick={(e) => e.stopPropagation()}
              className={`mt-2 w-full text-sm px-2 py-1.5 rounded-lg border bg-parchment/50 focus:outline-none focus:border-sage transition-colors ${
                isCompleted
                  ? 'border-sage/20 text-bark/50'
                  : 'border-bark/10 text-bark'
              }`}
            />
          )}
        </div>

        {/* Defer button for tending tasks */}
        {onDefer && !isCompleted && (
          <button
            onClick={(e) => { e.stopPropagation(); onDefer(); }}
            className="ml-auto text-bark/30 hover:text-lavender text-xs flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-lavender/10 transition-colors flex-shrink-0"
            title="Put back in seed tray"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span>Tray</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function Today() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [editingTier, setEditingTier] = useState<TaskTier | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('priority');
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
  const { napState } = useNapState();
  const getCurrentCareContext = useChildStore((state) => state.getCurrentCareContext);
  const careContext = getCurrentCareContext();
  const { isTaskSuggested } = useAvailability();

  // Generate today's instances on mount
  useEffect(() => {
    generateDailyInstances(new Date());
  }, [generateDailyInstances]);

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
    // Filter out informational tasks (like bedtime) and pickup/dropoff tasks
    .filter((item) => !item.task.isInformational && item.task.childTaskType !== 'pickup' && item.task.childTaskType !== 'dropoff');

  // Group by tier
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

  const handleTaskTap = useCallback((instance: TaskInstance) => {
    if (instance.status === 'completed') {
      // Unchecking: cancel timers and reset
      const existing = timersRef.current.get(instance.id);
      if (existing) {
        existing.forEach(clearTimeout);
        timersRef.current.delete(instance.id);
      }
      setFadingOut((prev) => {
        const next = new Set(prev);
        next.delete(instance.id);
        return next;
      });
      setRecentlyCompleted((prev) => {
        const next = new Set(prev);
        next.delete(instance.id);
        return next;
      });
      resetTaskInstance(instance.id);
    } else {
      // Completing: keep visible for 2.7s, then fade out over 300ms
      completeTask(instance.id);
      setRecentlyCompleted((prev) => new Set(prev).add(instance.id));

      const fadeTimer = setTimeout(() => {
        setFadingOut((prev) => new Set(prev).add(instance.id));
      }, 2700);

      const removeTimer = setTimeout(() => {
        setRecentlyCompleted((prev) => {
          const next = new Set(prev);
          next.delete(instance.id);
          return next;
        });
        setFadingOut((prev) => {
          const next = new Set(prev);
          next.delete(instance.id);
          return next;
        });
        timersRef.current.delete(instance.id);
      }, 3000);

      timersRef.current.set(instance.id, [fadeTimer, removeTimer]);
    }
  }, [completeTask, resetTaskInstance]);

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
        <SkyHeader />
        <TimeBlockBanner />
        <GoodEnoughProgress />

        <div className="mb-4 space-y-3">
          <NapControls />
          <AwayControls />
        </div>

        {groupedByTier.length === 0 ? (
          <div className="text-center py-12 bg-cream rounded-xl">
            <p className="text-bark/60">No tasks for today.</p>
            <p className="text-bark/40 text-sm mt-2">Add some tasks to get started.</p>
          </div>
        ) : (
          <>
            {/* View mode toggle */}
            <div className="flex items-center gap-1 mb-4 bg-parchment rounded-lg p-1">
              <button
                onClick={() => setViewMode('priority')}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                  viewMode === 'priority' ? 'bg-cream text-bark shadow-sm' : 'text-bark/50'
                }`}
              >
                By Priority
              </button>
              <button
                onClick={() => setViewMode('chronological')}
                className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                  viewMode === 'chronological' ? 'bg-cream text-bark shadow-sm' : 'text-bark/50'
                }`}
              >
                By Time
              </button>
            </div>

            {viewMode === 'priority' ? (
              <div className="space-y-4">
                {groupedByTier.map((group) => {
                  const visibleItems = group.items
                    .filter(
                      (item) => item.instance.status !== 'completed' || recentlyCompleted.has(item.instance.id)
                    )
                    .sort((a, b) => {
                      // Primary: use new availability-based suggestion (includes legacy fallback)
                      const aSuggested = isTaskSuggested(a.task) && a.instance.status !== 'completed';
                      const bSuggested = isTaskSuggested(b.task) && b.instance.status !== 'completed';
                      // Secondary: check legacy systems for backwards compatibility
                      const aSuggestedNap = isTaskSuggestedForNapState(a.task, napState) && a.instance.status !== 'completed';
                      const bSuggestedNap = isTaskSuggestedForNapState(b.task, napState) && b.instance.status !== 'completed';
                      const aSuggestedCare = isTaskSuggestedForCareContext(a.task, careContext) && a.instance.status !== 'completed';
                      const bSuggestedCare = isTaskSuggestedForCareContext(b.task, careContext) && b.instance.status !== 'completed';
                      const aAnySuggested = aSuggested || aSuggestedNap || aSuggestedCare;
                      const bAnySuggested = bSuggested || bSuggestedNap || bSuggestedCare;
                      if (aAnySuggested && !bAnySuggested) return -1;
                      if (!aAnySuggested && bAnySuggested) return 1;
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
                            <div
                              key={instance.id}
                              className={`transition-all duration-300 ease-in-out ${
                                isFading ? 'opacity-0 max-h-0 overflow-hidden -my-1' : 'opacity-100 max-h-40'
                              }`}
                            >
                              <TaskCard
                                task={task}
                                instance={instance}
                                today={today}
                                suggested={suggested}
                                onTap={() => handleTaskTap(instance)}
                                onDefer={task.tier === 'tending' && instance.status !== 'completed' ? () => deferTask(instance.id, null) : undefined}
                              />
                            </div>
                          );
                        })}
                        {doneItems.length > 0 && (
                          <div>
                            <button
                              onClick={() => toggleDoneSection(group.tier)}
                              className="flex items-center gap-2 text-xs text-bark/40 hover:text-bark/60 py-1 transition-colors"
                            >
                              <svg
                                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                              <span>{doneItems.length} done</span>
                            </button>
                            {isExpanded && (
                              <div className="space-y-2 mt-2">
                                {doneItems.map(({ task, instance }) => (
                                  <TaskCard
                                    key={instance.id}
                                    task={task}
                                    instance={instance}
                                    today={today}
                                    onTap={() => handleTaskTap(instance)}
                                  />
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
            ) : (
              <div className="space-y-4">
                {TIME_BLOCK_ORDER.map((block) => {
                  const blockConfig = TIME_BLOCK_CONFIG[block];
                  const blockItems = tasksWithInstances
                    .filter((item) => getTimeBlockForTask(item.task) === block)
                    .filter(
                      (item) => item.instance.status !== 'completed' || recentlyCompleted.has(item.instance.id)
                    )
                    .sort((a, b) => {
                      // Anchors first (by scheduledTime), then suggested, then rest
                      if (a.task.scheduledTime && !b.task.scheduledTime) return -1;
                      if (!a.task.scheduledTime && b.task.scheduledTime) return 1;
                      if (a.task.scheduledTime && b.task.scheduledTime) {
                        return a.task.scheduledTime.localeCompare(b.task.scheduledTime);
                      }
                      // Primary: use new availability-based suggestion
                      const aSuggested = isTaskSuggested(a.task) && a.instance.status !== 'completed';
                      const bSuggested = isTaskSuggested(b.task) && b.instance.status !== 'completed';
                      // Secondary: check legacy for backwards compatibility
                      const aSuggestedNap = isTaskSuggestedForNapState(a.task, napState) && a.instance.status !== 'completed';
                      const bSuggestedNap = isTaskSuggestedForNapState(b.task, napState) && b.instance.status !== 'completed';
                      const aSuggestedCare = isTaskSuggestedForCareContext(a.task, careContext) && a.instance.status !== 'completed';
                      const bSuggestedCare = isTaskSuggestedForCareContext(b.task, careContext) && b.instance.status !== 'completed';
                      const aAnySuggested = aSuggested || aSuggestedNap || aSuggestedCare;
                      const bAnySuggested = bSuggested || bSuggestedNap || bSuggestedCare;
                      if (aAnySuggested && !bAnySuggested) return -1;
                      if (!aAnySuggested && bAnySuggested) return 1;
                      return 0;
                    });
                  const doneItems = tasksWithInstances
                    .filter((item) => getTimeBlockForTask(item.task) === block)
                    .filter(
                      (item) => item.instance.status === 'completed' && !recentlyCompleted.has(item.instance.id)
                    );
                  const isExpanded = expandedDoneSections.has(block);

                  if (blockItems.length === 0 && doneItems.length === 0) return null;

                  return (
                    <section key={block}>
                      <div className="mb-2">
                        <h2 className="font-body font-semibold text-sm text-bark">
                          {blockConfig.label}
                        </h2>
                        <p className="text-xs text-bark/40">{blockConfig.timeRange}</p>
                      </div>
                      <div className="space-y-2">
                        {blockItems.map(({ task, instance }) => {
                          const isFading = fadingOut.has(instance.id);
                          const suggestedAvailability = isTaskSuggested(task) && instance.status !== 'completed';
                          const suggestedNap = isTaskSuggestedForNapState(task, napState) && instance.status !== 'completed';
                          const suggestedCare = isTaskSuggestedForCareContext(task, careContext) && instance.status !== 'completed';
                          const suggested = suggestedAvailability || suggestedNap || suggestedCare;
                          return (
                            <div
                              key={instance.id}
                              className={`transition-all duration-300 ease-in-out ${
                                isFading ? 'opacity-0 max-h-0 overflow-hidden -my-1' : 'opacity-100 max-h-40'
                              }`}
                            >
                              <TaskCard
                                task={task}
                                instance={instance}
                                today={today}
                                suggested={suggested}
                                onTap={() => handleTaskTap(instance)}
                                onDefer={task.tier === 'tending' && instance.status !== 'completed' ? () => deferTask(instance.id, null) : undefined}
                              />
                            </div>
                          );
                        })}
                        {doneItems.length > 0 && (
                          <div>
                            <button
                              onClick={() => toggleDoneSection(block)}
                              className="flex items-center gap-2 text-xs text-bark/40 hover:text-bark/60 py-1 transition-colors"
                            >
                              <svg
                                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </svg>
                              <span>{doneItems.length} done</span>
                            </button>
                            {isExpanded && (
                              <div className="space-y-2 mt-2">
                                {doneItems.map(({ task, instance }) => (
                                  <TaskCard
                                    key={instance.id}
                                    task={task}
                                    instance={instance}
                                    today={today}
                                    onTap={() => handleTaskTap(instance)}
                                  />
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
            )}
          </>
        )}

        {/* Bottom padding for mobile */}
        <div className="h-20" />
      </div>

      <GoodEnoughModal />

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

      {/* Quick Add Modal */}
      <QuickAddSeed isOpen={showQuickAdd} onClose={() => setShowQuickAdd(false)} />

      {/* Task Editor Modal */}
      {editingTier && (
        <TaskEditor tier={editingTier} isOpen={true} onClose={() => { setEditingTier(null); generateDailyInstances(new Date()); }} />
      )}
    </div>
  );
}
