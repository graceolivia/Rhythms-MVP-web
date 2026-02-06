import { useState, useEffect } from 'react';
import { parseISO, differenceInMinutes, format, set as setTime } from 'date-fns';
import { useChildStore } from '../../stores/useChildStore';
import { useNapStore } from '../../stores/useNapStore';
import { useAwayStore } from '../../stores/useAwayStore';
import { useCareBlockStore } from '../../stores/useCareBlockStore';
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
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function getSleepTypeForCurrentTime(): SleepType {
  const hour = new Date().getHours();
  return (hour >= 18 || hour < 7) ? 'night' : 'nap';
}

interface NapPredictionHint {
  nextNapTime?: string;
  probableWakeTime?: string;
  wakeWindowWarning?: string;
}

interface ChildStatusBarProps {
  napPredictions?: Record<string, NapPredictionHint>;
}

export function ChildStatusBar({ napPredictions }: ChildStatusBarProps) {
  const children = useChildStore((state) => state.children);
  const startSleep = useNapStore((state) => state.startSleep);
  const endSleep = useNapStore((state) => state.endSleep);
  const getActiveSleepForChild = useNapStore((state) => state.getActiveSleepForChild);
  const getLastWakeTime = useNapStore((state) => state.getLastWakeTime);
  const updateNapLog = useNapStore((state) => state.updateNapLog);
  const startAway = useAwayStore((state) => state.startAway);
  const endAway = useAwayStore((state) => state.endAway);
  const getActiveAwayForChild = useAwayStore((state) => state.getActiveAwayForChild);
  const updateAwayLog = useAwayStore((state) => state.updateAwayLog);
  const blocks = useCareBlockStore((state) => state.blocks);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState('');

  // Force re-render every 60s for live durations
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  if (children.length === 0) return null;

  const getChildcareOptions = (childId: string) => {
    return blocks.filter(
      (block) =>
        block.childIds.includes(childId) &&
        (block.blockType === 'childcare' || block.blockType === 'babysitter') &&
        block.isActive
    );
  };

  const handleStartSleep = (childId: string) => {
    const sleepType = getSleepTypeForCurrentTime();
    startSleep(childId, sleepType);
  };

  const handleStartAway = (childId: string, scheduleName?: string) => {
    startAway(childId, scheduleName);
  };

  const handleEditStart = (id: string, currentStartedAt: string) => {
    setEditingId(id);
    setEditTime(format(parseISO(currentStartedAt), 'HH:mm'));
  };

  const handleSaveEdit = (id: string, type: 'nap' | 'away') => {
    if (!editTime) return;
    const [hours, minutes] = editTime.split(':').map(Number);
    const today = new Date();
    const newStartTime = setTime(today, { hours, minutes, seconds: 0, milliseconds: 0 });
    if (type === 'nap') {
      updateNapLog(id, { startedAt: newStartTime.toISOString() });
    } else {
      updateAwayLog(id, { startedAt: newStartTime.toISOString() });
    }
    setEditingId(null);
    setEditTime('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTime('');
  };

  return (
    <div className="bg-parchment rounded-xl p-3 mb-4">
      <div className="space-y-1">
        {children.map((child) => {
          const activeSleep = getActiveSleepForChild(child.id);
          const activeAway = getActiveAwayForChild(child.id);
          const isSleeping = !!activeSleep;
          const isAway = !!activeAway;
          const lastWakeTime = getLastWakeTime(child.id);
          const childcareOptions = getChildcareOptions(child.id);
          const predictions = napPredictions?.[child.id];

          // Calculate durations
          const sleepDuration = activeSleep
            ? differenceInMinutes(new Date(), parseISO(activeSleep.startedAt))
            : 0;
          const awayDuration = activeAway
            ? differenceInMinutes(new Date(), parseISO(activeAway.startedAt))
            : 0;
          const awakeDuration = lastWakeTime
            ? differenceInMinutes(new Date(), parseISO(lastWakeTime))
            : null;

          const isEditingThis = editingId === (activeSleep?.id ?? activeAway?.id);

          // Determine state color
          const statusDotColor = isSleeping
            ? 'bg-lavender'
            : isAway
              ? 'bg-sage'
              : 'bg-sage/60';

          const sleepEmoji = activeSleep?.sleepType === 'night' ? '🌙' : '💤';

          return (
            <div key={child.id}>
              <div className="flex items-center gap-2 py-2">
                {/* Status dot */}
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDotColor}`} />

                {/* Child name */}
                <span className="font-medium text-bark text-sm">{child.name}</span>

                {/* Status text */}
                <span className="text-bark/40 text-sm">·</span>
                {isSleeping ? (
                  <>
                    <span className="text-sm text-lavender">
                      {sleepEmoji} {activeSleep.sleepType === 'night' ? 'sleeping' : 'napping'} ({formatDuration(sleepDuration)})
                    </span>
                    {predictions?.probableWakeTime && (
                      <span className="text-xs text-bark/40 hidden sm:inline">
                        · up soon ~{predictions.probableWakeTime}
                      </span>
                    )}
                  </>
                ) : isAway ? (
                  <span className="text-sm text-sage">
                    at {activeAway.scheduleName || 'away'} ({formatDuration(awayDuration)})
                  </span>
                ) : (
                  <>
                    <span className="text-sm text-bark/50">
                      home
                      {awakeDuration !== null && awakeDuration < 720 && (
                        <span className="text-bark/40 ml-1">
                          · awake {formatAwakeTime(awakeDuration)}
                        </span>
                      )}
                    </span>
                    {predictions?.nextNapTime && (
                      <span className="text-xs text-bark/40 hidden sm:inline">
                        · nap usually ~{predictions.nextNapTime}
                      </span>
                    )}
                  </>
                )}

                {/* Action button */}
                <div className="ml-auto flex-shrink-0">
                  {isSleeping ? (
                    <button
                      onClick={() => endSleep(child.id)}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-terracotta/15 text-terracotta hover:bg-terracotta/25 transition-colors"
                    >
                      he's up
                    </button>
                  ) : isAway ? (
                    <button
                      onClick={() => endAway(child.id)}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-sage/15 text-sage hover:bg-sage/25 transition-colors"
                    >
                      home
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      {child.isNappingAge && (
                        <button
                          onClick={() => handleStartSleep(child.id)}
                          className="px-3 py-1 rounded-lg text-xs font-medium bg-lavender/15 text-lavender hover:bg-lavender/25 transition-colors"
                        >
                          nap
                        </button>
                      )}
                      {childcareOptions.length > 0 ? (
                        <select
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '__away__') {
                              handleStartAway(child.id);
                            } else {
                              const block = childcareOptions.find((b) => b.id === value);
                              handleStartAway(child.id, block?.name);
                            }
                            e.target.value = '';
                          }}
                          className="px-2 py-1 rounded-lg text-xs font-medium bg-bark/8 text-bark border-0 focus:outline-none cursor-pointer"
                          defaultValue=""
                        >
                          <option value="" disabled>at…</option>
                          {childcareOptions.map((block) => (
                            <option key={block.id} value={block.id}>{block.name}</option>
                          ))}
                          <option value="__away__">Other</option>
                        </select>
                      ) : (
                        <button
                          onClick={() => handleStartAway(child.id)}
                          className="px-3 py-1 rounded-lg text-xs font-medium bg-bark/8 text-bark/60 hover:bg-bark/15 transition-colors"
                        >
                          away
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Edit start time (tap duration to edit) */}
              {(isSleeping || isAway) && (
                <div className="pl-5 pb-1">
                  {isEditingThis ? (
                    <div className="flex items-center gap-2 bg-cream rounded-lg p-2">
                      <label className="text-xs text-bark/60">
                        {isSleeping ? 'Fell asleep:' : 'Left at:'}
                      </label>
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm rounded border border-bark/20 bg-white focus:outline-none focus:border-sage"
                      />
                      <button
                        onClick={() => handleSaveEdit(
                          isSleeping ? activeSleep!.id : activeAway!.id,
                          isSleeping ? 'nap' : 'away'
                        )}
                        className="px-3 py-1 text-xs bg-sage text-cream rounded hover:bg-sage/90"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-3 py-1 text-xs text-bark/60 hover:text-bark"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEditStart(
                        isSleeping ? activeSleep!.id : activeAway!.id,
                        isSleeping ? activeSleep!.startedAt : activeAway!.startedAt
                      )}
                      className="text-xs text-bark/40 hover:text-bark/60"
                    >
                      {isSleeping
                        ? `since ${format(parseISO(activeSleep!.startedAt), 'h:mm a')}`
                        : `left ${format(parseISO(activeAway!.startedAt), 'h:mm a')}`
                      }
                      <span className="text-bark/30 ml-1">· tap to edit</span>
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
