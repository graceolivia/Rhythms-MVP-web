import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, addDays, subDays } from 'date-fns';
import { useCareBlockStore } from '../stores/useCareBlockStore';
import { useTaskStore, shouldTaskOccurOnDate, getTaskDisplayTitle } from '../stores/useTaskStore';
import { useNapStore } from '../stores/useNapStore';
import { useChildStore } from '../stores/useChildStore';
import type { CareBlock, Task, TaskInstance, AvailabilityState } from '../types';

// Timeline configuration
const TIMELINE_START_HOUR = 6; // 6 AM
const TIMELINE_END_HOUR = 22; // 10 PM
const HOUR_HEIGHT_PX = 60; // pixels per hour
const TOTAL_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR;

/**
 * Convert time string (HH:mm) to pixels from top of timeline
 */
function timeToPixels(time: string): number {
  const [h, m] = time.split(':').map(Number);
  const hoursFromStart = h - TIMELINE_START_HOUR + m / 60;
  return Math.max(0, Math.min(hoursFromStart * HOUR_HEIGHT_PX, TOTAL_HOURS * HOUR_HEIGHT_PX));
}

/**
 * Get height in pixels for a time range
 */
function getHeightForTimeRange(startTime: string, endTime: string): number {
  const startPx = timeToPixels(startTime);
  const endPx = timeToPixels(endTime);
  return Math.max(0, endPx - startPx);
}

/**
 * Adjust time by minutes
 */
function adjustTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/**
 * Format time for display
 */
function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return m === 0 ? `${hour12}${ampm}` : `${hour12}:${String(m).padStart(2, '0')}${ampm}`;
}

/**
 * Get color classes for availability state
 */
function getAvailabilityColors(state: AvailabilityState): { bg: string; border: string; text: string } {
  switch (state) {
    case 'free':
      return { bg: 'bg-spring-light', border: 'border-sage', text: 'text-sage' };
    case 'quiet':
      return { bg: 'bg-lavender/30', border: 'border-lavender', text: 'text-lavender' };
    case 'unavailable':
      return { bg: 'bg-bark/10', border: 'border-bark/40', text: 'text-bark/60' };
    case 'parenting':
    default:
      return { bg: 'bg-peach/30', border: 'border-peach', text: 'text-peach' };
  }
}

/**
 * Get block type display info
 */
function getBlockTypeInfo(blockType: CareBlock['blockType']): { label: string; emoji: string } {
  switch (blockType) {
    case 'childcare':
      return { label: 'Childcare', emoji: '🏫' };
    case 'babysitter':
      return { label: 'Babysitter', emoji: '👤' };
    case 'appointment':
      return { label: 'Appointment', emoji: '📅' };
    case 'activity':
      return { label: 'Activity', emoji: '⚽' };
    case 'sleep':
      return { label: 'Sleep', emoji: '😴' };
    default:
      return { label: 'Block', emoji: '📌' };
  }
}

interface TimelineBlockProps {
  block: CareBlock;
  children: { id: string; name: string }[];
}

