import { useEffect } from 'react';
import { format } from 'date-fns';
import { useTaskStore } from '../stores/useTaskStore';

/**
 * Auto-completes past fixed-schedule tasks that the user didn't explicitly check off.
 * Also auto-completes morning routines after noon — if it didn't happen by midday it's not happening.
 * Runs on mount and every minute. Excludes informational tasks and child bedtime/wake-up tasks
 * (those are meaningful confirmations that should stay pending).
 */
export function useAutoComplete() {
  const tasks = useTaskStore((state) => state.tasks);
  const taskInstances = useTaskStore((state) => state.taskInstances);
  const completeTask = useTaskStore((state) => state.completeTask);

  useEffect(() => {
    const run = () => {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const todaysInstances = taskInstances.filter(
        (instance) => instance.date === today && instance.status === 'pending'
      );

      for (const instance of todaysInstances) {
        const task = tasks.find((t) => t.id === instance.taskId);
        if (!task) continue;
        if (task.isInformational) continue;
        if (task.childTaskType === 'bedtime' || task.childTaskType === 'wake-up') continue;

        // Auto-complete past fixed-schedule tasks
        if (task.tier === 'fixed-schedule' && task.scheduledTime) {
          const [h, m] = task.scheduledTime.split(':').map(Number);
          const taskMinutes = h * 60 + m;
          if (taskMinutes < currentMinutes) {
            completeTask(instance.id);
          }
          continue;
        }

        // Auto-complete morning routines after noon — they're either done or irrelevant by then
        if (task.tier === 'routine' && task.routineGroup === 'morning' && currentMinutes >= 12 * 60) {
          completeTask(instance.id);
        }
      }
    };

    run();
    const interval = setInterval(run, 60000);
    return () => clearInterval(interval);
  }, [tasks, taskInstances, completeTask]);
}
