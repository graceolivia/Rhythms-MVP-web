import { useMemo } from 'react';
import { format } from 'date-fns';
import { useHabitBlockStore } from '../../stores/useHabitBlockStore';
import { useTaskStore } from '../../stores/useTaskStore';
import type { HabitBlock } from '../../types';

function formatBlockTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m);
  return format(d, 'h:mm a');
}

function BlockPreview({ block }: { block: HabitBlock }) {
  const tasks = useTaskStore((s) => s.tasks);
  const taskInstances = useTaskStore((s) => s.taskInstances);
  const today = format(new Date(), 'yyyy-MM-dd');

  const items = useMemo(() => {
    const sorted = [...block.items].sort((a, b) => a.order - b.order);
    return sorted
      .filter((item) => !item.choreQueueSlot)
      .map((item) => {
        const task = tasks.find((t) => t.id === item.taskId);
        if (!task) return null;
        const instance = taskInstances.find(
          (i) => i.taskId === item.taskId && i.date === today
        );
        const done = instance?.status === 'completed';
        return { title: task.title, done, trackable: item.isTrackable };
      })
      .filter(Boolean) as { title: string; done: boolean; trackable: boolean }[];
  }, [block.items, tasks, taskInstances, today]);

  const hasChoreSlot = block.items.some((i) => i.choreQueueSlot);
  const time = block.anchor.type === 'time' && block.anchor.time
    ? formatBlockTime(block.anchor.time)
    : null;

  return (
    <div className="bg-cream/50 rounded-lg p-3 border border-bark/5">
      <div className="flex items-center gap-2 mb-2">
        {block.emoji && <span className="text-sm">{block.emoji}</span>}
        <span className="font-display text-sm text-bark/70">{block.name}</span>
        {time && (
          <span className="text-xs text-bark/40 ml-auto">{time}</span>
        )}
      </div>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            {item.trackable ? (
              <span className={`w-3 h-3 rounded border flex-shrink-0 ${
                item.done ? 'bg-sage/30 border-sage/40' : 'border-bark/20'
              }`} />
            ) : (
              <span className="w-3 h-3 flex-shrink-0" />
            )}
            <span className={`text-xs ${
              item.done ? 'text-bark/30 line-through' : 'text-bark/50'
            }`}>
              {item.title}
            </span>
          </div>
        ))}
        {hasChoreSlot && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded border border-bark/20 flex-shrink-0" />
            <span className="text-xs text-bark/40 italic">daily chore</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function UpNextBlocks() {
  const getBlockOrder = useHabitBlockStore((s) => s.getBlockOrder);
  const blocks = useHabitBlockStore((s) => s.blocks);

  const upcomingBlocks = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const ordered = getBlockOrder();
    return ordered
      .filter((b) => {
        if (b.anchor.type !== 'time' || !b.anchor.time) return false;
        const [h, m] = b.anchor.time.split(':').map(Number);
        return h * 60 + m > currentMinutes;
      })
      .slice(0, 2);
  }, [getBlockOrder, blocks]);

  if (upcomingBlocks.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="text-xs font-medium text-bark/50 uppercase tracking-wide mb-2">
        Up Next
      </h3>
      <div className="space-y-2">
        {upcomingBlocks.map((block) => (
          <BlockPreview key={block.id} block={block} />
        ))}
      </div>
    </div>
  );
}
