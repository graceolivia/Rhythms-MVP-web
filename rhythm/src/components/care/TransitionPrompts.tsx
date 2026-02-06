import { useMemo } from 'react';
import { format } from 'date-fns';
import { useTransitionStore } from '../../stores/useTransitionStore';
import { useNapStore } from '../../stores/useNapStore';
import type { SleepType } from '../../types';

function getSleepTypeForCurrentTime(): SleepType {
  const hour = new Date().getHours();
  return (hour >= 18 || hour < 7) ? 'night' : 'nap';
}

interface TransitionPromptsProps {
  napContext?: Record<string, { wakeWindowText?: string }>;
}

export function TransitionPrompts({ napContext }: TransitionPromptsProps) {
  const transitions = useTransitionStore((state) => state.transitions);
  const confirmTransition = useTransitionStore((state) => state.confirmTransition);
  const dismissTransition = useTransitionStore((state) => state.dismissTransition);
  const startSleep = useNapStore((state) => state.startSleep);

  const pendingTransitions = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return transitions.filter(
      (t) => t.status === 'pending' && t.scheduledDate === today
    );
  }, [transitions]);

  if (pendingTransitions.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {pendingTransitions.map((transition) => {
        const isNapSuggestion = transition.type === 'nap-start';
        const borderColor = isNapSuggestion ? 'border-l-lavender' : 'border-l-sage';
        const wakeWindowInfo = napContext?.[transition.childId]?.wakeWindowText;

        return (
          <div
            key={transition.id}
            className={`bg-cream/80 rounded-xl p-3 border-l-4 ${borderColor} animate-in fade-in slide-in-from-top-2 duration-300`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-bark flex-1">
                {transition.description}
                {wakeWindowInfo && (
                  <span className="text-bark/40 ml-1">{wakeWindowInfo}</span>
                )}
              </p>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isNapSuggestion ? (
                  <>
                    <button
                      onClick={() => {
                        const sleepType = getSleepTypeForCurrentTime();
                        startSleep(transition.childId, sleepType);
                        confirmTransition(transition.id);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-lavender text-cream hover:bg-lavender/90 transition-colors"
                    >
                      Started
                    </button>
                    <button
                      onClick={() => dismissTransition(transition.id)}
                      className="text-xs text-bark/40 hover:text-bark/60 transition-colors"
                    >
                      Not yet
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => confirmTransition(transition.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-sage text-cream hover:bg-sage/90 transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => dismissTransition(transition.id)}
                      className="text-xs text-bark/40 hover:text-bark/60 transition-colors"
                    >
                      Not today
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
