import { format, parseISO, differenceInMinutes } from 'date-fns';
import { useChildStore } from '../stores/useChildStore';
import { useNapStore } from '../stores/useNapStore';

// Timeline config
const START_HOUR = 6; // 6 AM
const END_HOUR = 21; // 9 PM
const TOTAL_HOURS = END_HOUR - START_HOUR;
const HOUR_HEIGHT = 48; // pixels per hour

// Colors for different children
const CHILD_COLORS = [
  { bg: 'bg-lavender/60', border: 'border-lavender', text: 'text-purple-900' },
  { bg: 'bg-sage/60', border: 'border-sage', text: 'text-green-900' },
  { bg: 'bg-skyblue/60', border: 'border-skyblue', text: 'text-blue-900' },
  { bg: 'bg-dustyrose/60', border: 'border-dustyrose', text: 'text-rose-900' },
];

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
  colorIndex: number;
}

export function DailyRhythm() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const children = useChildStore((state) => state.children);
  const napLogs = useNapStore((state) => state.napLogs);

  // Get today's naps
  const todaysNaps = napLogs.filter((log) => log.date === today);

  // Build child color map
  const childColorMap = new Map<string, number>();
  children.forEach((child, index) => {
    childColorMap.set(child.id, index % CHILD_COLORS.length);
  });

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
      colorIndex: childColorMap.get(nap.childId) || 0,
    };
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
            const colorIndex = childColorMap.get(child.id) || 0;
            const colors = CHILD_COLORS[colorIndex];
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

          {/* Nap columns - one per napping child */}
          {children.filter(c => c.isNappingAge).map((child, childIndex) => {
            const columnCount = children.filter(c => c.isNappingAge).length;
            const columnWidth = `calc((100% - 4rem) / ${columnCount})`;
            const columnLeft = `calc(4rem + (100% - 4rem) * ${childIndex} / ${columnCount})`;
            const colorIndex = childColorMap.get(child.id) || 0;
            const colors = CHILD_COLORS[colorIndex];
            const childNaps = napBlocks.filter(b => b.childId === child.id);

            return (
              <div
                key={child.id}
                className="absolute top-0 bottom-0"
                style={{ left: columnLeft, width: columnWidth, paddingRight: '4px' }}
              >
                {childNaps.map((block) => {
                  const top = (block.startMinutes / 60) * HOUR_HEIGHT;
                  const height = Math.max(
                    24,
                    ((block.endMinutes - block.startMinutes) / 60) * HOUR_HEIGHT
                  );

                  return (
                    <div
                      key={block.id}
                      className={`absolute left-0 right-1 rounded-lg border-2 ${colors.bg} ${colors.border} ${
                        block.isActive ? 'animate-pulse' : ''
                      } overflow-hidden`}
                      style={{ top, height }}
                    >
                      <div className={`px-2 py-1 text-xs font-medium ${colors.text} truncate`}>
                        {block.childName}
                        {block.isActive && ' 💤'}
                      </div>
                      {height > 40 && (
                        <div className={`px-2 text-xs ${colors.text} opacity-70`}>
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
