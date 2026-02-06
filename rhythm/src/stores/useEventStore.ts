import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';

interface RhythmEvent {
  key: string;       // e.g. 'nap-end', 'nap-end:CHILD_ID', 'task-complete:TASK_ID'
  timestamp: string; // ISO datetime
  date: string;      // YYYY-MM-DD
}

interface EventState {
  todaysEvents: RhythmEvent[];

  emitEvent: (eventKey: string) => void;
  hasEventFired: (eventKey: string) => boolean;
  getEventTimestamp: (eventKey: string) => string | null;
  clearEventsForDate: (date: string) => void;
  ensureTodayClean: () => void;
}

export const useEventStore = create<EventState>()(
  persist(
    (set, get) => ({
      todaysEvents: [],

      emitEvent: (eventKey) => {
        const now = new Date();
        const today = format(now, 'yyyy-MM-dd');

        // Clean stale events from previous days
        get().ensureTodayClean();

        const event: RhythmEvent = {
          key: eventKey,
          timestamp: now.toISOString(),
          date: today,
        };

        set((state) => ({
          todaysEvents: [...state.todaysEvents, event],
        }));
      },

      hasEventFired: (eventKey) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        return get().todaysEvents.some(
          (e) => e.date === today && e.key === eventKey
        );
      },

      getEventTimestamp: (eventKey) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const event = get().todaysEvents.find(
          (e) => e.date === today && e.key === eventKey
        );
        return event?.timestamp ?? null;
      },

      clearEventsForDate: (date) => {
        set((state) => ({
          todaysEvents: state.todaysEvents.filter((e) => e.date !== date),
        }));
      },

      ensureTodayClean: () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const { todaysEvents } = get();
        // Keep only today's events and yesterday's (for trigger delays that span midnight)
        const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
        const filtered = todaysEvents.filter(
          (e) => e.date === today || e.date === yesterday
        );
        if (filtered.length !== todaysEvents.length) {
          set({ todaysEvents: filtered });
        }
      },
    }),
    {
      name: 'rhythm_events',
    }
  )
);
