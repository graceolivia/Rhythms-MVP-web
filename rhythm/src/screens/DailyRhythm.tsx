import { useState } from 'react';
import {
  format,
  parseISO,
  differenceInMinutes,
  set as setTime,
  startOfWeek,
  addDays,
  isToday,
} from 'date-fns';
import { useChildStore } from '../stores/useChildStore';
import { useNapStore } from '../stores/useNapStore';
import { useTaskStore, shouldTaskOccurOnDate } from '../stores/useTaskStore';
import type { ChildColor, TaskTier } from '../types';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// Timeline config
const START_HOUR = 6; // 6 AM
const END_HOUR = 21; // 9 PM
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOUR_HEIGHT = 48; // pixels per hour

// Color styles mapped to ChildColor values
const COLOR_STYLES: Record<ChildColor, { bg: string; border: string; text: string }> = {
  lavender: { bg: 'bg-lavender/60', border: 'border-lavender', text: 'text-purple-900' },
  sage: { bg: 'bg-sage/60', border: 'border-sage', text: 'text-green-900' },
  skyblue: { bg: 'bg-skyblue/60', border: 'border-skyblue', text: 'text-blue-900' },
  dustyrose: { bg: 'bg-dustyrose/60', border: 'border-dustyrose', text: 'text-rose-900' },
  terracotta: { bg: 'bg-terracotta/60', border: 'border-terracotta', text: 'text-orange-900' },
  clay: { bg: 'bg-clay/60', border: 'border-clay', text: 'text-amber-900' },
};

const DEFAULT_COLOR: ChildColor = 'lavender';
const TASK_TIER_STYLES: Record<TaskTier, { bg: string; border: string; text: string }> = {
  anchor: { bg: 'bg-terracotta/15', border: 'border-terracotta/40', text: 'text-terracotta' },
  rhythm: { bg: 'bg-sage/15', border: 'border-sage/40', text: 'text-sage' },
  tending: { bg: 'bg-skyblue/15', border: 'border-skyblue/40', text: 'text-skyblue' },
};

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

interface NapBlock {
  id: string;
  childId: string;
  childName: string;
  startMinutes: number; // minutes from START_HOUR
  endMinutes: number;
  isActive: boolean;
  color: ChildColor;
}

