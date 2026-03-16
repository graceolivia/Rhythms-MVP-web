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

  const [expandedChildId, setExpandedChildId] = useState<string | null>(null);
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
    startSleep(childId, getSleepTypeForCurrentTime());
  };

  const handleStartAway = (childId: string, scheduleName?: string) => {
    startAway(childId, scheduleName);
  };

  const handleToggleExpanded = (childId: string) => {
    setExpandedChildId((prev) => (prev === childId ? null : childId));
    setEditingId(null);
    setEditTime('');
  };

  const handleEditStart = (id: string, currentStartedAt: string) => {
    setEditingId(id);
    setEditTime(format(parseISO(currentStartedAt), 'HH:mm'));
  };

  const handleSaveEdit = (id: string, type: 'nap' | 'away') => {
    if (!editTime) return;
    const [hours, minutes] = editTime.split(':').map(Number);
    const newStartTime = setTime(new Date(), { hours, minutes, seconds: 0, milliseconds: 0 });
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

  const expandedChild = expandedChildId ? children.find((c) => c.id === expandedChildId) : null;

  return (
    <>
      {/* Backdrop to close expanded panel */}
      {expandedChildId && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setExpandedChildId(null);
            setEditingId(null);
          }}
        />
      )}

      {/* Bar + expanded panel — sits just above BottomNav */}
      <div className="fixed bottom-16 left-0 right-0 z-50 bg-cream border-t border-bark/10 shadow-[0_-1px_8px_rgba(0,0,0,0.04)]">
        <div className="max-w-lg mx-auto">

          {/* Expanded panel */}
          {expandedChild && (() => {
            const child = expandedChild;
            const activeSleep = getActiveSleepForChild(child.id);
            const activeAway = getActiveAwayForChild(child.id);
            const isSleeping = !!activeSleep;
            const isAway = !!activeAway;
            const childcareOptions = getChildcareOptions(child.id);
            const sleepDuration = activeSleep
              ? differenceInMinutes(new Date(), parseISO(activeSleep.startedAt))
              : 0;
            const awayDuration = activeAway
              ? differenceInMinutes(new Date(), parseISO(activeAway.startedAt))
              : 0;
            const isEditingThis = editingId === (activeSleep?.id ?? activeAway?.id ?? null);
            const predictions = napPredictions?.[child.id];

            return (
              <div className="px-4 pt-3 pb-2 border-b border-bark/8">
                {/* Edit time form */}
                {isEditingThis && (isSleeping || isAway) ? (
                  <div className="flex items-center gap-2 bg-parchment rounded-lg px-3 py-2 mb-2">
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
                      className="px-2 py-1 text-xs text-bark/50 hover:text-bark"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {/* Status detail */}
                    <div className="flex-1 min-w-0">
                      {isSleeping ? (
                        <div>
                          <span className="text-sm text-lavender font-medium">
                            {activeSleep!.sleepType === 'night' ? '🌙' : '💤'} sleeping · {formatDuration(sleepDuration)}
                          </span>
                          {predictions?.probableWakeTime && (
                            <span className="text-xs text-bark/40 ml-2">up ~{predictions.probableWakeTime}</span>
                          )}
                          <div>
                            <button
                              onClick={() => handleEditStart(activeSleep!.id, activeSleep!.startedAt)}
                              className="text-xs text-bark/40 hover:text-bark/60 mt-0.5"
                            >
                              since {format(parseISO(activeSleep!.startedAt), 'h:mm a')}
                              <span className="text-bark/30 ml-1">· tap to edit</span>
                            </button>
                          </div>
                        </div>
                      ) : isAway ? (
                        <div>
                          <span className="text-sm text-sage font-medium">
                            at {activeAway!.scheduleName || 'away'} · {formatDuration(awayDuration)}
                          </span>
                          <div>
                            <button
                              onClick={() => handleEditStart(activeAway!.id, activeAway!.startedAt)}
                              className="text-xs text-bark/40 hover:text-bark/60 mt-0.5"
                            >
                              left {format(parseISO(activeAway!.startedAt), 'h:mm a')}
                              <span className="text-bark/30 ml-1">· tap to edit</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-bark/50">
                          {predictions?.nextNapTime
                            ? `sleep usually ~${predictions.nextNapTime}`
                            : 'home'}
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isSleeping ? (
                        <button
                          onClick={() => { endSleep(child.id); setExpandedChildId(null); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-terracotta/15 text-terracotta hover:bg-terracotta/25 transition-colors"
                        >
                          he's up
                        </button>
                      ) : isAway ? (
                        <button
                          onClick={() => { endAway(child.id); setExpandedChildId(null); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-sage/15 text-sage hover:bg-sage/25 transition-colors"
                        >
                          home
                        </button>
                      ) : (
                        <>
                          {child.isNappingAge && (
                            <button
                              onClick={() => { handleStartSleep(child.id); setExpandedChildId(null); }}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-lavender/15 text-lavender hover:bg-lavender/25 transition-colors"
                            >
                              sleep
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
                                setExpandedChildId(null);
                              }}
                              className="px-2 py-1.5 rounded-lg text-xs font-medium bg-bark/8 text-bark border-0 focus:outline-none cursor-pointer"
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
                              onClick={() => { handleStartAway(child.id); setExpandedChildId(null); }}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-bark/8 text-bark/60 hover:bg-bark/15 transition-colors"
                            >
                              away
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Compact single-line row */}
          <div className="flex items-center h-10 px-4 gap-5">
            {children.map((child) => {
              const activeSleep = getActiveSleepForChild(child.id);
              const activeAway = getActiveAwayForChild(child.id);
              const isSleeping = !!activeSleep;
              const isAway = !!activeAway;
              const lastWakeTime = getLastWakeTime(child.id);

              const sleepDuration = activeSleep
                ? differenceInMinutes(new Date(), parseISO(activeSleep.startedAt))
                : 0;
              const awayDuration = activeAway
                ? differenceInMinutes(new Date(), parseISO(activeAway.startedAt))
                : 0;
              const awakeDuration = lastWakeTime
                ? differenceInMinutes(new Date(), parseISO(lastWakeTime))
                : null;

              const dotColor = isSleeping
                ? 'bg-lavender'
                : isAway
                  ? 'bg-sage'
                  : 'bg-sage/50';

              let statusText: string;
              if (isSleeping) {
                statusText = `napping (${formatDuration(sleepDuration)})`;
              } else if (isAway) {
                statusText = `at ${activeAway!.scheduleName || 'away'} (${formatDuration(awayDuration)})`;
              } else if (awakeDuration !== null && awakeDuration < 720) {
                statusText = `awake ${formatAwakeTime(awakeDuration)}`;
              } else {
                statusText = 'home';
              }

              const isExpanded = expandedChildId === child.id;

              return (
                <button
                  key={child.id}
                  onClick={() => handleToggleExpanded(child.id)}
                  className={`flex items-center gap-1.5 min-w-0 transition-opacity ${isExpanded ? 'opacity-100' : 'hover:opacity-80'}`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                  <span className="text-sm font-medium text-bark">{child.name}</span>
                  <span className="text-sm text-bark/50 truncate">{statusText}</span>
                </button>
              );
            })}
          </div>

        </div>
      </div>
    </>
  );
}
