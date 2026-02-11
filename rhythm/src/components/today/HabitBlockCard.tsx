import { useMemo } from 'react';
import { format } from 'date-fns';
import { useTaskStore } from '../../stores/useTaskStore';
import { HabitBlockHeader } from './HabitBlockHeader';
import { HabitBlockItemRow } from './HabitBlockItemRow';
import type { HabitBlock, TaskInstance } from '../../types';

interface HabitBlockCardProps {
  block: HabitBlock;
  onTaskTap: (instance: TaskInstance) => void;
  fadingOut: Set<string>;
  recentlyCompleted: Set<string>;
}

export function HabitBlockCard({ block, onTaskTap, fadingOut, recentlyCompleted }: HabitBlockCardProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const tasks = useTaskStore((s) => s.tasks);
  const taskInstances = useTaskStore((s) => s.taskInstances);

  const sortedItems = useMemo(
    () => [...block.items].sort((a, b) => a.order - b.order),
    [block.items]
  );

  // Count progress: only trackable items count
  const { completed, total } = useMemo(() => {
    let comp = 0;
    let tot = 0;
    for (const item of block.items) {
      if (!item.isTrackable && !item.choreQueueSlot) continue;
      if (item.choreQueueSlot) {
        tot++;
        continue;
      }
      const task = tasks.find((t) => t.id === item.taskId);
      if (!task) continue;
      tot++;
      const instance = taskInstances.find(
        (i) => i.taskId === item.taskId && i.date === today
      );
      if (instance?.status === 'completed') comp++;
    }
    return { completed: comp, total: tot };
  }, [block.items, tasks, taskInstances, today]);

  const allDone = total > 0 && completed === total;

  return (
    <div className={`mb-4 rounded-xl border overflow-hidden transition-colors ${
      allDone
        ? 'bg-sage/5 border-sage/20'
        : 'bg-cream border-bark/10'
    }`}>
      <div className="p-4">
        <HabitBlockHeader block={block} completed={completed} total={total} />

        <div className="space-y-2">
          {sortedItems.map((item) => (
            <HabitBlockItemRow
              key={item.choreQueueSlot ? `chore-${item.order}` : item.taskId}
              item={item}
              today={today}
              onTaskTap={onTaskTap}
              fadingOut={fadingOut}
              recentlyCompleted={recentlyCompleted}
            />
          ))}
        </div>

        {allDone && (
          <p className="text-xs text-sage mt-3 text-center">
            Block complete — nice work!
          </p>
        )}
      </div>
    </div>
  );
}
