import { format } from 'date-fns';
import { useTaskStore } from '../../stores/useTaskStore';
import { useHabitBlockStore } from '../../stores/useHabitBlockStore';
import { TaskCard } from './TaskCard';
import type { TaskInstance } from '../../types';

interface ChoreQueueSlotProps {
  onTaskTap: (instance: TaskInstance) => void;
}

export function ChoreQueueSlot({ onTaskTap }: ChoreQueueSlotProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const getTodaysChoreQueuePick = useHabitBlockStore((s) => s.getTodaysChoreQueuePick);
  const shuffleChoreQueuePick = useHabitBlockStore((s) => s.shuffleChoreQueuePick);
  const tasks = useTaskStore((s) => s.tasks);
  const taskInstances = useTaskStore((s) => s.taskInstances);

  const pickId = getTodaysChoreQueuePick(today);
  if (!pickId) return null;

  const task = tasks.find((t) => t.id === pickId);
  if (!task) return null;

  const instance = taskInstances.find(
    (i) => i.taskId === pickId && i.date === today
  );

  if (!instance) {
    // No instance yet — show a placeholder
    return (
      <div className="rounded-xl bg-cream/50 border border-dashed border-bark/20 p-4 text-center">
        <p className="text-sm text-bark/50">Today's chore: {task.title}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <TaskCard
        task={task}
        instance={instance}
        today={today}
        onTap={() => onTaskTap(instance)}
      />
      {instance.status !== 'completed' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            shuffleChoreQueuePick(today);
          }}
          className="absolute top-2 right-2 text-xs text-bark/40 hover:text-bark/60 px-2 py-1 rounded-lg hover:bg-bark/5 transition-colors"
          title="Pick a different chore"
        >
          Shuffle
        </button>
      )}
    </div>
  );
}
