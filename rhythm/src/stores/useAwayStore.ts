import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import type { AwayLog } from '../types';
import { useChildStore } from './useChildStore';

interface AwayState {
  awayLogs: AwayLog[];

  // Away log actions
  startAway: (childId: string, scheduleName?: string) => string;
  endAway: (childId: string) => void;
  updateAwayLog: (logId: string, updates: Partial<Pick<AwayLog, 'startedAt' | 'endedAt'>>) => void;
  deleteAwayLog: (logId: string) => void;
  clearAwayLogs: () => void;

  // Query methods
  getAwayLogsForDate: (date: string) => AwayLog[];
  getActiveAwayForChild: (childId: string) => AwayLog | undefined;
  isChildAway: (childId: string) => boolean;
  getLogsForTimelineDate: (date: string) => AwayLog[];
}

export const useAwayStore = create<AwayState>()(
  persist(
    (set, get) => ({
      awayLogs: [],

      startAway: (childId, scheduleName) => {
        const now = new Date();
        const id = uuidv4();
        const newLog: AwayLog = {
          id,
          childId,
          date: format(now, 'yyyy-MM-dd'),
          startedAt: now.toISOString(),
          endedAt: null,
          scheduleName,
        };
        set((state) => ({
          awayLogs: [...state.awayLogs, newLog],
        }));

        // Update child care status to 'away'
        useChildStore.getState().updateCareStatus(childId, 'away');

        return id;
      },

      endAway: (childId) => {
        const now = new Date().toISOString();
        set((state) => ({
          awayLogs: state.awayLogs.map((log) =>
            log.childId === childId && log.endedAt === null
              ? { ...log, endedAt: now }
              : log
          ),
        }));

        // Update child care status to 'home'
        useChildStore.getState().updateCareStatus(childId, 'home');
      },

      updateAwayLog: (logId, updates) => {
        set((state) => ({
          awayLogs: state.awayLogs.map((log) =>
            log.id === logId ? { ...log, ...updates } : log
          ),
        }));
      },

      deleteAwayLog: (logId) => {
        set((state) => ({
          awayLogs: state.awayLogs.filter((log) => log.id !== logId),
        }));
      },

      clearAwayLogs: () => {
        set({ awayLogs: [] });
      },

      getAwayLogsForDate: (date) => {
        return get().awayLogs.filter((log) => log.date === date);
      },

      getActiveAwayForChild: (childId) => {
        return get().awayLogs.find(
          (log) => log.childId === childId && log.endedAt === null
        );
      },

      isChildAway: (childId) => {
        return get().awayLogs.some(
          (log) => log.childId === childId && log.endedAt === null
        );
      },

      getLogsForTimelineDate: (date) => {
        // Returns AwayLogs that overlap with the given date
        // Handles logs that span across midnight
        const logs = get().awayLogs;
        const dateStart = new Date(`${date}T00:00:00`);

        return logs.filter((log) => {
          const startedAt = new Date(log.startedAt);
          const endedAt = log.endedAt ? new Date(log.endedAt) : new Date();

          // Log overlaps with date if:
          // 1. Started on this date, OR
          // 2. Ended on this date, OR
          // 3. Spans across this date
          const startsOnDate = log.date === date;
          const endsOnDate = log.endedAt && format(new Date(log.endedAt), 'yyyy-MM-dd') === date;
          const spansDate = startedAt < dateStart && endedAt > dateStart;

          return startsOnDate || endsOnDate || spansDate;
        });
      },
    }),
    {
      name: 'rhythm_away',
    }
  )
);
