import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useTaskStore } from '../../stores/useTaskStore';
import { useChildStore } from '../../stores/useChildStore';
import { useCareBlockStore } from '../../stores/useCareBlockStore';
import { shouldTaskOccurOnDate } from '../../stores/useTaskStore';

interface TimelineEntry {
  time: string;       // HH:mm
  timeMinutes: number; // for sorting
  label: string;
  emoji?: string;
  type: 'anchor' | 'care-block' | 'user-sleep';
  isCurrentSegment: boolean;
}

function useDayTimelineEntries() {
  const tasks = useTaskStore((state) => state.tasks);
  const userWakeTime = useChildStore((state) => state.userWakeTime);
  const userBedtime = useChildStore((state) => state.userBedtime);
  const blocks = useCareBlockStore((state) => state.blocks);
  const getChild = useChildStore((state) => state.getChild);

  return useMemo(() => {
    const now = new Date();
    const today = now;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const items: TimelineEntry[] = [];

    // Add anchor tasks for today
    tasks
      .filter((t) => t.tier === 'fixed-schedule' && t.scheduledTime && shouldTaskOccurOnDate(t, today))
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
    const todayDow = today.getDay(); // 0=Sun, 6=Sat
    const todayStr = format(today, 'yyyy-MM-dd');
    blocks
      .filter((b) => {
        if (!b.isActive) return false;
        if (b.blockType !== 'childcare' && b.blockType !== 'babysitter') return false;
        if (b.recurrence === 'one-off') return b.oneOffDate === todayStr;
        const days = b.daysOfWeek ?? [];
        if (days.length > 0) return days.includes(todayDow);
        // Fallback: recurrence string with no explicit days
        if (b.recurrence === 'daily') return true;
        if (b.recurrence === 'weekdays') return todayDow >= 1 && todayDow <= 5;
        if (b.recurrence === 'weekends') return todayDow === 0 || todayDow === 6;
        return true;
      })
      .forEach((block) => {
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

    return { entries: items, currentMinutes };
  }, [tasks, blocks, getChild, userWakeTime, userBedtime]);
}

const formatTimeDisplay = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m);
  return format(date, 'h:mm');
};

function TimelineRow({ entry }: { entry: TimelineEntry }) {
  return (
    <div
      className={`flex items-center gap-3 py-1 ${
        entry.isCurrentSegment ? 'text-bark font-medium' : 'text-bark/50'
      }`}
    >
      <span className="text-xs w-10 text-right tabular-nums flex-shrink-0">
        {formatTimeDisplay(entry.time)}
      </span>
      {entry.isCurrentSegment ? (
        <span className="w-1.5 h-1.5 rounded-full bg-sage flex-shrink-0" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-bark/20 flex-shrink-0" />
      )}
      <span className={`text-sm flex items-center gap-1 ${
        entry.type === 'care-block' ? 'text-sage' :
        entry.type === 'user-sleep' ? 'text-dustyrose italic' :
        ''
      }`}>
        {entry.emoji && <span className="emoji-icon">{entry.emoji}</span>}
        {entry.label}
      </span>
    </div>
  );
}

/** Compact version for the Today screen: current event + next 2, expandable to full */
export function DayOverviewCompact() {
  const { entries, currentMinutes } = useDayTimelineEntries();
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 0) return null;

  // Find the current segment index
  const currentIndex = entries.findIndex((e) => e.isCurrentSegment);

  // Show: current event + next 2 upcoming
  let visibleEntries: TimelineEntry[];
  if (currentIndex >= 0) {
    visibleEntries = entries.slice(currentIndex, currentIndex + 3);
  } else {
    const nextIndex = entries.findIndex((e) => e.timeMinutes > currentMinutes);
    if (nextIndex >= 0) {
      visibleEntries = entries.slice(nextIndex, nextIndex + 3);
    } else {
      visibleEntries = entries.slice(-1);
    }
  }

  const hasMore = entries.length > visibleEntries.length;
  const displayedEntries = expanded ? entries : visibleEntries;

  return (
    <div className="mb-4">
      <div className="bg-parchment/50 rounded-xl p-3">
        <div className="space-y-0">
          {displayedEntries.map((entry, i) => (
            <TimelineRow key={`${entry.time}-${i}`} entry={entry} />
          ))}
        </div>
        {hasMore && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="block w-full text-center text-xs text-bark/40 hover:text-bark/60 mt-2 pt-1 border-t border-bark/10 transition-colors"
          >
            {expanded ? 'Show less ▲' : 'View full day ▼'}
          </button>
        )}
      </div>
    </div>
  );
}

/** Full version for the Timeline page */
export function DayTimeline() {
  const { entries } = useDayTimelineEntries();

  if (entries.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-xs font-medium text-bark/50 uppercase tracking-wide mb-2">Day Overview</h2>
      <div className="bg-parchment/50 rounded-xl p-3">
        <div className="space-y-0">
          {entries.map((entry, i) => (
            <TimelineRow key={`${entry.time}-${i}`} entry={entry} />
          ))}
        </div>
      </div>
    </div>
  );
}
