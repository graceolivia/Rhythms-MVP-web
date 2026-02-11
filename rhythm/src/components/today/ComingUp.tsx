import { useMemo } from 'react';
import { format } from 'date-fns';
import { useTaskStore, shouldTaskOccurOnDate } from '../../stores/useTaskStore';
import { useChildStore } from '../../stores/useChildStore';
import { useNapStore } from '../../stores/useNapStore';
import { useCareBlockStore } from '../../stores/useCareBlockStore';
import { useHabitBlockStore } from '../../stores/useHabitBlockStore';

interface ComingUpEntry {
  time: string;       // HH:mm
  timeMinutes: number;
  label: string;
  type: 'task' | 'care-block' | 'nap-schedule' | 'habit-block';
  triggeredBy?: string;
}

export function ComingUp() {
  const tasks = useTaskStore((state) => state.tasks);
  const children = useChildStore((state) => state.children);
  const getChild = useChildStore((state) => state.getChild);
  const napSchedules = useNapStore((state) => state.napSchedules);
  const blocks = useCareBlockStore((state) => state.blocks);
  const habitBlocks = useHabitBlockStore((state) => state.blocks);
  const getBlocksForDate = useHabitBlockStore((state) => state.getBlocksForDate);

  const upcomingEntries = useMemo(() => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const entries: ComingUpEntry[] = [];

    // Upcoming anchor tasks
    tasks
      .filter((t) => t.tier === 'anchor' && t.scheduledTime && shouldTaskOccurOnDate(t, now))
      .forEach((task) => {
        const [h, m] = task.scheduledTime!.split(':').map(Number);
        const timeMins = h * 60 + m;
        if (timeMins <= currentMinutes) return; // Already past
        const childName = task.childId ? getChild(task.childId)?.name : null;
        entries.push({
          time: task.scheduledTime!,
          timeMinutes: timeMins,
          label: childName ? `${childName} ${task.title}` : task.title,
          type: 'task',
          triggeredBy: task.triggeredBy ?? undefined,
        });
      });

    // Upcoming care block transitions
    blocks
      .filter((b) => b.isActive && (b.blockType === 'childcare' || b.blockType === 'babysitter'))
      .forEach((block) => {
        const childNames = block.childIds
          .map((id) => getChild(id)?.name)
          .filter(Boolean)
          .join(' & ');

        const [sh, sm] = block.startTime.split(':').map(Number);
        const startMins = sh * 60 + sm;
        if (startMins > currentMinutes) {
          entries.push({
            time: block.startTime,
            timeMinutes: startMins,
            label: `${childNames} to ${block.name}`,
            type: 'care-block',
          });
        }

        const [eh, em] = block.endTime.split(':').map(Number);
        const endMins = eh * 60 + em;
        if (endMins > currentMinutes) {
          entries.push({
            time: block.endTime,
            timeMinutes: endMins,
            label: `${childNames} home from ${block.name}`,
            type: 'care-block',
          });
        }
      });

    // Upcoming nap schedules
    napSchedules.forEach((schedule) => {
      const child = children.find((c) => c.id === schedule.childId);
      if (!child || !child.isNappingAge) return;

      const [sh, sm] = schedule.typicalStart.split(':').map(Number);
      const timeMins = sh * 60 + sm;
      if (timeMins > currentMinutes) {
        entries.push({
          time: schedule.typicalStart,
          timeMinutes: timeMins,
          label: `${child.name}'s nap ${schedule.napNumber}`,
          type: 'nap-schedule',
        });
      }
    });

    // Upcoming habit blocks
    const todaysHabitBlocks = getBlocksForDate(now);
    todaysHabitBlocks.forEach((block) => {
      if (block.anchor.type === 'time' && block.anchor.time) {
        const [bh, bm] = block.anchor.time.split(':').map(Number);
        const timeMins = bh * 60 + bm;
        if (timeMins > currentMinutes) {
          entries.push({
            time: block.anchor.time,
            timeMinutes: timeMins,
            label: `${block.emoji || ''} ${block.name}`.trim(),
            type: 'habit-block',
          });
        }
      }
    });

    // Sort by time and take next 5
    entries.sort((a, b) => a.timeMinutes - b.timeMinutes);
    return entries.slice(0, 5);
  }, [tasks, blocks, habitBlocks, getBlocksForDate, napSchedules, children, getChild]);

  if (upcomingEntries.length === 0) return null;

  const formatTimeDisplay = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m);
    return format(date, 'h:mm a');
  };

  return (
    <div className="mb-4">
      <h3 className="text-xs font-medium text-bark/50 uppercase tracking-wide mb-2">Coming Up</h3>
      <div className="bg-parchment/50 rounded-xl p-3 space-y-2">
        {upcomingEntries.map((entry, i) => (
          <div key={`${entry.time}-${i}`} className="flex items-center gap-3">
            <span className="text-xs text-bark/40 w-16 flex-shrink-0">
              {formatTimeDisplay(entry.time)}
            </span>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              entry.type === 'care-block' ? 'bg-sage' :
              entry.type === 'nap-schedule' ? 'bg-lavender' :
              entry.type === 'habit-block' ? 'bg-terracotta' :
              'bg-terracotta'
            }`} />
            <span className="text-sm text-bark/70">{entry.label}</span>
            {entry.triggeredBy && (
              <span className="text-xs text-bark/30 ml-auto">
                after {entry.triggeredBy.replace('nap-end', 'nap').replace('care-block-end', 'pickup')}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
