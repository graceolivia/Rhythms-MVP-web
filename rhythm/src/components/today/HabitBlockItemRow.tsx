import { useTaskStore } from '../../stores/useTaskStore';
import { TaskCard } from './TaskCard';
import { RoutineItemRow } from './RoutineItemRow';
import { ChoreQueueSlot } from './ChoreQueueSlot';
import type { HabitBlockItem, TaskInstance } from '../../types';

interface HabitBlockItemRowProps {
  item: HabitBlockItem;
  today: string;
  onTaskTap: (instance: TaskInstance) => void;
  fadingOut: Set<string>;
  recentlyCompleted: Set<string>;
}

export function HabitBlockItemRow({
  item,
  today,
  onTaskTap,
  fadingOut,
  recentlyCompleted,
}: HabitBlockItemRowProps) {
  const tasks = useTaskStore((s) => s.tasks);
  const taskInstances = useTaskStore((s) => s.taskInstances);

  if (item.choreQueueSlot) {
    return <ChoreQueueSlot onTaskTap={onTaskTap} />;
  }

  const task = tasks.find((t) => t.id === item.taskId);
  if (!task) return null;

  // Non-trackable items get a simple text row
  if (!item.isTrackable) {
    return <RoutineItemRow title={task.title} />;
  }

  // Find or fallback instance
  const instance = taskInstances.find(
    (i) => i.taskId === item.taskId && i.date === today
  );

  if (!instance) {
    // Task has no instance for today — show as routine
    return <RoutineItemRow title={task.title} />;
  }

  const isFading = fadingOut.has(instance.id);
  const isRecent = recentlyCompleted.has(instance.id);

  // Skip completed items that are done fading
  if (instance.status === 'completed' && !isRecent) return null;

  return (
    <div
      className={`transition-all duration-300 ease-in-out ${
        isFading ? 'opacity-0 max-h-0 overflow-hidden -my-1' : 'opacity-100 max-h-40'
      }`}
    >
      <TaskCard
        task={task}
        instance={instance}
        today={today}
        onTap={() => onTaskTap(instance)}
      />
    </div>
  );
}
