import { useState, useEffect } from 'react';
import { parseISO, differenceInMinutes, format, set as setTime } from 'date-fns';
import { useChildStore } from '../../stores/useChildStore';
import { useNapStore } from '../../stores/useNapStore';
import { useAvailability } from '../../hooks/useAvailability';
import type { SleepType } from '../../types';

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function formatAwakeTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  if (hours === 0) {
    return `${minutes}m`;
  }
  if (hours < 24) {
    return `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

/**
 * Determine sleep type based on time of day
 * Night: 6 PM - 7 AM, Nap: 7 AM - 6 PM
 */
function getSleepTypeForCurrentTime(): SleepType {
  const hour = new Date().getHours();
  return (hour >= 18 || hour < 7) ? 'night' : 'nap';
}

export function NapControls() {
  const children = useChildStore((state) => state.children);
  const startSleep = useNapStore((state) => state.startSleep);
  const endSleep = useNapStore((state) => state.endSleep);
  const updateNapLog = useNapStore((state) => state.updateNapLog);
  const getActiveSleepForChild = useNapStore((state) => state.getActiveSleepForChild);
  const getLastWakeTime = useNapStore((state) => state.getLastWakeTime);
  const { isAnyChildAsleep } = useAvailability();

  const [editingNapId, setEditingNapId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState('');

  // Force re-render every minute to update durations
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  if (children.length === 0) {
    return null;
  }

  const handleStartSleep = (childId: string) => {
    const sleepType = getSleepTypeForCurrentTime();
    startSleep(childId, sleepType);
  };

  const handleEditStart = (napId: string, currentStartedAt: string) => {
    setEditingNapId(napId);
    setEditTime(format(parseISO(currentStartedAt), 'HH:mm'));
  };

  const handleSaveEdit = (napId: string) => {
    if (!editTime) return;

    const [hours, minutes] = editTime.split(':').map(Number);
    const today = new Date();
    const newStartTime = setTime(today, { hours, minutes, seconds: 0, milliseconds: 0 });

    updateNapLog(napId, { startedAt: newStartTime.toISOString() });
    setEditingNapId(null);
    setEditTime('');
  };

  const handleCancelEdit = () => {
    setEditingNapId(null);
    setEditTime('');
  };

  return (
    <div className="bg-parchment rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-body font-semibold text-bark/80 text-sm uppercase tracking-wide">
          Sleep Tracking
        </h2>
        {isAnyChildAsleep && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-lavender/20 text-lavender flex items-center gap-1">
            <span>🤫</span>
            <span>Quiet time</span>
          </span>
        )}
      </div>

      <div className="space-y-3">
        {children.map((child) => {
          const activeSleep = getActiveSleepForChild(child.id);
          const isSleeping = !!activeSleep;
          const lastWakeTime = getLastWakeTime(child.id);
          const isEditing = activeSleep && editingNapId === activeSleep.id;

          // Calculate duration
          const duration = activeSleep
            ? differenceInMinutes(new Date(), parseISO(activeSleep.startedAt))
            : 0;

          // Calculate awake time (only show if less than 12 hours)
          const awakeDuration = lastWakeTime
            ? differenceInMinutes(new Date(), parseISO(lastWakeTime))
            : null;

          // Determine emoji based on sleep type
          const sleepEmoji = activeSleep?.sleepType === 'night' ? '🌙' : '💤';

          return (
            <div key={child.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-bark font-medium">{child.name}</span>
                    {isSleeping && !isEditing && (
                      <span className="text-sm text-lavender">
                        {sleepEmoji} {formatDuration(duration)}
                      </span>
                    )}
                    {!isSleeping && awakeDuration !== null && awakeDuration < 720 && (
                      <span className="text-xs text-bark/40">
                        awake {formatAwakeTime(awakeDuration)}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => isSleeping ? endSleep(child.id) : handleStartSleep(child.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isSleeping
                      ? 'bg-terracotta text-cream hover:bg-terracotta/90'
                      : 'bg-lavender text-cream hover:bg-lavender/90'
                  }`}
                >
                  {isSleeping ? 'Wake Up' : 'Sleep'}
                </button>
              </div>

              {/* Edit start time section */}
              {isSleeping && activeSleep && (
                <div className="pl-0">
                  {isEditing ? (
                    <div className="flex items-center gap-2 bg-cream rounded-lg p-2">
                      <label className="text-xs text-bark/60">Started at:</label>
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm rounded border border-bark/20 bg-white focus:outline-none focus:border-sage"
                      />
                      <button
                        onClick={() => handleSaveEdit(activeSleep.id)}
                        className="px-3 py-1 text-xs bg-sage text-cream rounded hover:bg-sage/90"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 text-xs text-bark/60 hover:text-bark"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEditStart(activeSleep.id, activeSleep.startedAt)}
                      className="text-xs text-bark/50 hover:text-bark/70 flex items-center gap-1"
                    >
                      <span>Started {format(parseISO(activeSleep.startedAt), 'h:mm a')}</span>
                      <span className="text-bark/30">- tap to edit</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
