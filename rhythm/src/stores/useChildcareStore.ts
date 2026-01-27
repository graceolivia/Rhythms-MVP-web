import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { getDay } from 'date-fns';
import type { ChildcareSchedule } from '../types';

interface ChildcareState {
  schedules: ChildcareSchedule[];
  addSchedule: (schedule: Omit<ChildcareSchedule, 'id'>) => string;
  updateSchedule: (id: string, updates: Partial<Omit<ChildcareSchedule, 'id'>>) => void;
  removeSchedule: (id: string) => void;
  removeSchedulesForChild: (childId: string) => void;
  clearSchedules: () => void;
  getSchedulesForChild: (childId: string) => ChildcareSchedule[];
  getActiveSchedulesForDate: (childId: string, date: Date) => ChildcareSchedule[];
  isChildScheduledAway: (childId: string, date: Date) => boolean;
  isChildCurrentlyScheduledAway: (childId: string) => boolean;
}

/**
 * Check if a time string (HH:mm) is between two other time strings
 */
function isTimeBetween(current: string, start: string, end: string): boolean {
  const [currentH, currentM] = current.split(':').map(Number);
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);

  const currentMins = currentH * 60 + currentM;
  const startMins = startH * 60 + startM;
  const endMins = endH * 60 + endM;

  return currentMins >= startMins && currentMins < endMins;
}

/**
 * Get current time as HH:mm string
 */
function getCurrentTimeString(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export const useChildcareStore = create<ChildcareState>()(
  persist(
    (set, get) => ({
      schedules: [],

      addSchedule: (scheduleData) => {
        const id = uuidv4();
        const newSchedule: ChildcareSchedule = { id, ...scheduleData };
        set((state) => ({
          schedules: [...state.schedules, newSchedule],
        }));
        return id;
      },

      updateSchedule: (id, updates) => {
        set((state) => ({
          schedules: state.schedules.map((schedule) =>
            schedule.id === id ? { ...schedule, ...updates } : schedule
          ),
        }));
      },

      removeSchedule: (id) => {
        set((state) => ({
          schedules: state.schedules.filter((schedule) => schedule.id !== id),
        }));
      },

      removeSchedulesForChild: (childId) => {
        set((state) => ({
          schedules: state.schedules.filter((schedule) => schedule.childId !== childId),
        }));
      },

      clearSchedules: () => {
        set({ schedules: [] });
      },

      getSchedulesForChild: (childId) => {
        return get().schedules.filter((s) => s.childId === childId);
      },

      getActiveSchedulesForDate: (childId, date) => {
        const dayOfWeek = getDay(date); // 0 = Sunday
        return get().schedules.filter(
          (s) => s.childId === childId && s.isActive && s.daysOfWeek.includes(dayOfWeek)
        );
      },

      isChildScheduledAway: (childId, date) => {
        const activeSchedules = get().getActiveSchedulesForDate(childId, date);
        return activeSchedules.length > 0;
      },

      isChildCurrentlyScheduledAway: (childId) => {
        const now = new Date();
        const activeSchedules = get().getActiveSchedulesForDate(childId, now);
        if (activeSchedules.length === 0) return false;

        const currentTime = getCurrentTimeString();
        return activeSchedules.some((s) =>
          isTimeBetween(currentTime, s.dropoffTime, s.pickupTime)
        );
      },
    }),
    {
      name: 'rhythm_childcare',
    }
  )
);
