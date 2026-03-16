import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useTaskStore } from '../stores/useTaskStore';
import { useChildStore } from '../stores/useChildStore';
import { useNapState } from '../hooks/useNapState';
import { useAvailability } from '../hooks/useAvailability';
import { ChildStatusBar } from '../components/care/ChildStatusBar';
import { TransitionPrompts } from '../components/care/TransitionPrompts';
import { useTransitionCheck } from '../hooks/useTransitionCheck';
import { useEventStore } from '../stores/useEventStore';
import { useNapPrediction } from '../hooks/useNapPrediction';
import { BloomModal } from '../components/common/BloomModal';
import { QuickAddSeed } from '../components/tasks/QuickAddSeed';
import { TaskEditor } from '../components/tasks/TaskEditor';
import { DayOverviewCompact } from '../components/today/DayTimeline';
import { YourWindow } from '../components/today/YourWindow';
import { ComingUp } from '../components/today/ComingUp';
import { TaskCard } from '../components/today/TaskCard';
import { TaskDetailSheet } from '../components/today/TaskDetailSheet';
import { GardenPreview } from '../components/today/GardenPreview';
import { RoutineBlock } from '../components/today/RoutineBlock';
import { HabitBlockCard } from '../components/today/HabitBlockCard';
import { UpNextBlocks } from '../components/today/UpNextBlocks';
import { ChoreQueueBanner } from '../components/today/ChoreQueueBanner';
import { useActiveBlock } from '../hooks/useActiveBlock';
import { useAutoComplete } from '../hooks/useAutoComplete';
import { useChallengeProgress } from '../hooks/useChallengeProgress';
import { useChallengeStore, CHALLENGE_TEMPLATES } from '../stores/useChallengeStore';
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

const TIER_ORDER: TaskTier[] = ['fixed-schedule', 'routine', 'todo'];
const TIER_CONFIG: Record<TaskTier, { label: string; subtitle: string; color: string; bg: string }> = {
  'fixed-schedule': { label: 'Fixed Schedule', subtitle: 'Things with set times', color: 'text-terracotta', bg: 'bg-terracotta/10' },
  'routine': { label: 'Routine', subtitle: 'Daily habits that don\'t need a clock', color: 'text-sage', bg: 'bg-sage/10' },
  'todo': { label: 'To-do', subtitle: 'Worth doing when you can', color: 'text-lavender', bg: 'bg-lavender/10' },
};

// ────────────────────────────────────────────────
//  All Tasks view (accessed via "See all tasks")
// ────────────────────────────────────────────────

