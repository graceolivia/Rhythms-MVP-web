import { useEffect } from 'react';
import { useChallengeStore } from '../stores/useChallengeStore';

/**
 * Checks for bloomed challenges with a repeat interval and auto-replants them
 * when the interval has elapsed. Runs on mount and once per hour.
 */
export function useRepeatChallenges() {
  const processRepeatChallenges = useChallengeStore(s => s.processRepeatChallenges);

  useEffect(() => {
    processRepeatChallenges();
    const interval = setInterval(processRepeatChallenges, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [processRepeatChallenges]);
}
