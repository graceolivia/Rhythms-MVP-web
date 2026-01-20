import { useState, useEffect } from 'react';
import { parseISO, differenceInMinutes } from 'date-fns';
import { useChildStore } from '../../stores/useChildStore';
import { useNapStore } from '../../stores/useNapStore';

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
  const isChildNapping = useNapStore((state) => state.isChildNapping);

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

  const getActiveNap = (childId: string) => {
    return napLogs.find((log) => log.childId === childId && log.endedAt === null);
  };

  return (
    <div className="bg-parchment rounded-lg p-4">
      <h2 className="font-body font-semibold text-bark/80 text-sm uppercase tracking-wide mb-3">
        Nap Tracking
      </h2>
      <div className="space-y-2">
        {nappingAgeChildren.map((child) => {
          const isNapping = isChildNapping(child.id);
          const activeNap = getActiveNap(child.id);
          const duration = activeNap
            ? differenceInMinutes(new Date(), parseISO(activeNap.startedAt))
            : 0;

          return (
            <div
              key={child.id}
              className="flex items-center justify-between gap-3"
            >
              <div className="flex-1">
                <span className="text-bark font-medium">{child.name}</span>
                {isNapping && (
                  <span className="ml-2 text-sm text-sage">
                    sleeping {formatDuration(duration)}
                  </span>
                )}
              </div>
              <button
                onClick={() =>
                  isNapping ? endNap(child.id) : startNap(child.id)
                }
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isNapping
                    ? 'bg-terracotta text-cream hover:bg-terracotta/90'
                    : 'bg-sage text-cream hover:bg-sage/90'
                }`}
              >
                {isNapping ? 'Wake Up' : 'Start Nap'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
