import { useState, useEffect } from 'react';
import { parseISO, differenceInMinutes, format, set as setTime } from 'date-fns';
import { useChildStore } from '../../stores/useChildStore';
import { useNapStore } from '../../stores/useNapStore';
import { useAvailability } from '../../hooks/useAvailability';

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function NapControls() {
  const children = useChildStore((state) => state.children);
  const napLogs = useNapStore((state) => state.napLogs);
  const startNap = useNapStore((state) => state.startNap);
  const endNap = useNapStore((state) => state.endNap);
  const updateNapLog = useNapStore((state) => state.updateNapLog);
  const isChildNapping = useNapStore((state) => state.isChildNapping);
  const { currentState, isAnyChildAsleep, childrenAsleep, childrenHome } = useAvailability();

  const [editingNapId, setEditingNapId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState('');

  // Force re-render every minute to update durations
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const nappingAgeChildren = children.filter((child) => child.isNappingAge);

  if (nappingAgeChildren.length === 0) {
    return null;
  }

  // Calculate what the availability would be if we change nap state
  const getAvailabilityPreview = (childId: string, wouldBeNapping: boolean): string => {
    const otherChildrenAsleep = childrenAsleep.filter((id) => id !== childId);
    const otherChildrenHome = childrenHome.filter((id) => id !== childId);

    if (wouldBeNapping) {
      // If this child starts napping
      const allWouldBeAsleep = otherChildrenHome.length === 0;
      if (allWouldBeAsleep) {
        return 'quiet time';
      }
      return 'some quiet';
    } else {
      // If this child wakes up
      const anyStillAsleep = otherChildrenAsleep.length > 0;
      if (!anyStillAsleep && currentState === 'quiet') {
        return 'parenting';
      }
      return 'parenting';
    }
  };

  const getActiveNap = (childId: string) => {
    return napLogs.find((log) => log.childId === childId && log.endedAt === null);
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
          Nap Tracking
        </h2>
        {isAnyChildAsleep && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-lavender/20 text-lavender flex items-center gap-1">
            <span>🤫</span>
            <span>Quiet time</span>
          </span>
        )}
      </div>
      <div className="space-y-3">
        {nappingAgeChildren.map((child) => {
          const isNapping = isChildNapping(child.id);
          const activeNap = getActiveNap(child.id);
          const duration = activeNap
            ? differenceInMinutes(new Date(), parseISO(activeNap.startedAt))
            : 0;
          const isEditing = activeNap && editingNapId === activeNap.id;
          const availabilityPreview = getAvailabilityPreview(child.id, !isNapping);

          return (
            <div key={child.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <span className="text-bark font-medium">{child.name}</span>
                  {isNapping && !isEditing && (
                    <span className="ml-2 text-sm text-lavender">
                      💤 {formatDuration(duration)}
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={() =>
                      isNapping ? endNap(child.id) : startNap(child.id)
                    }
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isNapping
                        ? 'bg-terracotta text-cream hover:bg-terracotta/90'
                        : 'bg-lavender text-cream hover:bg-lavender/90'
                    }`}
                  >
                    {isNapping ? 'Wake Up' : 'Start Nap'}
                  </button>
                  {!isNapping && nappingAgeChildren.length > 0 && childrenHome.length > 0 && (
                    <span className="text-xs text-bark/40">
                      → {availabilityPreview}
                    </span>
                  )}
                </div>
              </div>

              {/* Edit start time section */}
              {isNapping && activeNap && (
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
                        onClick={() => handleSaveEdit(activeNap.id)}
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
                      onClick={() => handleEditStart(activeNap.id, activeNap.startedAt)}
                      className="text-xs text-bark/50 hover:text-bark/70 flex items-center gap-1"
                    >
                      <span>Started {format(parseISO(activeNap.startedAt), 'h:mm a')}</span>
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