function DailyTimelineView() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayDate = new Date();
  const children = useChildStore((state) => state.children);
  const napLogs = useNapStore((state) => state.napLogs);
  const tasks = useTaskStore((state) => state.tasks);
  const taskInstances = useTaskStore((state) => state.taskInstances);
  const updateTaskCompletionTime = useTaskStore((state) => state.updateTaskCompletionTime);
  const completeTask = useTaskStore((state) => state.completeTask);
  const resetTaskInstance = useTaskStore((state) => state.resetTaskInstance);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTime, setEditingTime] = useState('');
  const [editingPosition, setEditingPosition] = useState<{ top: number; left: number } | null>(null);

  // Get today's anchors that should occur today
  const todaysAnchors = tasks.filter(
    (t) => t.tier === 'anchor' && t.isActive && t.scheduledTime && shouldTaskOccurOnDate(t, todayDate)
  );

  // Get instances for today to check completion status
  const todaysInstances = taskInstances.filter((i) => i.date === today);

  // Helper to check if an anchor is completed
  const getAnchorInstance = (taskId: string) => todaysInstances.find((i) => i.taskId === taskId);

  // Parse time string to minutes from START_HOUR
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours - START_HOUR) * 60 + minutes;
  };

  // Get today's naps
  const todaysNaps = napLogs.filter((log) => log.date === today);

  // Convert naps to blocks
  const napBlocks: NapBlock[] = todaysNaps.map((nap) => {
    const child = children.find((c) => c.id === nap.childId);
    const startTime = parseISO(nap.startedAt);
    const endTime = nap.endedAt ? parseISO(nap.endedAt) : new Date();

    // Calculate minutes from start of timeline
    const startOfDay = new Date(startTime);
    startOfDay.setHours(START_HOUR, 0, 0, 0);

    const startMinutes = differenceInMinutes(startTime, startOfDay);
    const endMinutes = differenceInMinutes(endTime, startOfDay);

    return {
      id: nap.id,
      childId: nap.childId,
      childName: child?.name || 'Unknown',
      startMinutes: Math.max(0, startMinutes),
      endMinutes: Math.min(TOTAL_HOURS * 60, endMinutes),
      isActive: nap.endedAt === null,
      color: child?.color || DEFAULT_COLOR,
    };
  });

  const completedTasks = taskInstances
    .filter((instance) => instance.date === today && instance.status === 'completed' && instance.completedAt)
    .map((instance) => {
      const task = tasks.find((t) => t.id === instance.taskId);
      if (!task || !instance.completedAt) return null;

      const completedTime = parseISO(instance.completedAt);
      const startOfDay = new Date(completedTime);
      startOfDay.setHours(START_HOUR, 0, 0, 0);
      const minutes = differenceInMinutes(completedTime, startOfDay);
      return {
        id: instance.id,
        title: task.title,
        tier: task.tier,
        scheduledTime: task.scheduledTime,
        minutes,
        completedAt: instance.completedAt,
        completedLabel: format(completedTime, 'h:mm a'),
      };
    })
    .filter((task): task is NonNullable<typeof task> => task !== null)
    .sort((a, b) => a.minutes - b.minutes);

  const inWindowTasks = completedTasks.filter(
    (task) => task.minutes >= 0 && task.minutes <= TOTAL_HOURS * 60
  );
  const beforeWindowTasks = completedTasks.filter((task) => task.minutes < 0);
  const afterWindowTasks = completedTasks.filter((task) => task.minutes > TOTAL_HOURS * 60);

  const taskLaneCounts = new Map<number, number>();
  const completedTaskMarkers = inWindowTasks.map((task) => {
    const minuteKey = Math.round(task.minutes);
    const lane = taskLaneCounts.get(minuteKey) ?? 0;
    taskLaneCounts.set(minuteKey, lane + 1);
    return { ...task, lane };
  });

  const activeTask = completedTasks.find((task) => task.id === editingTaskId) || null;
  const handleSaveTime = () => {
    if (!activeTask || !editingTime) return;
    const [hours, minutes] = editingTime.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return;
    const base = parseISO(activeTask.completedAt);
    const updated = setTime(base, { hours, minutes, seconds: 0, milliseconds: 0 });
    updateTaskCompletionTime(activeTask.id, updated.toISOString());
    setEditingTaskId(null);
    setEditingPosition(null);
  };

  // Current time indicator
  const now = new Date();
  const nowStartOfDay = new Date(now);
  nowStartOfDay.setHours(START_HOUR, 0, 0, 0);
  const currentMinutes = differenceInMinutes(now, nowStartOfDay);
  const showCurrentTime = currentMinutes >= 0 && currentMinutes <= TOTAL_HOURS * 60;

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-2xl text-bark">Daily Rhythm</h1>
        <p className="text-bark/60 text-sm">{format(new Date(), 'EEEE, MMMM d')}</p>
      </header>

      {/* Legend */}
      {children.filter((c) => c.isNappingAge).length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {children.filter((c) => c.isNappingAge).map((child) => {
            const colors = COLOR_STYLES[child.color || DEFAULT_COLOR];
            return (
              <div key={child.id} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${colors.bg} ${colors.border} border`} />
                <span className="text-sm text-bark/70">{child.name}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline */}
      <div className="bg-parchment rounded-xl p-4 overflow-hidden">
        {beforeWindowTasks.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-bark/50 mb-2">Completed before 6 AM</p>
            <div className="space-y-1">
              {beforeWindowTasks.map((task) => {
                const styles = TASK_TIER_STYLES[task.tier];
                return (
                  <div
                    key={task.id}
                    className={`relative flex items-center justify-between text-xs px-2 py-1 rounded-lg border ${styles.bg} ${styles.border} ${styles.text} cursor-pointer hover:shadow-sm`}
                    onClick={() => {
                      setEditingTaskId(task.id);
                      setEditingTime(format(parseISO(task.completedAt), 'HH:mm'));
                      setEditingPosition(null);
                    }}
                  >
                    <span className="truncate">{task.title}</span>
                    <span className="text-bark/50 ml-2">{task.completedLabel}</span>
                    {editingTaskId === task.id && !editingPosition && (
                      <div className="absolute left-0 top-full mt-2 z-30 bg-cream border border-bark/10 rounded-lg shadow-lg p-3 w-48">
                        <p className="text-xs text-bark/60 mb-2">Adjust completion time</p>
                        <input
                          type="time"
                          value={editingTime}
                          onChange={(e) => setEditingTime(e.target.value)}
                          className="w-full text-sm border border-bark/10 rounded-md px-2 py-1 bg-white mb-2"
                        />
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => {
                              setEditingTaskId(null);
                              setEditingPosition(null);
                            }}
                            className="text-xs text-bark/50 hover:text-bark"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveTime}
                            className="text-xs bg-terracotta text-cream px-2 py-1 rounded-md hover:bg-terracotta/90"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
          {/* Hour lines and labels */}
          {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 flex items-center"
              style={{ top: i * HOUR_HEIGHT }}
            >
              <span className="text-xs text-bark/40 w-14 flex-shrink-0">
                {formatHour(START_HOUR + i)}
              </span>
              <div className="flex-1 border-t border-bark/10" />
            </div>
          ))}

          {/* Scheduled Anchor blocks */}
          {todaysAnchors.map((anchor) => {
            const minutes = timeToMinutes(anchor.scheduledTime!);
            if (minutes < 0 || minutes > TOTAL_HOURS * 60) return null;

            const instance = getAnchorInstance(anchor.id);
            const isCompleted = instance?.status === 'completed';
            const duration = anchor.duration || 30;
            const travelTime = anchor.travelTime || 0;
            const anchorHeight = Math.max(28, (duration / 60) * HOUR_HEIGHT);
            const travelHeight = (travelTime / 60) * HOUR_HEIGHT;
            const anchorTop = (minutes / 60) * HOUR_HEIGHT;
            const travelTop = anchorTop - travelHeight;
            const styles = TASK_TIER_STYLES.anchor;

            const handleToggleComplete = () => {
              if (instance) {
                if (isCompleted) {
                  resetTaskInstance(instance.id);
                } else {
                  completeTask(instance.id);
                }
              }
            };

            return (
              <div key={anchor.id} className="absolute left-14 right-4" style={{ zIndex: 5 }}>
                {/* Travel time block */}
                {travelTime > 0 && travelTop >= 0 && (
                  <div
                    className={`absolute left-0 right-0 px-2 rounded-t border border-b-0 ${
                      isCompleted ? 'bg-bark/5 border-bark/10' : 'bg-bark/10 border-bark/20'
                    }`}
                    style={{
                      top: travelTop,
                      height: travelHeight,
                    }}
                  >
                    <span className={`text-xs truncate block pt-1 ${isCompleted ? 'text-bark/30' : 'text-bark/50'}`}>
                      🚗 {travelTime}m
                    </span>
                  </div>
                )}
                {/* Main anchor block */}
                <div
                  className={`absolute left-0 right-0 px-2 py-1 border cursor-pointer transition-all ${
                    travelTime > 0 ? 'rounded-b' : 'rounded'
                  } ${
                    isCompleted
                      ? 'bg-sage/20 border-sage/30 opacity-60'
                      : `${styles.bg} ${styles.border} hover:shadow-md`
                  }`}
                  style={{
                    top: anchorTop,
                    height: anchorHeight,
                  }}
                  onClick={handleToggleComplete}
                >
                  <div className="flex items-start gap-2">
                    {/* Checkbox */}
                    <div
                      className={`w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        isCompleted
                          ? 'bg-sage border-sage text-cream'
                          : 'border-terracotta/50 hover:border-terracotta'
                      }`}
                    >
                      {isCompleted && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-xs font-medium truncate block ${
                          isCompleted ? 'text-bark/50 line-through' : styles.text
                        }`}
                      >
                        {anchor.title}
                      </span>
                      <span className={`text-xs ${isCompleted ? 'text-bark/30' : 'text-bark/50'}`}>
                        {format(new Date(`2000-01-01T${anchor.scheduledTime}`), 'h:mm a')}
                        {duration && <span className="ml-1">· {duration}m</span>}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Completed tasks */}
          {completedTaskMarkers.map((task) => {
            const top = (task.minutes / 60) * HOUR_HEIGHT;
            const styles = TASK_TIER_STYLES[task.tier];
            const leftOffset = 64 + task.lane * 12;

            return (
              <div
                key={task.id}
                className={`absolute z-20 px-2 py-0.5 rounded-full border ${styles.bg} ${styles.border} ${styles.text} text-xs font-medium shadow-sm cursor-pointer hover:shadow-md`}
                style={{ top, left: leftOffset, transform: 'translateY(-50%)' }}
                onClick={() => {
                  setEditingTaskId(task.id);
                  setEditingTime(format(parseISO(task.completedAt), 'HH:mm'));
                  setEditingPosition({ top, left: leftOffset });
                }}
              >
                <span className="mr-1">✓</span>
                {task.title}
                {task.scheduledTime && <span className="ml-1 opacity-60">{task.scheduledTime}</span>}
              </div>
            );
          })}

          {activeTask && editingPosition && (
            <div
              className="absolute z-30 bg-cream border border-bark/10 rounded-lg shadow-lg p-3 w-48"
              style={{ top: editingPosition.top + 8, left: editingPosition.left + 16 }}
            >
              <p className="text-xs text-bark/60 mb-2">Adjust completion time</p>
              <input
                type="time"
                value={editingTime}
                onChange={(e) => setEditingTime(e.target.value)}
                className="w-full text-sm border border-bark/10 rounded-md px-2 py-1 bg-white mb-2"
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setEditingTaskId(null);
                    setEditingPosition(null);
                  }}
                  className="text-xs text-bark/50 hover:text-bark"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTime}
                  className="text-xs bg-terracotta text-cream px-2 py-1 rounded-md hover:bg-terracotta/90"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Nap columns - one per napping child */}
          {children.filter((c) => c.isNappingAge).map((child, childIndex) => {
            const columnCount = children.filter((c) => c.isNappingAge).length;
            const columnWidth = `calc((100% - 4rem) / ${columnCount})`;
            const columnLeft = `calc(4rem + (100% - 4rem) * ${childIndex} / ${columnCount})`;
            const childNaps = napBlocks.filter((b) => b.childId === child.id);

            return (
              <div
                key={child.id}
                className="absolute top-0 bottom-0"
                style={{ left: columnLeft, width: columnWidth, paddingRight: '4px' }}
              >
                {childNaps.map((block) => {
                  const blockColors = COLOR_STYLES[block.color];
                  const top = (block.startMinutes / 60) * HOUR_HEIGHT;
                  const height = Math.max(
                    24,
                    ((block.endMinutes - block.startMinutes) / 60) * HOUR_HEIGHT
                  );

                  return (
                    <div
                      key={block.id}
                      className={`absolute left-0 right-1 rounded-lg border-2 ${blockColors.bg} ${blockColors.border} ${
                        block.isActive ? 'animate-pulse' : ''
                      } overflow-hidden`}
                      style={{ top, height }}
                    >
                      <div className={`px-2 py-1 text-xs font-medium ${blockColors.text} truncate`}>
                        {block.childName}
                        {block.isActive && ' 💤'}
                      </div>
                      {height > 40 && (
                        <div className={`px-2 text-xs ${blockColors.text} opacity-70`}>
                          {format(parseISO(todaysNaps.find((n) => n.id === block.id)!.startedAt), 'h:mm a')}
                          {!block.isActive && (
                            <>
                              {' - '}
                              {format(parseISO(todaysNaps.find((n) => n.id === block.id)!.endedAt!), 'h:mm a')}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Current time indicator */}
          {showCurrentTime && (
            <div
              className="absolute left-14 right-0 flex items-center z-10"
              style={{ top: (currentMinutes / 60) * HOUR_HEIGHT }}
            >
              <div className="w-2 h-2 rounded-full bg-terracotta" />
              <div className="flex-1 border-t-2 border-terracotta" />
            </div>
          )}
        </div>
        {afterWindowTasks.length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-bark/50 mb-2">Completed after 9 PM</p>
            <div className="space-y-1">
              {afterWindowTasks.map((task) => {
                const styles = TASK_TIER_STYLES[task.tier];
                return (
                  <div
                    key={task.id}
                    className={`relative flex items-center justify-between text-xs px-2 py-1 rounded-lg border ${styles.bg} ${styles.border} ${styles.text} cursor-pointer hover:shadow-sm`}
                    onClick={() => {
                      setEditingTaskId(task.id);
                      setEditingTime(format(parseISO(task.completedAt), 'HH:mm'));
                      setEditingPosition(null);
                    }}
                  >
                    <span className="truncate">{task.title}</span>
                    <span className="text-bark/50 ml-2">{task.completedLabel}</span>
                    {editingTaskId === task.id && !editingPosition && (
                      <div className="absolute left-0 top-full mt-2 z-30 bg-cream border border-bark/10 rounded-lg shadow-lg p-3 w-48">
                        <p className="text-xs text-bark/60 mb-2">Adjust completion time</p>
                        <input
                          type="time"
                          value={editingTime}
                          onChange={(e) => setEditingTime(e.target.value)}
                          className="w-full text-sm border border-bark/10 rounded-md px-2 py-1 bg-white mb-2"
                        />
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => {
                              setEditingTaskId(null);
                              setEditingPosition(null);
                            }}
                            className="text-xs text-bark/50 hover:text-bark"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveTime}
                            className="text-xs bg-terracotta text-cream px-2 py-1 rounded-md hover:bg-terracotta/90"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Empty state */}
      {todaysNaps.length === 0 && (
        <div className="text-center py-8">
          <p className="text-bark/50 text-sm">No naps recorded today yet.</p>
          <p className="text-bark/40 text-xs mt-1">Start a nap from the Today screen.</p>
        </div>
      )}
    </>
  );
}

function WeeklyAnchorTimeline() {
  const tasks = useTaskStore((state) => state.tasks);
  const updateTask = useTaskStore((state) => state.updateTask);
  const addTask = useTaskStore((state) => state.addTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);

  const [editingAnchorId, setEditingAnchorId] = useState<string | null>(null);
  const [editingPosition, setEditingPosition] = useState<{ top: number; left: number } | null>(null);

  const anchors = tasks.filter((t) => t.tier === 'anchor' && t.isActive);
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Current time indicator
  const now = new Date();
  const nowStartOfDay = new Date(now);
  nowStartOfDay.setHours(START_HOUR, 0, 0, 0);
  const currentMinutes = differenceInMinutes(now, nowStartOfDay);
  const showCurrentTime = currentMinutes >= 0 && currentMinutes <= TOTAL_HOURS * 60;

  // Parse time string to minutes from START_HOUR
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours - START_HOUR) * 60 + minutes;
  };

  // Check if anchor should appear on a given day
  const anchorOccursOnDay = (anchor: typeof anchors[0], dayIndex: number): boolean => {
    if (anchor.daysOfWeek == null || anchor.daysOfWeek.length === 0) {
      return true; // No specific days = all days
    }
    return anchor.daysOfWeek.includes(dayIndex);
  };

  // Handle creating a new anchor
  const handleAddAnchor = () => {
    const newId = addTask({
      type: 'standard',
      title: 'New anchor',
      tier: 'anchor',
      scheduledTime: '09:00',
      recurrence: 'daily',
      napContext: null,
      isActive: true,
      category: 'other',
      daysOfWeek: null,
      duration: 30,
      travelTime: 0,
    });
    setEditingAnchorId(newId);
    // Position editor near center
    setEditingPosition({ top: 150, left: 100 });
  };

  const editingAnchor = anchors.find((a) => a.id === editingAnchorId);

  return (
    <>
      <header className="mb-6">
        <h1 className="font-display text-2xl text-bark">Weekly Anchors</h1>
        <p className="text-bark/60 text-sm">
          {format(weekStart, 'MMM d')}–{format(weekEnd, 'MMM d')}
        </p>
      </header>

      {/* Weekly Timeline Grid */}
      <div className="bg-parchment rounded-xl p-2 overflow-x-auto">
        {/* Day headers */}
        <div className="grid grid-cols-8 gap-0.5 mb-1">
          <div className="w-12" /> {/* Hour label column */}
          {weekDays.map((day, index) => (
            <div
              key={index}
              className={`text-center py-2 rounded-t-lg ${
                isToday(day) ? 'bg-sage/20' : ''
              }`}
            >
              <span
                className={`text-xs font-semibold ${
                  isToday(day) ? 'text-sage' : 'text-bark/50'
                }`}
              >
                {DAY_LABELS[index]}
              </span>
              <span
                className={`block text-sm font-display ${
                  isToday(day) ? 'text-sage' : 'text-bark'
                }`}
              >
                {format(day, 'd')}
              </span>
            </div>
          ))}
        </div>

        {/* Timeline body */}
        <div className="relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
          {/* Grid structure with hour lines */}
          <div className="grid grid-cols-8 gap-0.5 h-full">
            {/* Hour labels column */}
            <div className="relative w-12">
              {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 flex items-center"
                  style={{ top: i * HOUR_HEIGHT }}
                >
                  <span className="text-xs text-bark/40 pr-1">{formatHour(START_HOUR + i)}</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={`relative border-l border-bark/10 ${
                  isToday(day) ? 'bg-sage/5' : ''
                }`}
              >
                {/* Hour lines */}
                {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 border-t border-bark/10"
                    style={{ top: i * HOUR_HEIGHT }}
                  />
                ))}

                {/* Current time indicator for today */}
                {isToday(day) && showCurrentTime && (
                  <div
                    className="absolute left-0 right-0 z-20 flex items-center"
                    style={{ top: (currentMinutes / 60) * HOUR_HEIGHT }}
                  >
                    <div className="w-2 h-2 rounded-full bg-terracotta -ml-1" />
                    <div className="flex-1 border-t-2 border-terracotta" />
                  </div>
                )}

                {/* Anchor blocks for this day */}
                {anchors
                  .filter((anchor) => anchor.scheduledTime && anchorOccursOnDay(anchor, dayIndex))
                  .map((anchor) => {
                    const minutes = timeToMinutes(anchor.scheduledTime!);
                    if (minutes < 0 || minutes > TOTAL_HOURS * 60) return null;

                    const duration = anchor.duration || 30; // default 30 min
                    const travelTime = anchor.travelTime || 0;
                    const anchorHeight = Math.max(24, (duration / 60) * HOUR_HEIGHT);
                    const travelHeight = (travelTime / 60) * HOUR_HEIGHT;
                    const anchorTop = (minutes / 60) * HOUR_HEIGHT;
                    const travelTop = anchorTop - travelHeight;
                    const styles = TASK_TIER_STYLES.anchor;

                    const handleClick = (e: React.MouseEvent) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setEditingAnchorId(anchor.id);
                      setEditingPosition({
                        top: rect.top - 100,
                        left: rect.left,
                      });
                    };

                    return (
                      <div key={anchor.id}>
                        {/* Travel time block */}
                        {travelTime > 0 && travelTop >= 0 && (
                          <div
                            className="absolute left-0.5 right-0.5 z-9 px-1 rounded-t border border-b-0 cursor-pointer bg-bark/5 border-bark/20"
                            style={{
                              top: travelTop,
                              height: travelHeight,
                            }}
                            onClick={handleClick}
                          >
                            {/* Mobile: just car icon, Desktop: full text */}
                            <span className="text-xs text-bark/40 truncate block pt-0.5">
                              <span className="sm:hidden">🚗</span>
                              <span className="hidden sm:inline">🚗 {travelTime}m</span>
                            </span>
                          </div>
                        )}
                        {/* Main anchor block */}
                        <div
                          className={`absolute left-0.5 right-0.5 z-10 px-1 py-0.5 border cursor-pointer transition-shadow hover:shadow-md overflow-hidden ${styles.bg} ${styles.border} ${
                            travelTime > 0 ? 'rounded-b' : 'rounded'
                          }`}
                          style={{
                            top: anchorTop,
                            height: anchorHeight,
                          }}
                          onClick={handleClick}
                        >
                          {/* Mobile: truncated title only, Desktop: title + time */}
                          <span className={`text-xs font-medium truncate block ${styles.text}`}>
                            {anchor.title}
                          </span>
                          <span className="hidden sm:block text-xs text-bark/50">
                            {format(
                              new Date(`2000-01-01T${anchor.scheduledTime}`),
                              'h:mma'
                            ).toLowerCase()}
                            {duration && <span className="ml-1">· {duration}m</span>}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Inline Anchor Editor Popover */}
      {editingAnchor && editingPosition && (
        <div
          className="fixed z-50 bg-cream border border-bark/20 rounded-xl shadow-xl p-4 w-72"
          style={{
            top: Math.max(20, Math.min(editingPosition.top, window.innerHeight - 350)),
            left: Math.max(20, Math.min(editingPosition.left, window.innerWidth - 300)),
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-bark">Edit Anchor</h3>
            <button
              onClick={() => {
                setEditingAnchorId(null);
                setEditingPosition(null);
              }}
              className="text-bark/40 hover:text-bark p-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Title input */}
          <div className="mb-3">
            <label className="text-xs text-bark/50 block mb-1">Title</label>
            <input
              type="text"
              value={editingAnchor.title}
              onChange={(e) => updateTask(editingAnchor.id, { title: e.target.value })}
              className="w-full bg-parchment rounded-lg px-3 py-2 text-sm text-bark border border-bark/10 focus:outline-none focus:border-sage"
            />
          </div>

          {/* Time picker */}
          <div className="mb-3">
            <label className="text-xs text-bark/50 block mb-1">Scheduled Time</label>
            <input
              type="time"
              value={editingAnchor.scheduledTime || '09:00'}
              onChange={(e) => updateTask(editingAnchor.id, { scheduledTime: e.target.value || null })}
              className="w-full bg-parchment rounded-lg px-3 py-2 text-sm text-bark border border-bark/10 focus:outline-none focus:border-sage"
            />
          </div>

          {/* Duration and Travel Time */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-xs text-bark/50 block mb-1">Duration (min)</label>
              <input
                type="number"
                min="5"
                max="480"
                step="5"
                value={editingAnchor.duration || 30}
                onChange={(e) => updateTask(editingAnchor.id, { duration: parseInt(e.target.value) || 30 })}
                className="w-full bg-parchment rounded-lg px-3 py-2 text-sm text-bark border border-bark/10 focus:outline-none focus:border-sage"
              />
            </div>
            <div>
              <label className="text-xs text-bark/50 block mb-1">Travel (min)</label>
              <input
                type="number"
                min="0"
                max="180"
                step="5"
                value={editingAnchor.travelTime || 0}
                onChange={(e) => updateTask(editingAnchor.id, { travelTime: parseInt(e.target.value) || 0 })}
                className="w-full bg-parchment rounded-lg px-3 py-2 text-sm text-bark border border-bark/10 focus:outline-none focus:border-sage"
              />
            </div>
          </div>

          {/* Day-of-week toggles */}
          <div className="mb-4">
            <label className="text-xs text-bark/50 block mb-2">Days of Week</label>
            <div className="flex gap-1">
              {DAY_LABELS.map((label, index) => {
                const isSelected =
                  editingAnchor.daysOfWeek == null ||
                  editingAnchor.daysOfWeek.length === 0 ||
                  editingAnchor.daysOfWeek.includes(index);

                const toggleDay = () => {
                  let newDays: number[] | null;
                  if (editingAnchor.daysOfWeek == null || editingAnchor.daysOfWeek.length === 0) {
                    // Currently "all days" - switching to exclude this day
                    newDays = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== index);
                  } else if (isSelected) {
                    // Remove this day
                    newDays = editingAnchor.daysOfWeek.filter((d) => d !== index);
                    // If no days left, set to null (all days)
                    if (newDays.length === 0) newDays = null;
                  } else {
                    // Add this day
                    newDays = [...editingAnchor.daysOfWeek, index].sort();
                    // If all days selected, set to null
                    if (newDays.length === 7) newDays = null;
                  }
                  updateTask(editingAnchor.id, { daysOfWeek: newDays });
                };

                return (
                  <button
                    key={index}
                    onClick={toggleDay}
                    className={`w-8 h-8 rounded-full text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'bg-terracotta text-cream'
                        : 'bg-parchment text-bark/40 hover:text-bark'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-bark/10">
            <button
              onClick={() => {
                deleteTask(editingAnchor.id);
                setEditingAnchorId(null);
                setEditingPosition(null);
              }}
              className="text-red-500 hover:text-red-600 text-sm font-medium"
            >
              Delete
            </button>
            <button
              onClick={() => {
                setEditingAnchorId(null);
                setEditingPosition(null);
              }}
              className="bg-sage text-cream px-4 py-2 rounded-lg text-sm font-medium hover:bg-sage/90"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Backdrop when editing */}
      {editingAnchorId && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setEditingAnchorId(null);
            setEditingPosition(null);
          }}
        />
      )}

      {/* Add anchor button */}
      <button
        onClick={handleAddAnchor}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-terracotta text-cream shadow-lg hover:bg-terracotta/90 flex items-center justify-center z-30"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </>
  );
}

export function DailyRhythm() {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily');

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto p-4 pb-24">
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              viewMode === 'daily'
                ? 'bg-sage text-cream'
                : 'bg-parchment text-bark/60 hover:text-bark'
            }`}
          >
            Timeline
          </button>
          <button
            onClick={() => setViewMode('weekly')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              viewMode === 'weekly'
                ? 'bg-sage text-cream'
                : 'bg-parchment text-bark/60 hover:text-bark'
            }`}
          >
            Weekly
          </button>
        </div>

        {viewMode === 'daily' && <DailyTimelineView />}
        {viewMode === 'weekly' && <WeeklyAnchorTimeline />}
      </div>
    </div>
  );
}
