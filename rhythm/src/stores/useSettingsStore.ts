import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';

interface SettingsState {
  witherModeEnabled: boolean;
  lastActivityDate: string | null; // 'yyyy-MM-dd'

  setWitherMode: (enabled: boolean) => void;
  recordActivity: () => void;
  /** Returns calendar days since last activity, or 0 if wither mode is off / no activity recorded */
  getDaysMissed: () => number;
}

/**
 * Returns a stable per-challenge offset (0, 1, or 2) derived from the challenge ID.
 * This staggers withering so not all plants grey/die on the same day.
 */
export function getChallengeWitherOffset(challengeId: string): 0 | 1 | 2 {
  const hash = challengeId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return (hash % 3) as 0 | 1 | 2;
}

/**
 * Returns the visual wither level (0–3) for a specific challenge given global days missed.
 * 0=healthy, 1=slightly grey, 2=greyer, 3=dead/wilted
 */
export function getChallengeWitherLevel(challengeId: string, daysMissed: number): 0 | 1 | 2 | 3 {
  const offset = getChallengeWitherOffset(challengeId);
  const effective = daysMissed - offset;
  if (effective <= 0) return 0;
  if (effective === 1) return 1;
  if (effective === 2) return 2;
  return 3;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      witherModeEnabled: false,
      lastActivityDate: null,

      setWitherMode: (enabled) => set({ witherModeEnabled: enabled }),

      recordActivity: () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        set({ lastActivityDate: today });
      },

      getDaysMissed: () => {
        const { witherModeEnabled, lastActivityDate } = get();
        if (!witherModeEnabled || !lastActivityDate) return 0;
        return Math.max(0, differenceInCalendarDays(new Date(), parseISO(lastActivityDate)));
      },
    }),
    { name: 'rhythm_settings' }
  )
);
