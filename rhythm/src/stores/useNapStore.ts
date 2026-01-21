import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import type { NapSchedule, NapLog } from '../types';

interface NapState {
  napSchedules: NapSchedule[];
  napLogs: NapLog[];

  // Schedule actions
  addNapSchedule: (schedule: Omit<NapSchedule, 'id'>) => string;
  updateNapSchedule: (id: string, updates: Partial<Omit<NapSchedule, 'id'>>) => void;
  removeNapSchedule: (id: string) => void;
  clearNapSchedules: () => void;
  getSchedulesForChild: (childId: string) => NapSchedule[];

  // Nap log actions
  startNap: (childId: string) => string;
  endNap: (childId: string) => void;
  updateNapLog: (logId: string, updates: Partial<Pick<NapLog, 'startedAt' | 'endedAt'>>) => void;
  getNapsForDate: (date: string) => NapLog[];
  getActiveNaps: () => NapLog[];
  isChildNapping: (childId: string) => boolean;
}

export const useNapStore = create<NapState>()(
  persist(
    (set, get) => ({
      napSchedules: [],
      napLogs: [],

      // Schedule actions
      addNapSchedule: (scheduleData) => {
        const id = uuidv4();
        const newSchedule: NapSchedule = { id, ...scheduleData };
        set((state) => ({
          napSchedules: [...state.napSchedules, newSchedule],
        }));
        return id;
      },

      updateNapSchedule: (id, updates) => {
        set((state) => ({
          napSchedules: state.napSchedules.map((schedule) =>
            schedule.id === id ? { ...schedule, ...updates } : schedule
          ),
        }));
      },

      removeNapSchedule: (id) => {
        set((state) => ({
          napSchedules: state.napSchedules.filter((schedule) => schedule.id !== id),
        }));
      },

      clearNapSchedules: () => {
        set({ napSchedules: [] });
      },

      getSchedulesForChild: (childId) => {
        return get()
          .napSchedules.filter((schedule) => schedule.childId === childId)
          .sort((a, b) => a.napNumber - b.napNumber);
      },

      // Nap log actions
      startNap: (childId) => {
        const now = new Date();
        const id = uuidv4();
        const newLog: NapLog = {
          id,
          childId,
          date: format(now, 'yyyy-MM-dd'),
          startedAt: now.toISOString(),
          endedAt: null,
        };
        set((state) => ({
          napLogs: [...state.napLogs, newLog],
        }));
        return id;
      },

      endNap: (childId) => {
        const now = new Date().toISOString();
        set((state) => ({
          napLogs: state.napLogs.map((log) =>
            log.childId === childId && log.endedAt === null
              ? { ...log, endedAt: now }
              : log
          ),
        }));
      },

      updateNapLog: (logId, updates) => {
        set((state) => ({
          napLogs: state.napLogs.map((log) =>
            log.id === logId ? { ...log, ...updates } : log
          ),
        }));
      },

      getNapsForDate: (date) => {
        return get().napLogs.filter((log) => log.date === date);
      },

      getActiveNaps: () => {
        return get().napLogs.filter((log) => log.endedAt === null);
      },

      isChildNapping: (childId) => {
        return get().napLogs.some(
          (log) => log.childId === childId && log.endedAt === null
        );
      },
    }),
    {
      name: 'rhythm_naps',
    }
  )
);
