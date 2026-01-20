import { useEffect } from 'react';
import { format } from 'date-fns';
import { useTaskStore } from '../stores/useTaskStore';
import type { Task, TaskInstance, TaskTier } from '../types';

interface TaskWithInstance {
  task: Task;
  instance: TaskInstance;
}

const TIER_ORDER: TaskTier[] = ['anchor', 'rhythm', 'tending'];

const TIER_LABELS: Record<TaskTier, string> = {
  anchor: 'Anchors',
  rhythm: 'Rhythms',
  tending: 'Tending',
};

export function Today() {
  const today = format(new Date(), 'yyyy-MM-dd');

  const tasks = useTaskStore((state) => state.tasks);
  const taskInstances = useTaskStore((state) => state.taskInstances);
  const generateDailyInstances = useTaskStore((state) => state.generateDailyInstances);
  const completeTask = useTaskStore((state) => state.completeTask);
  const resetTaskInstance = useTaskStore((state) => state.resetTaskInstance);

  // Generate today's instances on mount
  useEffect(() => {
    generateDailyInstances(new Date());
  }, [generateDailyInstances]);

  // Get today's instances with their task templates
  const todaysInstances = taskInstances.filter((instance) => instance.date === today);

  const tasksWithInstances: TaskWithInstance[] = todaysInstances
    .map((instance) => {
      const task = tasks.find((t) => t.id === instance.taskId);
      return task ? { task, instance } : null;
    })
    .filter((item): item is TaskWithInstance => item !== null);

  // Group by tier
  const groupedByTier = TIER_ORDER.map((tier) => ({
    tier,
    label: TIER_LABELS[tier],
    items: tasksWithInstances.filter((item) => item.task.tier === tier),
  })).filter((group) => group.items.length > 0);

  const handleTaskTap = (instance: TaskInstance) => {
    if (instance.status === 'completed') {
      resetTaskInstance(instance.id);
    } else {
      completeTask(instance.id);
    }
  };

  return (
    <div className="min-h-screen bg-cream p-4">
      <header className="mb-6">
        <h1 className="font-display text-2xl text-bark">Today</h1>
        <p className="text-bark/60 text-sm">
          {format(new Date(), 'EEEE, MMMM d')}
        </p>
      </header>

      {groupedByTier.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-bark/60">No tasks for today.</p>
          <p className="text-bark/40 text-sm mt-2">
            Add some tasks to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByTier.map((group) => (
            <section key={group.tier}>
              <h2 className="font-body font-semibold text-bark/80 text-sm uppercase tracking-wide mb-2">
                {group.label}
              </h2>
              <ul className="space-y-2">
                {group.items.map(({ task, instance }) => (
                  <li key={instance.id}>
                    <button
                      onClick={() => handleTaskTap(instance)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        instance.status === 'completed'
                          ? 'bg-sage/20 text-bark/50'
                          : 'bg-parchment text-bark'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            instance.status === 'completed'
                              ? 'border-sage bg-sage text-cream'
                              : 'border-bark/30'
                          }`}
                        >
                          {instance.status === 'completed' && (
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </span>
                        <span
                          className={
                            instance.status === 'completed' ? 'line-through' : ''
                          }
                        >
                          {task.title}
                        </span>
                        {task.scheduledTime && (
                          <span className="ml-auto text-sm text-bark/40">
                            {task.scheduledTime}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
