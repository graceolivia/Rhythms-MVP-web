import { format } from 'date-fns';
import { useTaskStore } from '../../stores/useTaskStore';
import { useHabitBlockStore } from '../../stores/useHabitBlockStore';

export function ChoreQueueBanner() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const getTodaysChoreQueuePick = useHabitBlockStore((s) => s.getTodaysChoreQueuePick);
  const tasks = useTaskStore((s) => s.tasks);
  const taskInstances = useTaskStore((s) => s.taskInstances);

  const pickId = getTodaysChoreQueuePick(today);
  if (!pickId) return null;

  const task = tasks.find((t) => t.id === pickId);
  if (!task) return null;

  const instance = taskInstances.find(
    (i) => i.taskId === pickId && i.date === today
  );

  // Don't show if already completed
  if (instance?.status === 'completed') return null;

  return (
    <div className="mb-3 px-3 py-2 rounded-lg bg-lavender/10 border border-lavender/20">
      <div className="flex items-center gap-2">
        <span className="text-xs text-lavender font-medium">Today's chore:</span>
        <span className="text-sm text-bark">{task.title}</span>
      </div>
    </div>
  );
}
