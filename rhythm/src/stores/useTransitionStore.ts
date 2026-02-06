import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { format, getDay } from 'date-fns';
import type { PendingTransition } from '../types';
import { useChildStore } from './useChildStore';
import { useNapStore } from './useNapStore';
import { useAwayStore } from './useAwayStore';
import { useCareBlockStore } from './useCareBlockStore';
import { useEventStore } from './useEventStore';

const AUTO_CONFIRM_MS = 30 * 60 * 1000; // 30 minutes

interface TransitionState {
  transitions: PendingTransition[];
  lastCheckedAt: string | null;

  checkForTransitions: () => void;
  confirmTransition: (id: string) => void;
  dismissTransition: (id: string) => void;
  autoConfirmStale: () => void;
  getPendingTransitions: () => PendingTransition[];
  clearTransitionsForDate: (date: string) => void;
}

function isTimePast(time: string, now: Date): boolean {
  const [h, m] = time.split(':').map(Number);
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return nowMins >= h * 60 + m;
}

function shouldBlockOccurToday(block: { recurrence: string | { type: string; days: number[] }; daysOfWeek?: number[]; oneOffDate?: string; isActive: boolean }, today: Date): boolean {
  if (!block.isActive) return false;
  const dayOfWeek = getDay(today);
  const dateStr = format(today, 'yyyy-MM-dd');

  if (block.recurrence === 'one-off') {
    return block.oneOffDate === dateStr;
  }
  if (block.daysOfWeek && block.daysOfWeek.length > 0) {
    return block.daysOfWeek.includes(dayOfWeek);
  }
  switch (block.recurrence) {
    case 'daily': return true;
    case 'weekdays': return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekends': return dayOfWeek === 0 || dayOfWeek === 6;
    default: {
      if (typeof block.recurrence === 'object' && block.recurrence.type === 'specific-days') {
        return block.recurrence.days.includes(dayOfWeek);
      }
      return false;
    }
  }
}

