import { useCallback, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useTaskStore } from '../stores/useTaskStore';
import { useGardenStore } from '../stores/useGardenStore';
import { useGoodEnoughDay } from '../hooks/useGoodEnoughDay';
import { useNapState } from '../hooks/useNapState';
import { useSunTimes } from '../hooks/useSunTimes';
import { NapControls } from '../components/naps/NapControls';
import { GoodEnoughModal } from '../components/common/GoodEnoughModal';
import { QuickAddSeed } from '../components/tasks/QuickAddSeed';
import { TaskEditor } from '../components/tasks/TaskEditor';
import type { Task, TaskInstance, TaskTier, NapContext } from '../types';

/**
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

function SkyHeader() {
  const { sunrise, sunset } = useSunTimes();
  const now = new Date();
  const hours = now.getHours();

  // Determine time of day for gradient
  const getGradient = () => {
    if (hours >= 5 && hours < 8) return 'from-rose-200 via-amber-100 to-sky-200'; // sunrise
    if (hours >= 8 && hours < 17) return 'from-sky-300 via-sky-200 to-cream'; // day
    if (hours >= 17 && hours < 20) return 'from-amber-200 via-rose-200 to-purple-200'; // sunset
    return 'from-indigo-900 via-purple-900 to-slate-900'; // night
  };

  const isNight = hours < 5 || hours >= 20;

  return (
    <header className={`bg-gradient-to-b ${getGradient()} -mx-4 -mt-4 px-4 pt-6 pb-8 mb-4`}>
      <div className="flex justify-between items-start">
        <div>
          <p className={`text-sm ${isNight ? 'text-white/70' : 'text-bark/60'}`}>
            {format(now, 'EEEE')}
          </p>
          <h1 className={`font-display text-3xl ${isNight ? 'text-white' : 'text-bark'}`}>
            {format(now, 'MMMM d')}
          </h1>
        </div>
        <div className={`text-right text-sm ${isNight ? 'text-white/60' : 'text-bark/50'}`}>
          <p>☀️ {format(sunrise, 'h:mm a')}</p>
          <p>🌙 {format(sunset, 'h:mm a')}</p>
        </div>
      </div>
    </header>
  );
}

function TimeBlockBanner() {
  const { sleepingChildren } = useNapState();
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
    <div className="bg-parchment rounded-xl p-4 mb-4 flex items-center justify-between">
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

function GardenPreview() {
  const flowers = useGardenStore((state) => state.flowers);
  const hasEarnedFlowerToday = useGardenStore((state) => state.hasEarnedFlowerToday);

  const recentFlowers = flowers.slice(-7);
  const todayEarned = hasEarnedFlowerToday('daily-daisy');

  return (
    <div className="bg-spring-light/30 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-bark/70">Your Garden</span>
        <span className="text-sm text-bark/50">{flowers.length} flowers</span>
      </div>
      <div className="flex items-center gap-1">
        {recentFlowers.length === 0 && !todayEarned && (
          <span className="text-bark/40 text-sm">Complete rhythms to grow flowers</span>
        )}
        {recentFlowers.map((flower) => (
          <span key={flower.id} className="text-xl">
            {flower.type === 'daily-daisy' && '🌼'}
            {flower.type === 'rhythm-rose' && '🌹'}
            {flower.type === 'golden-hour-lily' && '🌷'}
            {flower.type === 'self-care-sunflower' && '🌻'}
            {flower.type === 'challenge-bloom' && '🌺'}
          </span>
        ))}
        {!todayEarned && (
          <span className="text-xl opacity-30">🌼</span>
        )}
      </div>
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
  const config = TIER_CONFIG[task.tier];
  const isCompleted = instance.status === 'completed';
  const isMeal = task.type === 'meal';
  const savedMeal = isMeal ? (task.plannedMeals?.[today] ?? '') : '';
  const [mealInput, setMealInput] = useState(savedMeal);

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
            {task.title}
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
  const [recentlyCompleted, setRecentlyCompleted] = useState<Set<string>>(new Set());
  const [fadingOut, setFadingOut] = useState<Set<string>>(new Set());
  const [expandedDoneTiers, setExpandedDoneTiers] = useState<Set<TaskTier>>(new Set());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>[]>>(new Map());

  const tasks = useTaskStore((state) => state.tasks);
  const taskInstances = useTaskStore((state) => state.taskInstances);
  const generateDailyInstances = useTaskStore((state) => state.generateDailyInstances);
  const completeTask = useTaskStore((state) => state.completeTask);
  const deferTask = useTaskStore((state) => state.deferTask);
  const resetTaskInstance = useTaskStore((state) => state.resetTaskInstance);
  const { napState } = useNapState();

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
    .filter((item): item is TaskWithInstance => item !== null);

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

  const toggleDoneTier = (tier: TaskTier) => {
    setExpandedDoneTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-parchment/30">
      <div className="max-w-lg mx-auto p-4">
        <SkyHeader />
        <TimeBlockBanner />
        <GoodEnoughProgress />

        <div className="mb-4">
          <NapControls />
        </div>

        <GardenPreview />

        {groupedByTier.length === 0 ? (
          <div className="text-center py-12 bg-cream rounded-xl">
            <p className="text-bark/60">No tasks for today.</p>
            <p className="text-bark/40 text-sm mt-2">Add some tasks to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groupedByTier.map((group) => {
              const visibleItems = group.items
                .filter(
                  (item) => item.instance.status !== 'completed' || recentlyCompleted.has(item.instance.id)
                )
                .sort((a, b) => {
                  const aSuggested = isTaskSuggestedForNapState(a.task, napState) && a.instance.status !== 'completed';
                  const bSuggested = isTaskSuggestedForNapState(b.task, napState) && b.instance.status !== 'completed';
                  if (aSuggested && !bSuggested) return -1;
                  if (!aSuggested && bSuggested) return 1;
                  return 0;
                });
              const doneItems = group.items.filter(
                (item) => item.instance.status === 'completed' && !recentlyCompleted.has(item.instance.id)
              );
              const isExpanded = expandedDoneTiers.has(group.tier);

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
                      const suggested = isTaskSuggestedForNapState(task, napState) && instance.status !== 'completed';
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
                          onClick={() => toggleDoneTier(group.tier)}
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
