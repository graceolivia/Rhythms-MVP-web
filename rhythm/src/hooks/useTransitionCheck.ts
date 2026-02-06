import { useEffect } from 'react';
import { useTransitionStore } from '../stores/useTransitionStore';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Hook that checks for pending transitions on mount and every 5 minutes.
 * Call from the Today screen.
 */
export function useTransitionCheck() {
  const checkForTransitions = useTransitionStore((state) => state.checkForTransitions);

  useEffect(() => {
    // Check immediately on mount (app open)
    checkForTransitions();

    // Check every 5 minutes
    const interval = setInterval(() => {
      checkForTransitions();
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [checkForTransitions]);
}
