import { useMemo } from 'react';
import { format } from 'date-fns';
import { useTaskStore } from '../stores/useTaskStore';
import { useGardenStore } from '../stores/useGardenStore';
import type { Task } from '../types';

export type DailyFlowerStage = 0 | 1 | 2 | 3;

/**
 * Tracks today's meal completions (breakfast, lunch, dinner) and maps to
 * a 4-stage daily flower growth:
 *
 *   0 meals → stage 0 (seed)     → 049.png
 *   1 meal  → stage 1 (sprout)   → 039.png
 *   2 meals → stage 2 (budding)  → 042.png
 *   3 meals → stage 3 (bloom)    → 042.png  (full bloom — earnable for garden)
 */

/** Detect which meal a task represents, if any */
function detectMealType(task: Task): 'breakfast' | 'lunch' | 'dinner' | null {
  // Explicit meal type from the task itself
  if (task.type === 'meal' && task.mealType && task.mealType !== 'snack') {
    return task.mealType as 'breakfast' | 'lunch' | 'dinner';
  }

  // Fallback: match on title — any task whose title names a meal counts
  // (e.g. "Lunch for me" is category self-care but still a meal)
  const title = task.title.toLowerCase();
  if (title.includes('breakfast')) return 'breakfast';
  if (title.includes('lunch')) return 'lunch';
  if (title.includes('dinner') || title.includes('supper')) return 'dinner';

  return null;
}

export function useDailyFlower() {
  const tasks = useTaskStore(s => s.tasks);
  const taskInstances = useTaskStore(s => s.taskInstances);
  const hasEarnedFlowerToday = useGardenStore(s => s.hasEarnedFlowerToday);

  return useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayInstances = taskInstances.filter(i => i.date === today);

    // Count distinct completed meals (breakfast, lunch, dinner)
    const completedMealTypes = new Set<string>();
    for (const instance of todayInstances) {
      if (instance.status !== 'completed') continue;
      const task = tasks.find(t => t.id === instance.taskId);
      if (!task) continue;

      const mealType = detectMealType(task);
      if (mealType) {
        completedMealTypes.add(mealType);
      }
    }

    const mealsCompleted = completedMealTypes.size; // 0-3
    const stage = Math.min(mealsCompleted, 3) as DailyFlowerStage;
    const isBloomed = stage === 3;
    const alreadyEarned = hasEarnedFlowerToday('daily-daisy');

    return {
      stage,
      mealsCompleted,
      isBloomed,
      alreadyEarned,
      completedMealTypes: Array.from(completedMealTypes),
    };
  }, [tasks, taskInstances, hasEarnedFlowerToday]);
}