function AllTasksView({
  tasksWithInstances,
  onTaskTap,
  onDefer,
  onEdit,
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
  onEdit: (task: Task) => void;
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
                      onEdit={() => onEdit(task)}
                      onDefer={task.tier === 'todo' && instance.status !== 'completed' ? () => onDefer(instance.id) : undefined}
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
                        <TaskCard key={instance.id} task={task} instance={instance} today={today} onTap={() => onTaskTap(instance)} onEdit={() => onEdit(task)} />
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
//  Suggested tasks shown alongside active block
// ────────────────────────────────────────────────

function SuggestedDuringBlock({
  activeBlock,
  tasksWithInstances,
  onTaskTap,
  onEdit,
  onDefer,
  recentlyCompleted,
  fadingOut,
  today,
}: {
  activeBlock: { items: { taskId: string }[] };
  tasksWithInstances: TaskWithInstance[];
  onTaskTap: (instance: TaskInstance) => void;
  onEdit: (task: Task) => void;
  onDefer: (instanceId: string) => void;
  recentlyCompleted: Set<string>;
  fadingOut: Set<string>;
  today: string;
}) {
  const { isTaskSuggested } = useAvailability();

  const blockTaskIds = useMemo(
    () => new Set(activeBlock.items.map((item) => item.taskId)),
    [activeBlock.items]
  );

  const suggestedItems = useMemo(() => {
    return tasksWithInstances.filter(({ task, instance }) => {
      if (blockTaskIds.has(task.id)) return false;
      if (instance.status === 'completed' && !recentlyCompleted.has(instance.id)) return false;
      return isTaskSuggested(task);
    });
  }, [tasksWithInstances, blockTaskIds, isTaskSuggested, recentlyCompleted]);

  if (suggestedItems.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="text-xs font-medium text-bark/50 uppercase tracking-wide mb-2">
        Also suggested right now
      </h3>
      <div className="space-y-2">
        {suggestedItems.map(({ task, instance }) => {
          const isFading = fadingOut.has(instance.id);
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
                suggested={true}
                onTap={() => onTaskTap(instance)}
                onEdit={() => onEdit(task)}
                onDefer={task.tier === 'todo' && instance.status !== 'completed' ? () => onDefer(instance.id) : undefined}
              />
            </div>
          );
        })}
      </div>
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
  const [editingTask, setEditingTask] = useState<Task | null>(null);
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
  const { justBloomedId, bloomToast, bloomedTemplateId, dismissBloom } = useChallengeProgress();
  const activeChallenges = useChallengeStore(s => s.activeChallenges);
  const navigate = useNavigate();

  // Check for transitions on mount + every 5 min
  useTransitionCheck();

  // Auto-complete past fixed-schedule tasks
  useAutoComplete();

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

  // Build grouped blocks from all active challenges that have seeded tasks
  const routineChallenges = useMemo(() => {
    return activeChallenges
      .filter(c => c.status === 'growing' && (c.seededTaskIds?.length ?? 0) > 0)
      .map(c => {
        const template = CHALLENGE_TEMPLATES.find(t => t.id === c.templateId);
        if (!template) return null;
        const items = (c.seededTaskIds ?? [])
          .map(taskId => tasksWithInstances.find(t => t.task.id === taskId))
          .filter((x): x is { task: Task; instance: TaskInstance } => !!x);
        return { challenge: c, items };
      })
      .filter((x): x is { challenge: typeof activeChallenges[0]; items: { task: Task; instance: TaskInstance }[] } => x !== null && x.items.length > 0);
  }, [activeChallenges, tasksWithInstances]);

  // Task IDs that belong to a routine block (excluded from the main list)
  const routineTaskIds = useMemo(() =>
    new Set(routineChallenges.flatMap(r => r.items.map(i => i.task.id))),
    [routineChallenges]
  );

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
      {/* Child status bar — fixed above BottomNav (Phase 1) */}
      <ChildStatusBar napPredictions={Object.fromEntries(
        Object.entries(napPredictions).map(([id, p]) => [id, {
          nextNapTime: p.nextNapTime ?? undefined,
          probableWakeTime: p.probableWakeTime ?? undefined,
          wakeWindowWarning: p.wakeWindowWarning ?? undefined,
        }])
      )} />

      <div className="max-w-lg mx-auto px-4 pt-4 pb-14">
        {/* Unified sky + garden tableau */}
        <div className="-mx-4 -mt-4">
          <GardenPreview justBloomedId={justBloomedId} />
        </div>

        {/* Transition prompts (Phase 2) */}
        <TransitionPrompts napContext={Object.fromEntries(
          Object.entries(napPredictions).map(([id, p]) => [id, { wakeWindowText: p.wakeWindowText ?? undefined }])
        )} />

        {/* Day overview — compact (current + 2 upcoming) */}
        <DayOverviewCompact />

        {/* Routine blocks — always shown when a daily-routine challenge is active */}
        {routineChallenges.map(({ challenge, items }) => (
          <RoutineBlock
            key={challenge.id}
            challenge={challenge}
            items={items}
            today={today}
            onTaskTap={handleTaskTap}
            onEdit={setEditingTask}
            fadingOut={fadingOut}
          />
        ))}

        {tasksWithInstances.filter(t => !routineTaskIds.has(t.task.id)).length === 0 && routineChallenges.length === 0 ? (
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
              tasksWithInstances={tasksWithInstances.filter(t => !routineTaskIds.has(t.task.id))}
              onTaskTap={handleTaskTap}
              onDefer={handleDefer}
              onEdit={setEditingTask}
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
              <>
              <HabitBlockCard
                block={activeBlock}
                onTaskTap={handleTaskTap}
                onEdit={setEditingTask}
                fadingOut={fadingOut}
                recentlyCompleted={recentlyCompleted}
              />
              <SuggestedDuringBlock
                activeBlock={activeBlock}
                tasksWithInstances={tasksWithInstances}
                onTaskTap={handleTaskTap}
                onEdit={setEditingTask}
                onDefer={handleDefer}
                recentlyCompleted={recentlyCompleted}
                fadingOut={fadingOut}
                today={today}
              />
              </>
            ) : (
              <>
                {/* Chore queue banner — shows between blocks if chore not yet done */}
                <ChoreQueueBanner />

                {/* Your Window — primary focus (Phase 5) */}
                <YourWindow
                  availabilityLabel={stateLabel}
                  availabilityDescription={stateDescription}
                  tasksWithInstances={tasksWithInstances.filter(t => !routineTaskIds.has(t.task.id))}
                  onTaskTap={handleTaskTap}
                  onDefer={handleDefer}
                  onEdit={setEditingTask}
                  recentlyCompleted={recentlyCompleted}
                  fadingOut={fadingOut}
                />

              </>
            )}

            {/* Preview of next 1-2 upcoming blocks */}
            <UpNextBlocks />

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

      {/* Bloom modal */}
      {bloomToast && bloomedTemplateId && (
        <BloomModal
          challengeTitle={bloomToast}
          templateId={bloomedTemplateId}
          onDismiss={dismissBloom}
          onViewGarden={() => {
            dismissBloom();
            navigate('/garden');
          }}
        />
      )}

      {/* Floating Add Button */}
      <div className="fixed bottom-28 left-0 right-0 flex justify-center z-40 pointer-events-none">
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

      <TaskDetailSheet task={editingTask} onClose={() => setEditingTask(null)} />
    </div>
  );
}
