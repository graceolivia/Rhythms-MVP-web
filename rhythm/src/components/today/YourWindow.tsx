import { useMemo } from 'react';
import { format } from 'date-fns';
import { useAvailability } from '../../hooks/useAvailability';
import { useGoodEnoughDay } from '../../hooks/useGoodEnoughDay';
import { TaskCard } from './TaskCard';
import type { Task, TaskInstance } from '../../types';

interface TaskWithInstance {
  task: Task;
  instance: TaskInstance;
}

// Priority order for categories in YourWindow
const CATEGORY_PRIORITY: Record<string, number> = {
  'self-care': 0,
  'focus-work': 1,
  'errands': 2,
  'kitchen': 3,
  'cleaning': 4,
  'laundry': 5,
  'tidying': 6,
  'kids': 7,
  'meals': 8,
  'other': 9,
};

interface YourWindowProps {
  availabilityLabel: string;
  availabilityDescription: string;
  tasksWithInstances: TaskWithInstance[];
  onTaskTap: (instance: TaskInstance) => void;
  onDefer: (instanceId: string) => void;
  recentlyCompleted: Set<string>;
  fadingOut: Set<string>;
}

export function YourWindow({
  availabilityLabel,
  availabilityDescription,
  tasksWithInstances,
  onTaskTap,
  onDefer,
  recentlyCompleted,
  fadingOut,
}: YourWindowProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { isTaskSuggested } = useAvailability();
  const { rhythmsCompleted, rhythmsTotal, completionPercentage, isGoodEnough } = useGoodEnoughDay();

  // Split into suggested (matching current availability) and other
  const { suggestedItems, otherItems } = useMemo(() => {
    const suggested: TaskWithInstance[] = [];
    const other: TaskWithInstance[] = [];

    for (const item of tasksWithInstances) {
      if (item.instance.status === 'completed' && !recentlyCompleted.has(item.instance.id)) continue;
      if (isTaskSuggested(item.task) && item.instance.status !== 'completed') {
        suggested.push(item);
      } else if (item.instance.status !== 'completed' || recentlyCompleted.has(item.instance.id)) {
        other.push(item);
      }
    }

    // Sort suggested by category priority (self-care first, then focus-work, etc.)
    suggested.sort((a, b) => {
      const aPriority = CATEGORY_PRIORITY[a.task.category] ?? 9;
      const bPriority = CATEGORY_PRIORITY[b.task.category] ?? 9;
      return aPriority - bPriority;
    });

    return { suggestedItems: suggested, otherItems: other };
  }, [tasksWithInstances, isTaskSuggested, recentlyCompleted]);

  return (
    <div className="mb-4">
      {/* Current window header */}
      <div className="bg-cream/80 rounded-xl p-4 mb-3 border border-bark/5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-base text-bark">Your Window</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-sage/15 text-sage font-medium">
            {availabilityLabel}
          </span>
        </div>
        <p className="text-xs text-bark/50">{availabilityDescription}</p>

        {/* Progress bar */}
        {rhythmsTotal > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-bark/50">Good Enough Day</span>
              <span className="text-xs text-bark/40">
                {rhythmsCompleted}/{rhythmsTotal}
              </span>
            </div>
            <div className="h-1.5 bg-parchment rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isGoodEnough ? 'bg-sage' : 'bg-terracotta/60'
                }`}
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            {isGoodEnough && (
              <p className="text-xs text-sage mt-1 flex items-center gap-1">
                <span>✓</span> You've done enough today
              </p>
            )}
          </div>
        )}
      </div>

      {/* Suggested tasks for current window */}
      {suggestedItems.length > 0 && (
        <div className="space-y-2 mb-3">
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
                  onDefer={task.tier === 'tending' && instance.status !== 'completed' ? () => onDefer(instance.id) : undefined}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Other pending tasks */}
      {otherItems.length > 0 && (
        <div className="space-y-2">
          {otherItems.map(({ task, instance }) => {
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
                  onTap={() => onTaskTap(instance)}
                  onDefer={task.tier === 'tending' && instance.status !== 'completed' ? () => onDefer(instance.id) : undefined}
                />
              </div>
            );
          })}
        </div>
      )}

      {suggestedItems.length === 0 && otherItems.length === 0 && (
        <div className="text-center py-6 bg-cream/50 rounded-xl">
          <p className="text-bark/40 text-sm">Nothing to do right now.</p>
        </div>
      )}
    </div>
  );
}
