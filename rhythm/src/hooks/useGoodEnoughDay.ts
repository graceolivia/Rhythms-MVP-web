import { useMemo } from 'react';
import { format } from 'date-fns';
import { useTaskStore } from '../stores/useTaskStore';
import type { Task } from '../types';

interface GoodEnoughResult {
  isGoodEnough: boolean;
  rhythmsCompleted: number;
  rhythmsTotal: number;
  missingRhythms: Task[];
  completionPercentage: number;
}

export function useGoodEnoughDay(): GoodEnoughResult {
  const tasks = useTaskStore((state) => state.tasks);
  const taskInstances = useTaskStore((state) => state.taskInstances);

  return useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');

    // Get today's instances
    const todaysInstances = taskInstances.filter(
      (instance) => instance.date === today
    );

    // Find rhythm tasks that have instances today
    const rhythmInstances = todaysInstances.filter((instance) => {
      const task = tasks.find((t) => t.id === instance.taskId);
      return task?.tier === 'rhythm';
    });

    // Count completed rhythms
    const completedRhythms = rhythmInstances.filter(
      (instance) => instance.status === 'completed'
    );

    // Find missing (incomplete) rhythm tasks
    const missingRhythms = rhythmInstances
      .filter((instance) => instance.status !== 'completed')
      .map((instance) => tasks.find((t) => t.id === instance.taskId))
      .filter((task): task is Task => task !== undefined);

    const rhythmsTotal = rhythmInstances.length;
    const rhythmsCompleted = completedRhythms.length;
    const isGoodEnough = rhythmsTotal > 0 && rhythmsCompleted === rhythmsTotal;
    const completionPercentage =
      rhythmsTotal > 0 ? Math.round((rhythmsCompleted / rhythmsTotal) * 100) : 0;

    return {
      isGoodEnough,
      rhythmsCompleted,
      rhythmsTotal,
      missingRhythms,
      completionPercentage,
    };
  }, [tasks, taskInstances]);
}