function TimelineBlock({ block, children }: TimelineBlockProps) {
  const blockTypeInfo = getBlockTypeInfo(block.blockType);
  const availabilityState: AvailabilityState =
    block.blockType === 'childcare' || block.blockType === 'babysitter' ? 'free' :
    block.blockType === 'appointment' || block.blockType === 'activity' ? 'unavailable' :
    block.blockType === 'sleep' ? 'quiet' : 'parenting';

  const colors = getAvailabilityColors(availabilityState);

  const top = timeToPixels(block.startTime);
  const height = getHeightForTimeRange(block.startTime, block.endTime);

  // Get child names for this block
  const affectedChildren = children.filter(c => block.childIds.includes(c.id));
  const childNames = affectedChildren.map(c => c.name).join(', ');

  // Calculate travel time blocks
  const travelBefore = block.travelTimeBefore ? {
    top: timeToPixels(adjustTime(block.startTime, -block.travelTimeBefore)),
    height: block.travelTimeBefore * (HOUR_HEIGHT_PX / 60),
  } : null;

  const travelAfter = block.travelTimeAfter ? {
    top: timeToPixels(block.endTime),
    height: block.travelTimeAfter * (HOUR_HEIGHT_PX / 60),
  } : null;

  return (
    <>
      {/* Travel time before */}
      {travelBefore && (
        <div
          className="absolute left-16 right-4 rounded-lg border-2 border-dashed border-bark/30 bg-bark/5 flex items-center justify-center overflow-hidden"
          style={{ top: travelBefore.top, height: travelBefore.height }}
        >
          <span className="text-xs text-bark/40 px-2">
            🚗 Travel ({block.travelTimeBefore}min)
          </span>
        </div>
      )}

      {/* Main block */}
      <div
        className={`absolute left-16 right-4 rounded-lg border-2 ${colors.bg} ${colors.border} overflow-hidden`}
        style={{ top, height: Math.max(height, 24) }}
      >
        <div className="px-3 py-1 h-full flex flex-col justify-center">
          <div className="flex items-center gap-2">
            <span>{blockTypeInfo.emoji}</span>
            <span className={`font-medium text-sm ${colors.text}`}>{block.name}</span>
          </div>
          {height > 40 && (
            <div className="text-xs text-bark/50 mt-1">
              {formatTime(block.startTime)} - {formatTime(block.endTime)}
              {childNames && <span className="ml-2">({childNames})</span>}
            </div>
          )}
        </div>
      </div>

      {/* Travel time after */}
      {travelAfter && (
        <div
          className="absolute left-16 right-4 rounded-lg border-2 border-dashed border-bark/30 bg-bark/5 flex items-center justify-center overflow-hidden"
          style={{ top: travelAfter.top, height: travelAfter.height }}
        >
          <span className="text-xs text-bark/40 px-2">
            🚗 Travel ({block.travelTimeAfter}min)
          </span>
        </div>
      )}
    </>
  );
}

interface TaskDotProps {
  task: Task;
  instance: TaskInstance | undefined;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  getChild: (id: string) => { name: string } | undefined;
}

