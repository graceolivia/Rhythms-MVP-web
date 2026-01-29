import { useState, useEffect } from 'react';
import { parseISO, differenceInMinutes, format, set as setTime } from 'date-fns';
import { useChildStore } from '../../stores/useChildStore';
import { useAwayStore } from '../../stores/useAwayStore';
import { useCareBlockStore } from '../../stores/useCareBlockStore';

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

export function AwayControls() {
  const children = useChildStore((state) => state.children);
  const startAway = useAwayStore((state) => state.startAway);
  const endAway = useAwayStore((state) => state.endAway);
  const updateAwayLog = useAwayStore((state) => state.updateAwayLog);
  const getActiveAwayForChild = useAwayStore((state) => state.getActiveAwayForChild);
  const blocks = useCareBlockStore((state) => state.blocks);

  const [editingLogId, setEditingLogId] = useState<string | null>(null);
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

  // Get childcare blocks for quick selection
  const getChildcareOptions = (childId: string) => {
    return blocks.filter(
      (block) =>
        block.childIds.includes(childId) &&
        (block.blockType === 'childcare' || block.blockType === 'babysitter') &&
        block.isActive
    );
  };

  const handleStartAway = (childId: string, scheduleName?: string) => {
    startAway(childId, scheduleName);
  };

  const handleEditStart = (logId: string, currentStartedAt: string) => {
    setEditingLogId(logId);
    setEditTime(format(parseISO(currentStartedAt), 'HH:mm'));
  };

  const handleSaveEdit = (logId: string) => {
    if (!editTime) return;

    const [hours, minutes] = editTime.split(':').map(Number);
    const today = new Date();
    const newStartTime = setTime(today, { hours, minutes, seconds: 0, milliseconds: 0 });

    updateAwayLog(logId, { startedAt: newStartTime.toISOString() });
    setEditingLogId(null);
    setEditTime('');
  };

  const handleCancelEdit = () => {
    setEditingLogId(null);
    setEditTime('');
  };

  // Check if any child is currently away
  const anyChildAway = children.some((child) => getActiveAwayForChild(child.id));

  return (
    <div className="bg-parchment rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-body font-semibold text-bark/80 text-sm uppercase tracking-wide">
          Away / Home
        </h2>
        {anyChildAway && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-sage/20 text-sage flex items-center gap-1">
            <span>🚗</span>
            <span>Someone away</span>
          </span>
        )}
      </div>

      <div className="space-y-3">
        {children.map((child) => {
          const activeAway = getActiveAwayForChild(child.id);
          const isAway = !!activeAway;
          const childcareOptions = getChildcareOptions(child.id);
          const isEditing = activeAway && editingLogId === activeAway.id;

          // Calculate duration
          const duration = activeAway
            ? differenceInMinutes(new Date(), parseISO(activeAway.startedAt))
            : 0;

          return (
            <div key={child.id} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-bark font-medium">{child.name}</span>
                    {isAway && !isEditing && (
                      <span className="text-sm text-sage">
                        🚗 {formatDuration(duration)}
                        {activeAway.scheduleName && (
                          <span className="text-bark/50 ml-1">
                            at {activeAway.scheduleName}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>

                {isAway ? (
                  <button
                    onClick={() => endAway(child.id)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-sage text-cream hover:bg-sage/90"
                  >
                    Home
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
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
                          e.target.value = ''; // Reset select
                        }}
                        className="px-3 py-2 rounded-lg text-sm font-medium bg-bark/10 text-bark border-0 focus:outline-none focus:ring-2 focus:ring-sage cursor-pointer"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Mark Away...
                        </option>
                        {childcareOptions.map((block) => (
                          <option key={block.id} value={block.id}>
                            {block.name}
                          </option>
                        ))}
                        <option value="__away__">Other</option>
                      </select>
                    ) : (
                      <button
                        onClick={() => handleStartAway(child.id)}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-bark/10 text-bark hover:bg-bark/20"
                      >
                        Away
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Edit start time section */}
              {isAway && activeAway && (
                <div className="pl-0">
                  {isEditing ? (
                    <div className="flex items-center gap-2 bg-cream rounded-lg p-2">
                      <label className="text-xs text-bark/60">Left at:</label>
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm rounded border border-bark/20 bg-white focus:outline-none focus:border-sage"
                      />
                      <button
                        onClick={() => handleSaveEdit(activeAway.id)}
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
                      onClick={() => handleEditStart(activeAway.id, activeAway.startedAt)}
                      className="text-xs text-bark/50 hover:text-bark/70 flex items-center gap-1"
                    >
                      <span>Left {format(parseISO(activeAway.startedAt), 'h:mm a')}</span>
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