export const useTransitionStore = create<TransitionState>()(
  persist(
    (set, get) => ({
      transitions: [],
      lastCheckedAt: null,

      checkForTransitions: () => {
        const now = new Date();
        const today = format(now, 'yyyy-MM-dd');
        const children = useChildStore.getState().children;
        const blocks = useCareBlockStore.getState().blocks;
        const napSchedules = useNapStore.getState().napSchedules;
        const awayStore = useAwayStore.getState();
        const napStore = useNapStore.getState();
        const existing = get().transitions;

        const newTransitions: PendingTransition[] = [];

        // Check care blocks for today
        for (const block of blocks) {
          if (!shouldBlockOccurToday(block, now)) continue;
          if (block.blockType !== 'childcare' && block.blockType !== 'babysitter') continue;

          for (const childId of block.childIds) {
            const child = children.find((c) => c.id === childId);
            if (!child) continue;

            // Care block START: child should go away
            if (isTimePast(block.startTime, now)) {
              const alreadyExists = existing.some(
                (t) => t.type === 'care-block-start' && t.blockId === block.id && t.childId === childId && t.scheduledDate === today
              );
              const isAlreadyAway = awayStore.isChildAway(childId);

              if (!alreadyExists && !isAlreadyAway) {
                // Auto-flip: start away
                awayStore.startAway(childId, block.name);
                newTransitions.push({
                  id: uuidv4(),
                  type: 'care-block-start',
                  childId,
                  scheduledTime: block.startTime,
                  scheduledDate: today,
                  blockId: block.id,
                  description: `${child.name} at ${block.name}?`,
                  autoConfirmAfterMs: AUTO_CONFIRM_MS,
                  createdAt: now.toISOString(),
                  status: 'pending',
                });
              }
            }

            // Care block END: child should come home
            if (isTimePast(block.endTime, now)) {
              const alreadyExists = existing.some(
                (t) => t.type === 'care-block-end' && t.blockId === block.id && t.childId === childId && t.scheduledDate === today
              );
              const isCurrentlyAway = awayStore.isChildAway(childId);

              if (!alreadyExists && isCurrentlyAway) {
                // Auto-flip: end away
                awayStore.endAway(childId);
                newTransitions.push({
                  id: uuidv4(),
                  type: 'care-block-end',
                  childId,
                  scheduledTime: block.endTime,
                  scheduledDate: today,
                  blockId: block.id,
                  description: `${child.name} home from ${block.name}?`,
                  autoConfirmAfterMs: AUTO_CONFIRM_MS,
                  createdAt: now.toISOString(),
                  status: 'pending',
                });
              }
            }
          }
        }

        // Check nap schedules: suggest naps (don't auto-start)
        for (const schedule of napSchedules) {
          const child = children.find((c) => c.id === schedule.childId);
          if (!child || !child.isNappingAge) continue;

          if (isTimePast(schedule.typicalStart, now)) {
            const alreadyExists = existing.some(
              (t) => t.type === 'nap-start' && t.napScheduleId === schedule.id && t.scheduledDate === today
            );
            const isAlreadySleeping = napStore.isChildSleeping(schedule.childId);

            // Check if a nap has already happened around this schedule today
            const todayNaps = napStore.getNapsForDate(today).filter((n) => n.childId === schedule.childId);
            const napAlreadyTaken = todayNaps.length >= schedule.napNumber;

            if (!alreadyExists && !isAlreadySleeping && !napAlreadyTaken) {
              newTransitions.push({
                id: uuidv4(),
                type: 'nap-start',
                childId: schedule.childId,
                scheduledTime: schedule.typicalStart,
                scheduledDate: today,
                napScheduleId: schedule.id,
                description: `Time for ${child.name}'s nap? (usually ~${schedule.typicalStart})`,
                autoConfirmAfterMs: AUTO_CONFIRM_MS,
                createdAt: now.toISOString(),
                status: 'pending',
              });
            }
          }
        }

        if (newTransitions.length > 0) {
          set((state) => ({
            transitions: [...state.transitions, ...newTransitions],
          }));
        }

        // Auto-confirm stale transitions
        get().autoConfirmStale();

        set({ lastCheckedAt: now.toISOString() });
      },

      confirmTransition: (id) => {
        const transition = get().transitions.find((t) => t.id === id);

        set((state) => ({
          transitions: state.transitions.map((t) =>
            t.id === id ? { ...t, status: 'confirmed' } : t
          ),
        }));

        // Emit events on confirmation
        if (transition) {
          const eventStore = useEventStore.getState();
          if (transition.type === 'care-block-start') {
            eventStore.emitEvent('care-block-start');
            eventStore.emitEvent(`care-block-start:${transition.childId}`);
          } else if (transition.type === 'care-block-end') {
            eventStore.emitEvent('care-block-end');
            eventStore.emitEvent(`care-block-end:${transition.childId}`);
          }
        }
      },

      dismissTransition: (id) => {
        const transition = get().transitions.find((t) => t.id === id);
        if (!transition) return;

        // Revert auto-flipped state
        if (transition.type === 'care-block-start') {
          // Was auto-started as away — revert to home
          useAwayStore.getState().endAway(transition.childId);
        } else if (transition.type === 'care-block-end') {
          // Was auto-ended — re-start away
          const block = useCareBlockStore.getState().getBlock(transition.blockId!);
          useAwayStore.getState().startAway(transition.childId, block?.name);
        }

        set((state) => ({
          transitions: state.transitions.map((t) =>
            t.id === id ? { ...t, status: 'dismissed' } : t
          ),
        }));
      },

      autoConfirmStale: () => {
        const now = Date.now();
        set((state) => ({
          transitions: state.transitions.map((t) => {
            if (t.status !== 'pending') return t;
            const age = now - new Date(t.createdAt).getTime();
            if (age > t.autoConfirmAfterMs) {
              return { ...t, status: 'auto-confirmed' };
            }
            return t;
          }),
        }));
      },

      getPendingTransitions: () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        return get().transitions.filter(
          (t) => t.status === 'pending' && t.scheduledDate === today
        );
      },

      clearTransitionsForDate: (date) => {
        set((state) => ({
          transitions: state.transitions.filter((t) => t.scheduledDate !== date),
        }));
      },
    }),
    {
      name: 'rhythm_transitions',
    }
  )
);