function TaskDot({ task, instance, index, isSelected, onSelect, getChild }: TaskDotProps) {
  if (!task.scheduledTime) return null;

  const top = timeToPixels(task.scheduledTime);
  const isCompleted = instance?.status === 'completed';

  // Dot colors by tier
  const dotColors = {
    anchor: isCompleted ? 'bg-bark/40' : 'bg-bark',
    rhythm: isCompleted ? 'bg-sage/40' : 'bg-sage',
    tending: isCompleted ? 'bg-terracotta/40' : 'bg-terracotta',
  };

  // Offset for stacking multiple dots at same time
  const leftOffset = 64 + (index * 20); // 64px base + 20px per dot

  return (
    <button
      onClick={onSelect}
      className={`absolute w-4 h-4 rounded-full transition-all ${dotColors[task.tier]} ${
        isSelected ? 'ring-2 ring-offset-2 ring-bark/50 scale-125' : 'hover:scale-110'
      } ${isCompleted ? 'opacity-60' : 'shadow-sm'}`}
      style={{
        top: top - 8,
        left: leftOffset,
      }}
      title={getTaskDisplayTitle(task, getChild)}
    >
      {isCompleted && (
        <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

interface TaskPopupProps {
  task: Task;
  instance: TaskInstance | undefined;
  onClose: () => void;
  getChild: (id: string) => { name: string } | undefined;
}

function TaskPopup({ task, instance, onClose, getChild }: TaskPopupProps) {
  const isCompleted = instance?.status === 'completed';
  const displayTitle = getTaskDisplayTitle(task, getChild);

  const tierLabels = {
    anchor: 'Anchor',
    rhythm: 'Rhythm',
    tending: 'Tending',
  };

  const tierColors = {
    anchor: 'bg-bark/10 text-bark',
    rhythm: 'bg-sage/10 text-sage',
    tending: 'bg-terracotta/10 text-terracotta',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4" onClick={onClose}>
      <div
        className="bg-cream rounded-xl shadow-xl p-4 w-full max-w-sm border border-bark/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${tierColors[task.tier]}`}>
                {tierLabels[task.tier]}
              </span>
              {isCompleted && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-sage/20 text-sage">
                  Done
                </span>
              )}
            </div>
            <h3 className={`font-medium text-bark ${isCompleted ? 'line-through opacity-60' : ''}`}>
              {displayTitle}
            </h3>
            {task.scheduledTime && (
              <p className="text-sm text-bark/50 mt-1">
                Scheduled: {formatTime(task.scheduledTime)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-bark/10 text-bark/40"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

interface NapBlockProps {
  childName: string;
  startTime: string;
  endTime: string;
}

function NapBlock({ childName, startTime, endTime }: NapBlockProps) {
  const top = timeToPixels(startTime);
  const height = getHeightForTimeRange(startTime, endTime);

  return (
    <div
      className="absolute left-16 right-4 rounded-lg border-2 border-lavender bg-lavender/20 overflow-hidden"
      style={{ top, height: Math.max(height, 24) }}
    >
      <div className="px-3 py-1 h-full flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <span>😴</span>
          <span className="font-medium text-sm text-lavender">{childName}'s nap</span>
        </div>
        {height > 40 && (
          <div className="text-xs text-bark/50 mt-1">
            {formatTime(startTime)} - {formatTime(endTime)}
          </div>
        )}
      </div>
    </div>
  );
}

function CurrentTimeLine() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const top = timeToPixels(currentTime);

  // Only show if within timeline bounds
  if (top <= 0 || top >= TOTAL_HOURS * HOUR_HEIGHT_PX) return null;

  return (
    <div
      className="absolute left-0 right-0 flex items-center pointer-events-none z-20"
      style={{ top }}
    >
      <div className="w-3 h-3 rounded-full bg-rose-500 -ml-1.5" />
      <div className="flex-1 h-0.5 bg-rose-500" />
      <span className="text-xs font-medium text-rose-500 ml-2">Now</span>
    </div>
  );
}

export function Timeline() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const getActiveBlocksForDate = useCareBlockStore((state) => state.getActiveBlocksForDate);
  const tasks = useTaskStore((state) => state.tasks);
  const taskInstances = useTaskStore((state) => state.taskInstances);
  const napSchedules = useNapStore((state) => state.napSchedules);
  const children = useChildStore((state) => state.children);
  const getChild = useChildStore((state) => state.getChild);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

  // Get data for selected date
  const { blocks, scheduledTasks, naps, taskInstanceMap } = useMemo(() => {
    const activeBlocks = getActiveBlocksForDate(selectedDate);

    // Get tasks with scheduled times that occur on this date
    const tasksForDate = tasks.filter(task =>
      task.scheduledTime &&
      task.isActive &&
      shouldTaskOccurOnDate(task, selectedDate)
    );

    // Sort by time, then by tier priority
    const tierOrder = { anchor: 0, rhythm: 1, tending: 2 };
    tasksForDate.sort((a, b) => {
      const timeCompare = (a.scheduledTime || '').localeCompare(b.scheduledTime || '');
      if (timeCompare !== 0) return timeCompare;
      return tierOrder[a.tier] - tierOrder[b.tier];
    });

    // Create a map of taskId -> instance for this date
    const instanceMap = new Map<string, TaskInstance>();
    taskInstances
      .filter(inst => inst.date === dateStr)
      .forEach(inst => instanceMap.set(inst.taskId, inst));

    // Get nap schedules
    const scheduledNaps = napSchedules.map(nap => {
      const child = children.find(c => c.id === nap.childId);
      return {
        ...nap,
        childName: child?.name || 'Child',
      };
    });

    return {
      blocks: activeBlocks,
      scheduledTasks: tasksForDate,
      naps: scheduledNaps,
      taskInstanceMap: instanceMap,
    };
  }, [selectedDate, getActiveBlocksForDate, tasks, taskInstances, dateStr, napSchedules, children]);

  // Group tasks by time slot for stacking (within 15 min = same slot)
  const groupedTasks = useMemo(() => {
    const groups: { time: string; tasks: Task[] }[] = [];

    scheduledTasks.forEach(task => {
      if (!task.scheduledTime) return;

      // Find existing group within 15 minutes
      const taskMinutes = parseInt(task.scheduledTime.split(':')[0]) * 60 +
                          parseInt(task.scheduledTime.split(':')[1]);

      const existingGroup = groups.find(g => {
        const groupMinutes = parseInt(g.time.split(':')[0]) * 60 +
                            parseInt(g.time.split(':')[1]);
        return Math.abs(taskMinutes - groupMinutes) < 15;
      });

      if (existingGroup) {
        existingGroup.tasks.push(task);
      } else {
        groups.push({ time: task.scheduledTime, tasks: [task] });
      }
    });

    return groups;
  }, [scheduledTasks]);

  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null;

  // Generate hour markers
  const hourMarkers = useMemo(() => {
    const markers = [];
    for (let h = TIMELINE_START_HOUR; h <= TIMELINE_END_HOUR; h++) {
      markers.push({
        hour: h,
        label: h === 12 ? '12PM' : h > 12 ? `${h - 12}PM` : `${h}AM`,
        top: (h - TIMELINE_START_HOUR) * HOUR_HEIGHT_PX,
      });
    }
    return markers;
  }, []);

  const childList = children.map(c => ({ id: c.id, name: c.name }));

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <header className="sticky top-0 bg-cream/95 backdrop-blur-sm z-30 p-4 border-b border-bark/10">
          <div className="flex items-center justify-between mb-4">
            <Link to="/" className="text-bark/60 hover:text-bark transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="font-display text-xl text-bark">Day Timeline</h1>
            <div className="w-6" /> {/* Spacer */}
          </div>

          {/* Date navigation */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setSelectedDate(d => subDays(d, 1))}
              className="p-2 rounded-lg hover:bg-parchment transition-colors"
            >
              <svg className="w-5 h-5 text-bark/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={() => setSelectedDate(new Date())}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isToday ? 'bg-sage text-cream' : 'bg-parchment text-bark hover:bg-linen'
              }`}
            >
              {isToday ? 'Today' : format(selectedDate, 'EEE, MMM d')}
            </button>

            <button
              onClick={() => setSelectedDate(d => addDays(d, 1))}
              className="p-2 rounded-lg hover:bg-parchment transition-colors"
            >
              <svg className="w-5 h-5 text-bark/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </header>

        {/* Legend */}
        <div className="px-4 py-3 flex flex-wrap gap-x-4 gap-y-2 text-xs border-b border-bark/10">
          {/* Block legend */}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-spring-light border border-sage" />
            <span className="text-bark/60">Free</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-lavender/30 border border-lavender" />
            <span className="text-bark/60">Quiet</span>
          </div>
          {/* Task dot legend */}
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-bark" />
            <span className="text-bark/60">Anchor</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-sage" />
            <span className="text-bark/60">Rhythm</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-terracotta" />
            <span className="text-bark/60">Tending</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative px-4 pb-24" style={{ height: TOTAL_HOURS * HOUR_HEIGHT_PX + 100 }}>
          {/* Hour markers */}
          {hourMarkers.map(({ hour, label, top }) => (
            <div key={hour} className="absolute left-4 right-4 flex items-center" style={{ top }}>
              <span className="w-12 text-xs text-bark/40 font-medium">{label}</span>
              <div className="flex-1 border-t border-bark/10" />
            </div>
          ))}

          {/* Care blocks */}
          {blocks.map(block => (
            <TimelineBlock key={block.id} block={block} children={childList} />
          ))}

          {/* Nap schedules */}
          {naps.map(nap => (
            <NapBlock
              key={nap.id}
              childName={nap.childName}
              startTime={nap.typicalStart}
              endTime={nap.typicalEnd}
            />
          ))}

          {/* Task dots */}
          {groupedTasks.map(group =>
            group.tasks.map((task, index) => (
              <TaskDot
                key={task.id}
                task={task}
                instance={taskInstanceMap.get(task.id)}
                index={index}
                isSelected={selectedTaskId === task.id}
                onSelect={() => setSelectedTaskId(selectedTaskId === task.id ? null : task.id)}
                getChild={getChild}
              />
            ))
          )}

          {/* Current time indicator (only on today) */}
          {isToday && <CurrentTimeLine />}

          {/* Empty state */}
          {blocks.length === 0 && scheduledTasks.length === 0 && naps.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="text-4xl mb-4">📅</div>
                <p className="text-bark/60 mb-2">No scheduled blocks for this day</p>
                <p className="text-sm text-bark/40">
                  Add care arrangements in Settings to see them here
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Task popup */}
        {selectedTask && (
          <TaskPopup
            task={selectedTask}
            instance={taskInstanceMap.get(selectedTask.id)}
            onClose={() => setSelectedTaskId(null)}
            getChild={getChild}
          />
        )}
      </div>
    </div>
  );
}
