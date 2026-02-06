import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import type { NapSchedule, NapLog, SleepType, ChildTaskType } from '../types';
import { useTaskStore } from './useTaskStore';
import { useEventStore } from './useEventStore';

interface NapState {
  napSchedules: NapSchedule[];
  napLogs: NapLog[];

  // Schedule actions
  addNapSchedule: (schedule: Omit<NapSchedule, 'id'>) => string;
  updateNapSchedule: (id: string, updates: Partial<Omit<NapSchedule, 'id'>>) => void;
  removeNapSchedule: (id: string) => void;
  clearNapSchedules: () => void;
  replaceNapData: (napSchedules: NapSchedule[], napLogs: NapLog[]) => void;
  getSchedulesForChild: (childId: string) => NapSchedule[];

  // Sleep log actions (supports both naps and night sleep)
  startNap: (childId: string) => string;
  startSleep: (childId: string, sleepType: SleepType) => string;
  endNap: (childId: string) => void;
  endSleep: (childId: string) => void;
  updateNapLog: (logId: string, updates: Partial<Pick<NapLog, 'startedAt' | 'endedAt'>>) => void;
  deleteNapLog: (logId: string) => void;
  clearNapLogs: () => void;
  getNapsForDate: (date: string) => NapLog[];
  getActiveNaps: () => NapLog[];
  getActiveSleep: () => NapLog[];
  isChildNapping: (childId: string) => boolean;
  isChildSleeping: (childId: string) => boolean;
  getActiveSleepForChild: (childId: string) => NapLog | undefined;
  getLastWakeTime: (childId: string) => string | null;
  getLogsForTimelineDate: (date: string) => NapLog[];
}

/**
 * Auto-complete a child's task (bedtime or wake-up) for today
 */
function autoCompleteChildTask(childId: string, taskType: ChildTaskType) {
  const taskStore = useTaskStore.getState();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Find the task for this child and type
  const task = taskStore.tasks.find(
    (t) => t.childId === childId && t.childTaskType === taskType && t.isActive
  );

  if (!task) return;

  // Find today's instance for this task
  const instance = taskStore.taskInstances.find(
    (i) => i.taskId === task.id && i.date === today && i.status !== 'completed'
  );

  if (instance) {
    taskStore.completeTask(instance.id);
  }
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

      replaceNapData: (napSchedules, napLogs) => {
        set({ napSchedules, napLogs });
      },

      getSchedulesForChild: (childId) => {
        return get()
          .napSchedules.filter((schedule) => schedule.childId === childId)
          .sort((a, b) => a.napNumber - b.napNumber);
      },

      // Sleep log actions (supports both naps and night sleep)
      startNap: (childId) => {
        return get().startSleep(childId, 'nap');
      },

      startSleep: (childId, sleepType) => {
        const now = new Date();
        const id = uuidv4();
        const newLog: NapLog = {
          id,
          childId,
          date: format(now, 'yyyy-MM-dd'),
          startedAt: now.toISOString(),
          endedAt: null,
          sleepType,
        };
        set((state) => ({
          napLogs: [...state.napLogs, newLog],
        }));

        // Auto-complete bedtime task for night sleep
        if (sleepType === 'night') {
          autoCompleteChildTask(childId, 'bedtime');
        }

        // Emit events
        useEventStore.getState().emitEvent('nap-start');
        useEventStore.getState().emitEvent(`nap-start:${childId}`);

        return id;
      },

      endNap: (childId) => {
        get().endSleep(childId);
      },

      endSleep: (childId) => {
        // Check if this was night sleep before ending it
        const activeSleep = get().napLogs.find(
          (log) => log.childId === childId && log.endedAt === null
        );
        const wasNightSleep = activeSleep?.sleepType === 'night';

        const now = new Date().toISOString();
        set((state) => ({
          napLogs: state.napLogs.map((log) =>
            log.childId === childId && log.endedAt === null
              ? { ...log, endedAt: now }
              : log
          ),
        }));

        // Auto-complete wake-up task for night sleep
        if (wasNightSleep) {
          autoCompleteChildTask(childId, 'wake-up');
        }

        // Emit events
        useEventStore.getState().emitEvent('nap-end');
        useEventStore.getState().emitEvent(`nap-end:${childId}`);
      },

      updateNapLog: (logId, updates) => {
        set((state) => ({
          napLogs: state.napLogs.map((log) =>
            log.id === logId ? { ...log, ...updates } : log
          ),
        }));
      },

      deleteNapLog: (logId) => {
        set((state) => ({
          napLogs: state.napLogs.filter((log) => log.id !== logId),
        }));
      },

      clearNapLogs: () => {
        set({ napLogs: [] });
      },

      getNapsForDate: (date) => {
        return get().napLogs.filter((log) => log.date === date);
      },

      getActiveNaps: () => {
        return get().napLogs.filter(
          (log) => log.endedAt === null && (log.sleepType === 'nap' || !log.sleepType)
        );
      },

      getActiveSleep: () => {
        return get().napLogs.filter((log) => log.endedAt === null);
      },

      isChildNapping: (childId) => {
        return get().napLogs.some(
          (log) =>
            log.childId === childId &&
            log.endedAt === null &&
            (log.sleepType === 'nap' || !log.sleepType)
        );
      },

      isChildSleeping: (childId) => {
        return get().napLogs.some(
          (log) => log.childId === childId && log.endedAt === null
        );
      },

      getActiveSleepForChild: (childId) => {
        return get().napLogs.find(
          (log) => log.childId === childId && log.endedAt === null
        );
      },

      getLastWakeTime: (childId) => {
        // Find the most recent ended sleep for this child
        const endedSleeps = get()
          .napLogs.filter((log) => log.childId === childId && log.endedAt !== null)
          .sort((a, b) => new Date(b.endedAt!).getTime() - new Date(a.endedAt!).getTime());

        return endedSleeps[0]?.endedAt || null;
      },

      getLogsForTimelineDate: (date) => {
        // Returns NapLogs that overlap with the given date
        // Handles overnight sleep (started previous day, ended today or ongoing)
        const logs = get().napLogs;
        const dateStart = new Date(`${date}T00:00:00`);

        return logs.filter((log) => {
          const startedAt = new Date(log.startedAt);
          const endedAt = log.endedAt ? new Date(log.endedAt) : new Date(); // Treat ongoing as "now"

          // Log overlaps with date if:
          // 1. Started on this date, OR
          // 2. Ended on this date, OR
          // 3. Spans across this date (started before, ended after or ongoing)
          const startsOnDate = log.date === date;
          const endsOnDate = log.endedAt && format(new Date(log.endedAt), 'yyyy-MM-dd') === date;
          const spansDate = startedAt < dateStart && endedAt > dateStart;

          return startsOnDate || endsOnDate || spansDate;
        });
      },
    }),
    {
      name: 'rhythm_naps',
    }
  )
);
