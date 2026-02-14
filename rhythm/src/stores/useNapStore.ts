import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { format, differenceInMinutes } from 'date-fns';
import type { NapSchedule, NapLog, SleepType, ChildTaskType } from '../types';
import { useTaskStore } from './useTaskStore';
import { useEventStore } from './useEventStore';

// Max durations before auto-closing an unended sleep (in minutes)
const MAX_NAP_MINUTES = 180;      // 3 hours
const MAX_NIGHT_MINUTES = 840;    // 14 hours
const DEFAULT_NAP_DURATION = 120; // fallback end: start + 2h
const DEFAULT_NIGHT_DURATION = 660; // fallback end: start + 11h

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

  // Expiry
  closeExpiredSleeps: () => void;

  // Auto-tracking
  startAutoNap: (childId: string, scheduledStartTime: string) => string;
  endAutoNap: (childId: string, scheduledEndTime: string) => void;
  revertAutoNap: (childId: string) => void;
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
        get().closeExpiredSleeps();
        return get().napLogs.filter(
          (log) => log.endedAt === null && (log.sleepType === 'nap' || !log.sleepType)
        );
      },

      getActiveSleep: () => {
        get().closeExpiredSleeps();
        return get().napLogs.filter((log) => log.endedAt === null);
      },

      isChildNapping: (childId) => {
        get().closeExpiredSleeps();
        return get().napLogs.some(
          (log) =>
            log.childId === childId &&
            log.endedAt === null &&
            (log.sleepType === 'nap' || !log.sleepType)
        );
      },

      isChildSleeping: (childId) => {
        get().closeExpiredSleeps();
        return get().napLogs.some(
          (log) => log.childId === childId && log.endedAt === null
        );
      },

      getActiveSleepForChild: (childId) => {
        get().closeExpiredSleeps();
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

      closeExpiredSleeps: () => {
        const now = new Date();
        const { napLogs, napSchedules } = get();
        const openLogs = napLogs.filter((log) => log.endedAt === null);
        if (openLogs.length === 0) return;

        let changed = false;
        const updated = napLogs.map((log) => {
          if (log.endedAt !== null) return log;

          const startedAt = new Date(log.startedAt);
          const elapsed = differenceInMinutes(now, startedAt);
          const isNap = log.sleepType === 'nap' || !log.sleepType;
          const maxMinutes = isNap ? MAX_NAP_MINUTES : MAX_NIGHT_MINUTES;

          if (elapsed <= maxMinutes) return log;

          // Find a matching schedule to get typical duration
          let duration = isNap ? DEFAULT_NAP_DURATION : DEFAULT_NIGHT_DURATION;
          if (isNap) {
            const childSchedules = napSchedules
              .filter((s) => s.childId === log.childId)
              .sort((a, b) => a.napNumber - b.napNumber);
            // Use first schedule's duration as a reasonable estimate
            if (childSchedules.length > 0) {
              const s = childSchedules[0];
              const [sh, sm] = s.typicalStart.split(':').map(Number);
              const [eh, em] = s.typicalEnd.split(':').map(Number);
              const scheduleDuration = (eh * 60 + em) - (sh * 60 + sm);
              if (scheduleDuration > 0) duration = scheduleDuration;
            }
          }

          const endedAt = new Date(startedAt.getTime() + duration * 60_000).toISOString();
          changed = true;
          return { ...log, endedAt };
        });

        if (changed) {
          set({ napLogs: updated });
        }
      },

      // Auto-tracking methods
      startAutoNap: (childId, scheduledStartTime) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const id = uuidv4();
        // Use the scheduled time, not "now", so if checking late the log is accurate
        const startedAt = new Date(`${today}T${scheduledStartTime}:00`);
        const newLog: NapLog = {
          id,
          childId,
          date: today,
          startedAt: startedAt.toISOString(),
          endedAt: null,
          sleepType: 'nap',
          autoTracked: true,
        };
        set((state) => ({
          napLogs: [...state.napLogs, newLog],
        }));

        useEventStore.getState().emitEvent('nap-start');
        useEventStore.getState().emitEvent(`nap-start:${childId}`);

        return id;
      },

      endAutoNap: (childId, scheduledEndTime) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const endedAt = new Date(`${today}T${scheduledEndTime}:00`).toISOString();

        set((state) => ({
          napLogs: state.napLogs.map((log) => {
            if (
              log.childId === childId &&
              log.endedAt === null &&
              log.autoTracked &&
              log.date === today &&
              (log.sleepType === 'nap' || !log.sleepType)
            ) {
              return { ...log, endedAt };
            }
            return log;
          }),
        }));

        useEventStore.getState().emitEvent('nap-end');
        useEventStore.getState().emitEvent(`nap-end:${childId}`);
      },

      revertAutoNap: (childId) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const logs = get().napLogs;
        // Find the most recent auto-tracked nap for this child today
        const autoNap = [...logs]
          .reverse()
          .find(
            (log) =>
              log.childId === childId &&
              log.date === today &&
              log.autoTracked &&
              (log.sleepType === 'nap' || !log.sleepType)
          );

        if (autoNap) {
          set((state) => ({
            napLogs: state.napLogs.filter((log) => log.id !== autoNap.id),
          }));
        }
      },
    }),
    {
      name: 'rhythm_naps',
    }
  )
);
