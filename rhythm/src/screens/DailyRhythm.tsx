import { format, parseISO, differenceInMinutes } from 'date-fns';
import { useChildStore } from '../stores/useChildStore';
import { useNapStore } from '../stores/useNapStore';
import { useTaskStore } from '../stores/useTaskStore';
import type { ChildColor, TaskTier } from '../types';

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

export function DailyRhythm() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const children = useChildStore((state) => state.children);
  const napLogs = useNapStore((state) => state.napLogs);
  const tasks = useTaskStore((state) => state.tasks);
  const taskInstances = useTaskStore((state) => state.taskInstances);

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

  // Current time indicator
  const now = new Date();
  const nowStartOfDay = new Date(now);
  nowStartOfDay.setHours(START_HOUR, 0, 0, 0);
  const currentMinutes = differenceInMinutes(now, nowStartOfDay);
  const showCurrentTime = currentMinutes >= 0 && currentMinutes <= TOTAL_HOURS * 60;

  return (
    <div className="min-h-screen bg-cream p-4 pb-24">
      <header className="mb-6">
        <h1 className="font-display text-2xl text-bark">Daily Rhythm</h1>
        <p className="text-bark/60 text-sm">{format(new Date(), 'EEEE, MMMM d')}</p>
      </header>

      {/* Legend */}
      {children.filter(c => c.isNappingAge).length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {children.filter(c => c.isNappingAge).map((child) => {
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
                    className={`flex items-center justify-between text-xs px-2 py-1 rounded-lg border ${styles.bg} ${styles.border} ${styles.text}`}
                  >
                    <span className="truncate">{task.title}</span>
                    <span className="text-bark/50 ml-2">{task.completedLabel}</span>
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

          {/* Completed tasks */}
          {completedTaskMarkers.map((task) => {
            const top = (task.minutes / 60) * HOUR_HEIGHT;
            const styles = TASK_TIER_STYLES[task.tier];
            const leftOffset = 64 + task.lane * 12;

            return (
              <div
                key={task.id}
                className={`absolute z-20 pointer-events-none px-2 py-0.5 rounded-full border ${styles.bg} ${styles.border} ${styles.text} text-xs font-medium shadow-sm`}
                style={{ top, left: leftOffset, transform: 'translateY(-50%)' }}
              >
                <span className="mr-1">✓</span>
                {task.title}
                {task.scheduledTime && <span className="ml-1 opacity-60">{task.scheduledTime}</span>}
              </div>
            );
          })}

          {/* Nap columns - one per napping child */}
          {children.filter(c => c.isNappingAge).map((child, childIndex) => {
            const columnCount = children.filter(c => c.isNappingAge).length;
            const columnWidth = `calc((100% - 4rem) / ${columnCount})`;
            const columnLeft = `calc(4rem + (100% - 4rem) * ${childIndex} / ${columnCount})`;
            const childNaps = napBlocks.filter(b => b.childId === child.id);

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
                          {format(parseISO(todaysNaps.find(n => n.id === block.id)!.startedAt), 'h:mm a')}
                          {!block.isActive && (
                            <> – {format(parseISO(todaysNaps.find(n => n.id === block.id)!.endedAt!), 'h:mm a')}</>
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
                    className={`flex items-center justify-between text-xs px-2 py-1 rounded-lg border ${styles.bg} ${styles.border} ${styles.text}`}
                  >
                    <span className="truncate">{task.title}</span>
                    <span className="text-bark/50 ml-2">{task.completedLabel}</span>
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
    </div>
  );
}
