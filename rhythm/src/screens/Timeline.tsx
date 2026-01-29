import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, addDays, subDays } from 'date-fns';
import { useNapStore } from '../stores/useNapStore';
import { useAwayStore } from '../stores/useAwayStore';
import { useChildStore } from '../stores/useChildStore';

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
 * Format time for display
 */
function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return m === 0 ? `${hour12}${ampm}` : `${hour12}:${String(m).padStart(2, '0')}${ampm}`;
}

/**
 * Calculate duration string from start and end times
 */
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

/**
 * Convert ISO timestamp to HH:mm, clipped to timeline bounds
 */
function isoToTimeString(isoString: string, clipStart: number, clipEnd: number): string {
  const date = new Date(isoString);
  const hours = date.getHours();
  const minutes = date.getMinutes();

  // Clip to timeline bounds
  if (hours < clipStart) {
    return `${String(clipStart).padStart(2, '0')}:00`;
  }
  if (hours >= clipEnd) {
    return `${String(clipEnd).padStart(2, '0')}:00`;
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

interface ActualSleepBlockProps {
  childName: string;
  startedAt: string;
  endedAt: string | null;
  sleepType?: 'nap' | 'night';
  isSelected?: boolean;
  onClick?: () => void;
}

function ActualSleepBlock({ childName, startedAt, endedAt, sleepType, isSelected, onClick }: ActualSleepBlockProps) {
  const isOngoing = endedAt === null;
  const sleepEmoji = sleepType === 'night' ? '🌙' : '💤';

  // Convert ISO timestamps to timeline times, clipped to bounds
  const startTime = isoToTimeString(startedAt, TIMELINE_START_HOUR, TIMELINE_END_HOUR);
  const endTime = endedAt
    ? isoToTimeString(endedAt, TIMELINE_START_HOUR, TIMELINE_END_HOUR)
    : isoToTimeString(new Date().toISOString(), TIMELINE_START_HOUR, TIMELINE_END_HOUR);

  const top = timeToPixels(startTime);
  const height = getHeightForTimeRange(startTime, endTime);
  const duration = formatDuration(startedAt, endedAt);

  // Don't render if completely outside timeline bounds
  if (height <= 0) return null;

  return (
    <button
      onClick={onClick}
      className={`absolute left-16 right-4 rounded-lg border-2 border-lavender bg-lavender/40 overflow-hidden text-left transition-all cursor-pointer z-10 ${
        isOngoing ? 'animate-pulse' : ''
      } ${isSelected ? 'ring-2 ring-offset-2 ring-lavender/50 scale-[1.02]' : 'hover:scale-[1.01] hover:bg-lavender/50'}`}
      style={{ top, height: Math.max(height, 24) }}
    >
      <div className="px-3 py-1 h-full flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <span>{sleepEmoji}</span>
          <span className="font-medium text-sm text-lavender">{childName}</span>
          <span className="text-xs text-lavender/80">{duration}</span>
          {isOngoing && (
            <span className="text-xs bg-lavender/30 px-1.5 py-0.5 rounded-full text-lavender">
              sleeping
            </span>
          )}
        </div>
        {height > 40 && (
          <div className="text-xs text-bark/50 mt-1">
            {formatTime(startTime)} - {isOngoing ? 'now' : formatTime(endTime)}
          </div>
        )}
      </div>
    </button>
  );
}

interface SleepLogPopupProps {
  log: {
    id: string;
    childName: string;
    startedAt: string;
    endedAt: string | null;
    sleepType?: 'nap' | 'night';
  };
  onClose: () => void;
  onUpdate: (logId: string, updates: { startedAt?: string; endedAt?: string }) => void;
  onDelete: (logId: string) => void;
}

function SleepLogPopup({ log, onClose, onUpdate, onDelete }: SleepLogPopupProps) {
  const [startTime, setStartTime] = useState(() => {
    const date = new Date(log.startedAt);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  });
  const [endTime, setEndTime] = useState(() => {
    if (!log.endedAt) return '';
    const date = new Date(log.endedAt);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOngoing = log.endedAt === null;
  const sleepEmoji = log.sleepType === 'night' ? '🌙' : '💤';
  const sleepLabel = log.sleepType === 'night' ? 'Night Sleep' : 'Nap';
  const duration = formatDuration(log.startedAt, log.endedAt);

  const handleSave = () => {
    const updates: { startedAt?: string; endedAt?: string } = {};

    // Parse start time
    const [startH, startM] = startTime.split(':').map(Number);
    const startDate = new Date(log.startedAt);
    startDate.setHours(startH, startM, 0, 0);
    updates.startedAt = startDate.toISOString();

    // Parse end time if provided and not ongoing
    if (endTime && !isOngoing) {
      const [endH, endM] = endTime.split(':').map(Number);
      const endDate = new Date(log.endedAt || log.startedAt);
      endDate.setHours(endH, endM, 0, 0);
      updates.endedAt = endDate.toISOString();
    }

    onUpdate(log.id, updates);
    onClose();
  };

  const handleDelete = () => {
    onDelete(log.id);
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
                <h3 className="font-medium text-bark">{log.childName}</h3>
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

            {/* Edit times */}
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

            {/* Actions */}
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

interface AwayBlockProps {
  childName: string;
  startedAt: string;
  endedAt: string | null;
  scheduleName?: string;
}

function AwayBlock({ childName, startedAt, endedAt, scheduleName }: AwayBlockProps) {
  const isOngoing = endedAt === null;

  // Convert ISO timestamps to timeline times, clipped to bounds
  const startTime = isoToTimeString(startedAt, TIMELINE_START_HOUR, TIMELINE_END_HOUR);
  const endTime = endedAt
    ? isoToTimeString(endedAt, TIMELINE_START_HOUR, TIMELINE_END_HOUR)
    : isoToTimeString(new Date().toISOString(), TIMELINE_START_HOUR, TIMELINE_END_HOUR);

  const top = timeToPixels(startTime);
  const height = getHeightForTimeRange(startTime, endTime);
  const duration = formatDuration(startedAt, endedAt);

  // Don't render if completely outside timeline bounds
  if (height <= 0) return null;

  return (
    <div
      className={`absolute left-16 right-4 rounded-lg border-2 border-sage bg-sage/30 overflow-hidden ${
        isOngoing ? 'animate-pulse' : ''
      }`}
      style={{ top, height: Math.max(height, 24) }}
    >
      <div className="px-3 py-1 h-full flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <span>🚗</span>
          <span className="font-medium text-sm text-sage">{childName}</span>
          {scheduleName && (
            <span className="text-xs text-sage/70">at {scheduleName}</span>
          )}
          <span className="text-xs text-sage/80">{duration}</span>
          {isOngoing && (
            <span className="text-xs bg-sage/30 px-1.5 py-0.5 rounded-full text-sage">
              away
            </span>
          )}
        </div>
        {height > 40 && (
          <div className="text-xs text-bark/50 mt-1">
            {formatTime(startTime)} - {isOngoing ? 'now' : formatTime(endTime)}
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
  const [selectedSleepLogId, setSelectedSleepLogId] = useState<string | null>(null);

  const getLogsForTimelineDate = useNapStore((state) => state.getLogsForTimelineDate);
  const updateNapLog = useNapStore((state) => state.updateNapLog);
  const deleteNapLog = useNapStore((state) => state.deleteNapLog);
  const getAwayLogsForTimelineDate = useAwayStore((state) => state.getLogsForTimelineDate);
  const children = useChildStore((state) => state.children);

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

  // Get data for selected date
  const { sleepLogs, awayLogs } = useMemo(() => {
    // Get actual sleep logs for this date
    const logsForDate = getLogsForTimelineDate(dateStr);
    const sleepLogsWithNames = logsForDate.map(log => {
      const child = children.find(c => c.id === log.childId);
      return {
        ...log,
        childName: child?.name || 'Child',
      };
    });

    // Get away logs for this date
    const awayLogsForDate = getAwayLogsForTimelineDate(dateStr);
    const awayLogsWithNames = awayLogsForDate.map(log => {
      const child = children.find(c => c.id === log.childId);
      return {
        ...log,
        childName: child?.name || 'Child',
      };
    });

    return {
      sleepLogs: sleepLogsWithNames,
      awayLogs: awayLogsWithNames,
    };
  }, [dateStr, children, getLogsForTimelineDate, getAwayLogsForTimelineDate]);

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
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-lavender/40 border border-lavender" />
            <span className="text-bark/60">Sleep</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-sage/30 border border-sage" />
            <span className="text-bark/60">Away</span>
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

          {/* Actual sleep logs (primary) */}
          {sleepLogs.map(log => (
            <ActualSleepBlock
              key={log.id}
              childName={log.childName}
              startedAt={log.startedAt}
              endedAt={log.endedAt}
              sleepType={log.sleepType}
              isSelected={selectedSleepLogId === log.id}
              onClick={() => setSelectedSleepLogId(selectedSleepLogId === log.id ? null : log.id)}
            />
          ))}

          {/* Away logs (primary - green/sage) */}
          {awayLogs.map(log => (
            <AwayBlock
              key={log.id}
              childName={log.childName}
              startedAt={log.startedAt}
              endedAt={log.endedAt}
              scheduleName={log.scheduleName}
            />
          ))}

          {/* Current time indicator (only on today) */}
          {isToday && <CurrentTimeLine />}

          {/* Empty state */}
          {sleepLogs.length === 0 && awayLogs.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="text-4xl mb-4">📅</div>
                <p className="text-bark/60 mb-2">No sleep or away logs for this day</p>
                <p className="text-sm text-bark/40">
                  Use the sleep timer or away controls on the Today screen
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sleep log popup */}
        {selectedSleepLogId && (() => {
          const log = sleepLogs.find(l => l.id === selectedSleepLogId);
          if (!log) return null;
          return (
            <SleepLogPopup
              log={log}
              onClose={() => setSelectedSleepLogId(null)}
              onUpdate={(logId, updates) => updateNapLog(logId, updates)}
              onDelete={(logId) => deleteNapLog(logId)}
            />
          );
        })()}
      </div>
    </div>
  );
}
