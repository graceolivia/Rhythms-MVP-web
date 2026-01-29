import { useState } from 'react';
import { format, parseISO, differenceInMinutes, addDays } from 'date-fns';
import { useChildStore } from '../stores/useChildStore';
import { useNapStore } from '../stores/useNapStore';
import { useAwayStore } from '../stores/useAwayStore';
import type { ChildColor } from '../types';

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

function formatHour(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

function formatDuration(startedAt: string, endedAt: string | null): string {
  const start = new Date(startedAt);
  const end = endedAt ? new Date(endedAt) : new Date();
  const minutes = Math.floor((end.getTime() - start.getTime()) / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

interface SleepBlock {
  id: string;
  childId: string;
  childName: string;
  startMinutes: number;
  endMinutes: number;
  isActive: boolean;
  color: ChildColor;
  sleepType?: 'nap' | 'night';
  startedAt: string;
  endedAt: string | null;
}

interface AwayBlockData {
  id: string;
  childId: string;
  childName: string;
  startMinutes: number;
  endMinutes: number;
  isActive: boolean;
  scheduleName?: string;
  startedAt: string;
  endedAt: string | null;
}

function SleepLogPopup({
  block,
  onClose,
  onUpdate,
  onDelete,
}: {
  block: SleepBlock;
  onClose: () => void;
  onUpdate: (logId: string, updates: { startedAt?: string; endedAt?: string }) => void;
  onDelete: (logId: string) => void;
}) {
  const [startTime, setStartTime] = useState(() => {
    const date = new Date(block.startedAt);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  });
  const [endTime, setEndTime] = useState(() => {
    if (!block.endedAt) return '';
    const date = new Date(block.endedAt);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOngoing = block.endedAt === null;
  const sleepEmoji = block.sleepType === 'night' ? '🌙' : '💤';
  const sleepLabel = block.sleepType === 'night' ? 'Night Sleep' : 'Nap';
  const duration = formatDuration(block.startedAt, block.endedAt);

  const handleSave = () => {
    const updates: { startedAt?: string; endedAt?: string } = {};

    const [startH, startM] = startTime.split(':').map(Number);
    const startDate = new Date(block.startedAt);
    startDate.setHours(startH, startM, 0, 0);
    updates.startedAt = startDate.toISOString();

    if (endTime && !isOngoing) {
      const [endH, endM] = endTime.split(':').map(Number);
      const endDate = new Date(block.endedAt || block.startedAt);
      endDate.setHours(endH, endM, 0, 0);
      updates.endedAt = endDate.toISOString();
    }

    onUpdate(block.id, updates);
    onClose();
  };

  const handleDelete = () => {
    onDelete(block.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4" onClick={onClose}>
      <div
        className="bg-cream rounded-xl shadow-xl p-4 w-full max-w-sm border border-bark/10"
        onClick={(e) => e.stopPropagation()}
      >
        {showDeleteConfirm ? (
          <div className="text-center py-2">
            <p className="text-bark mb-4">Delete this sleep log?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-bark/10 text-bark hover:bg-bark/20"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{sleepEmoji}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-lavender/20 text-lavender">
                    {sleepLabel}
                  </span>
                  {isOngoing && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-lavender/30 text-lavender animate-pulse">
                      Ongoing
                    </span>
                  )}
                </div>
                <h3 className="font-medium text-bark">{block.childName}</h3>
                <p className="text-sm text-bark/50">{duration}</p>
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

            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-bark/60 block mb-1">Start time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-white focus:outline-none focus:border-lavender"
                />
              </div>
              {!isOngoing && (
                <div>
                  <label className="text-xs text-bark/60 block mb-1">End time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-bark/20 bg-white focus:outline-none focus:border-lavender"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-lg text-red-500 hover:bg-red-50 text-sm"
              >
                Delete
              </button>
              <div className="flex-1" />
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-bark/10 text-bark hover:bg-bark/20 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-lavender text-white hover:bg-lavender/90 text-sm"
              >
                Save
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Timeline() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const children = useChildStore((state) => state.children);
  const napLogs = useNapStore((state) => state.napLogs);
  const awayLogs = useAwayStore((state) => state.awayLogs);
  const updateNapLog = useNapStore((state) => state.updateNapLog);
  const deleteNapLog = useNapStore((state) => state.deleteNapLog);
  const [selectedSleepLogId, setSelectedSleepLogId] = useState<string | null>(null);

  // Get today's sleep logs (naps and night sleep)
  const todaysSleepLogs = napLogs.filter((log) => {
    if (log.date === today) return true;
    if (log.endedAt && format(parseISO(log.endedAt), 'yyyy-MM-dd') === today) return true;
    if (!log.endedAt) {
      const startDate = format(parseISO(log.startedAt), 'yyyy-MM-dd');
      const yesterday = format(addDays(new Date(), -1), 'yyyy-MM-dd');
      if (startDate === yesterday) return true;
    }
    return false;
  });

  // Get today's away logs
  const todaysAwayLogs = awayLogs.filter((log) => {
    if (log.date === today) return true;
    if (log.endedAt && format(parseISO(log.endedAt), 'yyyy-MM-dd') === today) return true;
    return false;
  });

  // Convert sleep logs to blocks
  const sleepBlocks: SleepBlock[] = todaysSleepLogs.map((log) => {
    const child = children.find((c) => c.id === log.childId);
    const startTime = parseISO(log.startedAt);
    const endTime = log.endedAt ? parseISO(log.endedAt) : new Date();

    const startOfDay = new Date(startTime);
    startOfDay.setHours(START_HOUR, 0, 0, 0);

    const startMinutes = differenceInMinutes(startTime, startOfDay);
    const endMinutes = differenceInMinutes(endTime, startOfDay);

    return {
      id: log.id,
      childId: log.childId,
      childName: child?.name || 'Unknown',
      startMinutes: Math.max(0, startMinutes),
      endMinutes: Math.min(TOTAL_HOURS * 60, endMinutes),
      isActive: log.endedAt === null,
      color: child?.color || DEFAULT_COLOR,
      sleepType: log.sleepType,
      startedAt: log.startedAt,
      endedAt: log.endedAt,
    };
  });

  // Convert away logs to blocks
  const awayBlocks: AwayBlockData[] = todaysAwayLogs.map((log) => {
    const child = children.find((c) => c.id === log.childId);
    const startTime = parseISO(log.startedAt);
    const endTime = log.endedAt ? parseISO(log.endedAt) : new Date();

    const startOfDay = new Date(startTime);
    startOfDay.setHours(START_HOUR, 0, 0, 0);

    const startMinutes = differenceInMinutes(startTime, startOfDay);
    const endMinutes = differenceInMinutes(endTime, startOfDay);

    return {
      id: log.id,
      childId: log.childId,
      childName: child?.name || 'Unknown',
      startMinutes: Math.max(0, startMinutes),
      endMinutes: Math.min(TOTAL_HOURS * 60, endMinutes),
      isActive: log.endedAt === null,
      scheduleName: log.scheduleName,
      startedAt: log.startedAt,
      endedAt: log.endedAt,
    };
  });

  // Current time indicator
  const now = new Date();
  const nowStartOfDay = new Date(now);
  nowStartOfDay.setHours(START_HOUR, 0, 0, 0);
  const currentMinutes = differenceInMinutes(now, nowStartOfDay);
  const showCurrentTime = currentMinutes >= 0 && currentMinutes <= TOTAL_HOURS * 60;

  // Get selected sleep block for popup
  const selectedSleepBlock = selectedSleepLogId
    ? sleepBlocks.find((b) => b.id === selectedSleepLogId)
    : null;

  // Get unique children with sleep or away blocks for column layout
  const childIdsWithBlocks = [...new Set([
    ...sleepBlocks.map(b => b.childId),
    ...awayBlocks.map(b => b.childId),
  ])];
  const numColumns = childIdsWithBlocks.length || 1;
  const childColumnIndex = new Map(childIdsWithBlocks.map((id, idx) => [id, idx]));

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-lg mx-auto p-4 pb-24">
        <header className="mb-6">
          <h1 className="font-display text-2xl text-bark">Timeline</h1>
          <p className="text-bark/60 text-sm">{format(new Date(), 'EEEE, MMMM d')}</p>
        </header>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-lavender/40 border border-lavender" />
            <span className="text-sm text-bark/70">Sleep</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-sage/30 border border-sage" />
            <span className="text-sm text-bark/70">Away</span>
          </div>
        </div>

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

            {/* Sleep blocks - in columns by child */}
            {sleepBlocks.map((block) => {
              const top = (block.startMinutes / 60) * HOUR_HEIGHT;
              const height = Math.max(24, ((block.endMinutes - block.startMinutes) / 60) * HOUR_HEIGHT);
              const colors = COLOR_STYLES[block.color];
              const isSelected = selectedSleepLogId === block.id;
              const sleepEmoji = block.sleepType === 'night' ? '🌙' : '💤';

              // Column positioning
              const colIndex = childColumnIndex.get(block.childId) || 0;

              return (
                <button
                  key={block.id}
                  onClick={() => setSelectedSleepLogId(isSelected ? null : block.id)}
                  className={`absolute rounded-lg border-2 ${colors.bg} ${colors.border} overflow-hidden text-left transition-all cursor-pointer z-10 ${
                    block.isActive ? 'animate-pulse' : ''
                  } ${isSelected ? 'ring-2 ring-offset-2 ring-lavender/50 scale-[1.02]' : 'hover:scale-[1.01] hover:brightness-105'}`}
                  style={{
                    top,
                    height,
                    left: `calc(3.5rem + (100% - 4.5rem) * ${colIndex} / ${numColumns})`,
                    width: `calc((100% - 4.5rem) / ${numColumns} - 4px)`,
                  }}
                >
                  <div className={`px-2 py-1 text-xs font-medium ${colors.text} truncate flex items-center gap-1`}>
                    <span>{sleepEmoji}</span>
                    <span>{block.childName}</span>
                    {block.isActive && <span className="text-bark/50">sleeping</span>}
                  </div>
                  {height > 40 && (
                    <div className={`px-2 text-xs ${colors.text} opacity-70`}>
                      {format(parseISO(block.startedAt), 'h:mm a')}
                      {!block.isActive && block.endedAt && (
                        <> - {format(parseISO(block.endedAt), 'h:mm a')}</>
                      )}
                    </div>
                  )}
                </button>
              );
            })}

            {/* Away blocks - in columns by child */}
            {awayBlocks.map((block) => {
              const top = (block.startMinutes / 60) * HOUR_HEIGHT;
              const height = Math.max(24, ((block.endMinutes - block.startMinutes) / 60) * HOUR_HEIGHT);

              // Column positioning
              const colIndex = childColumnIndex.get(block.childId) || 0;

              return (
                <div
                  key={block.id}
                  className={`absolute rounded-lg border-2 bg-sage/30 border-sage overflow-hidden z-5 ${
                    block.isActive ? 'animate-pulse' : ''
                  }`}
                  style={{
                    top,
                    height,
                    left: `calc(3.5rem + (100% - 4.5rem) * ${colIndex} / ${numColumns})`,
                    width: `calc((100% - 4.5rem) / ${numColumns} - 4px)`,
                  }}
                >
                  <div className="px-2 py-1 text-xs font-medium text-sage truncate flex items-center gap-1">
                    <span>🚗</span>
                    <span>{block.childName}</span>
                    {block.scheduleName && <span className="text-bark/50">at {block.scheduleName}</span>}
                    {block.isActive && <span className="text-bark/50">away</span>}
                  </div>
                  {height > 40 && (
                    <div className="px-2 text-xs text-sage opacity-70">
                      {format(parseISO(block.startedAt), 'h:mm a')}
                      {!block.isActive && block.endedAt && (
                        <> - {format(parseISO(block.endedAt), 'h:mm a')}</>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Current time indicator */}
            {showCurrentTime && (
              <div
                className="absolute left-14 right-0 flex items-center z-20"
                style={{ top: (currentMinutes / 60) * HOUR_HEIGHT }}
              >
                <div className="w-2 h-2 rounded-full bg-terracotta" />
                <div className="flex-1 border-t-2 border-terracotta" />
              </div>
            )}
          </div>
        </div>

        {/* Empty state */}
        {sleepBlocks.length === 0 && awayBlocks.length === 0 && (
          <div className="text-center py-8">
            <p className="text-bark/50 text-sm">No sleep or away logs recorded today yet.</p>
            <p className="text-bark/40 text-xs mt-1">Start a nap or mark away from the Today screen.</p>
          </div>
        )}
      </div>

      {/* Sleep log popup */}
      {selectedSleepBlock && (
        <SleepLogPopup
          block={selectedSleepBlock}
          onClose={() => setSelectedSleepLogId(null)}
          onUpdate={(logId, updates) => updateNapLog(logId, updates)}
          onDelete={(logId) => deleteNapLog(logId)}
        />
      )}
    </div>
  );
}
