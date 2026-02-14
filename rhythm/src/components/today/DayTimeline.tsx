import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useTaskStore } from '../../stores/useTaskStore';
import { useChildStore } from '../../stores/useChildStore';
import { useNapStore } from '../../stores/useNapStore';
import { useCareBlockStore } from '../../stores/useCareBlockStore';
import { useHabitBlockStore } from '../../stores/useHabitBlockStore';
import { shouldTaskOccurOnDate } from '../../stores/useTaskStore';

interface TimelineEntry {
  time: string;       // HH:mm
  timeMinutes: number; // for sorting
  label: string;
  type: 'anchor' | 'care-block' | 'nap-schedule' | 'user-sleep' | 'habit-block';
  isCurrentSegment: boolean;
}

export function DayTimeline() {
  const [collapsed, setCollapsed] = useState(false);
  const tasks = useTaskStore((state) => state.tasks);
  const children = useChildStore((state) => state.children);
  const userWakeTime = useChildStore((state) => state.userWakeTime);
  const userBedtime = useChildStore((state) => state.userBedtime);
  const napSchedules = useNapStore((state) => state.napSchedules);
  const blocks = useCareBlockStore((state) => state.blocks);
  const habitBlocks = useHabitBlockStore((state) => state.blocks);
  const getBlocksForDate = useHabitBlockStore((state) => state.getBlocksForDate);
  const getChild = useChildStore((state) => state.getChild);

  const entries = useMemo(() => {
    const now = new Date();
    const today = now;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const items: TimelineEntry[] = [];

    // Add anchor tasks for today
    tasks
      .filter((t) => t.tier === 'anchor' && t.scheduledTime && shouldTaskOccurOnDate(t, today))
      .forEach((task) => {
        const [h, m] = task.scheduledTime!.split(':').map(Number);
        const childName = task.childId ? getChild(task.childId)?.name : null;
        items.push({
          time: task.scheduledTime!,
          timeMinutes: h * 60 + m,
          label: childName ? `${childName} ${task.title}` : task.title,
          type: 'anchor',
          isCurrentSegment: false,
        });
      });

    // Add care blocks for today
    blocks
      .filter((b) => b.isActive && (b.blockType === 'childcare' || b.blockType === 'babysitter'))
      .forEach((block) => {
        // Check if this block occurs today
        const childNames = block.childIds
          .map((id) => getChild(id)?.name)
          .filter(Boolean)
          .join(' & ');

        const [sh, sm] = block.startTime.split(':').map(Number);
        const [eh, em] = block.endTime.split(':').map(Number);
        const startMins = sh * 60 + sm;
        const endMins = eh * 60 + em;

        items.push({
          time: block.startTime,
          timeMinutes: startMins,
          label: `---- ${childNames} at ${block.name} ----`,
          type: 'care-block',
          isCurrentSegment: currentMinutes >= startMins && currentMinutes < endMins,
        });

        items.push({
          time: block.endTime,
          timeMinutes: endMins,
          label: `${childNames} home`,
          type: 'care-block',
          isCurrentSegment: false,
        });
      });

    // Add sleep schedules
    napSchedules.forEach((schedule) => {
      const child = children.find((c) => c.id === schedule.childId);
      if (!child || !child.isNappingAge) return;

      const [sh, sm] = schedule.typicalStart.split(':').map(Number);
      items.push({
        time: schedule.typicalStart,
        timeMinutes: sh * 60 + sm,
        label: `(${child.name} sleep ${schedule.napNumber})`,
        type: 'nap-schedule',
        isCurrentSegment: false,
      });
    });

    // Add habit blocks
    const todaysHabitBlocks = getBlocksForDate(today);
    todaysHabitBlocks.forEach((block) => {
      if (block.anchor.type === 'time' && block.anchor.time) {
        const [bh, bm] = block.anchor.time.split(':').map(Number);
        const startMins = bh * 60 + bm;
        const endMins = block.estimatedEndTime
          ? (() => { const [eh, em] = block.estimatedEndTime.split(':').map(Number); return eh * 60 + em; })()
          : startMins + 90;
        items.push({
          time: block.anchor.time,
          timeMinutes: startMins,
          label: `${block.emoji || ''} ${block.name}`.trim(),
          type: 'habit-block',
          isCurrentSegment: currentMinutes >= startMins && currentMinutes < endMins,
        });
      }
    });

    // Add user sleep bookends
    if (userWakeTime) {
      const [wh, wm] = userWakeTime.split(':').map(Number);
      items.push({
        time: userWakeTime,
        timeMinutes: wh * 60 + wm,
        label: 'Your wake up',
        type: 'user-sleep',
        isCurrentSegment: false,
      });
    }
    if (userBedtime) {
      const [bh, bm] = userBedtime.split(':').map(Number);
      items.push({
        time: userBedtime,
        timeMinutes: bh * 60 + bm,
        label: 'Your bedtime',
        type: 'user-sleep',
        isCurrentSegment: false,
      });
    }

    // Sort by time
    items.sort((a, b) => a.timeMinutes - b.timeMinutes);

    // Mark current segment
    for (let i = 0; i < items.length; i++) {
      const thisTime = items[i].timeMinutes;
      const nextTime = i + 1 < items.length ? items[i + 1].timeMinutes : 24 * 60;
      if (currentMinutes >= thisTime && currentMinutes < nextTime) {
        items[i].isCurrentSegment = true;
      }
    }

    return items;
  }, [tasks, blocks, habitBlocks, getBlocksForDate, napSchedules, children, getChild, userWakeTime, userBedtime]);

  if (entries.length === 0) return null;

  const formatTimeDisplay = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(h, m);
    return format(date, 'h:mm');
  };

  return (
    <div className="mb-4">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 text-xs text-bark/50 hover:text-bark/70 mb-2 transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${collapsed ? '' : 'rotate-180'}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        <span className="font-medium uppercase tracking-wide">Day Overview</span>
      </button>

      {!collapsed && (
        <div className="bg-parchment/50 rounded-xl p-3">
          <div className="space-y-0">
            {entries.map((entry, i) => (
              <div
                key={`${entry.time}-${i}`}
                className={`flex items-center gap-3 py-1 ${
                  entry.isCurrentSegment ? 'text-bark font-medium' : 'text-bark/50'
                }`}
              >
                <span className="text-xs w-10 text-right tabular-nums flex-shrink-0">
                  {formatTimeDisplay(entry.time)}
                </span>
                {entry.isCurrentSegment && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sage flex-shrink-0" />
                )}
                {!entry.isCurrentSegment && (
                  <span className="w-1.5 h-1.5 rounded-full bg-bark/20 flex-shrink-0" />
                )}
                <span className={`text-sm ${
                  entry.type === 'care-block' ? 'text-sage' :
                  entry.type === 'nap-schedule' ? 'text-lavender italic' :
                  entry.type === 'user-sleep' ? 'text-dustyrose italic' :
                  entry.type === 'habit-block' ? 'text-terracotta font-medium' :
                  ''
                }`}>
                  {entry.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
