import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { format, getDay } from 'date-fns';
import type { CareBlock, CareBlockType, AvailabilityState, RecurrenceRule } from '../types';
import { useChildStore } from './useChildStore';
import { useNapStore } from './useNapStore';

/**
 * Maps CareBlockType to the AvailabilityState it creates
 */
function getAvailabilityFromBlockType(blockType: CareBlockType): AvailabilityState {
  switch (blockType) {
    case 'childcare':
    case 'babysitter':
      return 'free';
    case 'appointment':
    case 'activity':
      return 'unavailable';
    case 'sleep':
      return 'quiet';
    default:
      return 'parenting';
  }
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

/**
 * Check if a block should occur on a given date based on its recurrence
 */
function shouldBlockOccurOnDate(block: CareBlock, date: Date): boolean {
  if (!block.isActive) return false;

  const dayOfWeek = getDay(date); // 0 = Sunday
  const dateStr = format(date, 'yyyy-MM-dd');

  // One-off event
  if (block.recurrence === 'one-off') {
    return block.oneOffDate === dateStr;
  }

  // If daysOfWeek is set on the block, use it
  if (block.daysOfWeek && block.daysOfWeek.length > 0) {
    return block.daysOfWeek.includes(dayOfWeek);
  }

  // Otherwise use recurrence rule
  const recurrence = block.recurrence as RecurrenceRule;
  switch (recurrence) {
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6;
    case 'weekly':
      return dayOfWeek === 0; // Default to Sunday
    case 'monthly':
      return date.getDate() === 1;
    default:
      if (typeof recurrence === 'object' && recurrence.type === 'specific-days') {
        return recurrence.days.includes(dayOfWeek);
      }
      return false;
  }
}

/**
 * Adjust time by minutes (for travel time calculations)
 */
function adjustTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

interface CareBlockState {
  blocks: CareBlock[];

  // CRUD operations
  addBlock: (block: Omit<CareBlock, 'id'>) => string;
  updateBlock: (id: string, updates: Partial<Omit<CareBlock, 'id'>>) => void;
  removeBlock: (id: string) => void;
  clearBlocks: () => void;
  replaceBlocks: (blocks: CareBlock[]) => void;
  getBlock: (id: string) => CareBlock | undefined;

  // Query methods
  getBlocksForChild: (childId: string) => CareBlock[];
  getActiveBlocksForDate: (date: Date) => CareBlock[];
  getActiveBlocksNow: () => CareBlock[];

  // Availability computation
  getCurrentAvailabilityState: () => AvailabilityState;
  getAvailabilityForDateAndTime: (date: Date, time: string) => AvailabilityState;

  // Travel time helpers
  getLeaveByTime: (block: CareBlock) => string | null;
  getReturnTime: (block: CareBlock) => string | null;

  // Migration helper - convert ChildcareSchedule to CareBlock
  migrateFromChildcareSchedule: (schedule: {
    id: string;
    childId: string;
    name: string;
    daysOfWeek: number[];
    dropoffTime: string;
    pickupTime: string;
    isActive: boolean;
  }) => string;
}

export const useCareBlockStore = create<CareBlockState>()(
  persist(
    (set, get) => ({
      blocks: [],

      addBlock: (blockData) => {
        const id = uuidv4();
        const newBlock: CareBlock = { id, ...blockData };
        set((state) => ({
          blocks: [...state.blocks, newBlock],
        }));
        return id;
      },

      updateBlock: (id, updates) => {
        set((state) => ({
          blocks: state.blocks.map((block) =>
            block.id === id ? { ...block, ...updates } : block
          ),
        }));
      },

      removeBlock: (id) => {
        set((state) => ({
          blocks: state.blocks.filter((block) => block.id !== id),
        }));
      },

      clearBlocks: () => {
        set({ blocks: [] });
      },

      replaceBlocks: (blocks) => {
        set({ blocks });
      },

      getBlock: (id) => {
        return get().blocks.find((block) => block.id === id);
      },

      getBlocksForChild: (childId) => {
        return get().blocks.filter((block) => block.childIds.includes(childId));
      },

      getActiveBlocksForDate: (date) => {
        return get().blocks.filter((block) => shouldBlockOccurOnDate(block, date));
      },

      getActiveBlocksNow: () => {
        const now = new Date();
        const currentTime = getCurrentTimeString();
        const activeToday = get().getActiveBlocksForDate(now);

        return activeToday.filter((block) => {
          // Check if current time is within the block's time range
          // Account for travel time
          const effectiveStart = block.travelTimeBefore
            ? adjustTime(block.startTime, -block.travelTimeBefore)
            : block.startTime;
          const effectiveEnd = block.travelTimeAfter
            ? adjustTime(block.endTime, block.travelTimeAfter)
            : block.endTime;

          return isTimeBetween(currentTime, effectiveStart, effectiveEnd);
        });
      },

      getCurrentAvailabilityState: () => {
        const children = useChildStore.getState().children;
        const napLogs = useNapStore.getState().napLogs;
        const now = new Date();
        const currentTime = getCurrentTimeString();

        // Check if any children are currently napping
        const sleepingChildren = children.filter((child) => {
          const activeNap = napLogs.find(
            (log) =>
              log.childId === child.id &&
              log.endedAt === null &&
              format(new Date(log.startedAt), 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd')
          );
          return !!activeNap;
        });

        // Get active care blocks
        const activeBlocks = get().getActiveBlocksNow();

        // Determine highest-priority availability state
        // Priority: unavailable > free > quiet > parenting

        // Check for unavailable blocks first (travel time)
        for (const block of activeBlocks) {
          // During travel time before, we're unavailable
          if (block.travelTimeBefore) {
            const leaveByTime = adjustTime(block.startTime, -block.travelTimeBefore);
            if (isTimeBetween(currentTime, leaveByTime, block.startTime)) {
              return 'unavailable';
            }
          }

          // During travel time after, we're unavailable
          if (block.travelTimeAfter) {
            const returnTime = adjustTime(block.endTime, block.travelTimeAfter);
            if (isTimeBetween(currentTime, block.endTime, returnTime)) {
              return 'unavailable';
            }
          }

          // If we're in an appointment or activity with the kid
          const blockAvailability = getAvailabilityFromBlockType(block.blockType);
          if (blockAvailability === 'unavailable') {
            return 'unavailable';
          }
        }

        // Check if all children are away (free state from childcare/babysitter)
        const awayBlocks = activeBlocks.filter((block) => {
          const availability = getAvailabilityFromBlockType(block.blockType);
          return availability === 'free';
        });

        if (awayBlocks.length > 0 && children.length > 0) {
          // Check if all children are covered by "free" blocks
          const allChildrenAway = children.every((child) =>
            awayBlocks.some((block) => block.childIds.includes(child.id))
          );
          if (allChildrenAway) {
            return 'free';
          }
        }

        // Check if any children are napping (quiet state)
        if (sleepingChildren.length > 0) {
          // If all children are either napping or away, it's quiet time
          const allQuietOrAway = children.every((child) => {
            const isNapping = sleepingChildren.some((c) => c.id === child.id);
            const isAway = awayBlocks.some((block) => block.childIds.includes(child.id));
            return isNapping || isAway;
          });
          if (allQuietOrAway) {
            return 'quiet';
          }
        }

        // Check for sleep blocks (bedtime, scheduled naps)
        const sleepBlocks = activeBlocks.filter((block) => block.blockType === 'sleep');
        if (sleepBlocks.length > 0 && children.length > 0) {
          const allChildrenAsleep = children.every((child) =>
            sleepBlocks.some((block) => block.childIds.includes(child.id))
          );
          if (allChildrenAsleep) {
            return 'quiet';
          }
        }

        // Default: parenting
        return 'parenting';
      },

      getAvailabilityForDateAndTime: (date, time) => {
        const children = useChildStore.getState().children;
        const activeBlocks = get().getActiveBlocksForDate(date);

        // Filter blocks active at the specified time
        const blocksAtTime = activeBlocks.filter((block) => {
          const effectiveStart = block.travelTimeBefore
            ? adjustTime(block.startTime, -block.travelTimeBefore)
            : block.startTime;
          const effectiveEnd = block.travelTimeAfter
            ? adjustTime(block.endTime, block.travelTimeAfter)
            : block.endTime;

          return isTimeBetween(time, effectiveStart, effectiveEnd);
        });

        // Check travel time (unavailable)
        for (const block of blocksAtTime) {
          if (block.travelTimeBefore) {
            const leaveByTime = adjustTime(block.startTime, -block.travelTimeBefore);
            if (isTimeBetween(time, leaveByTime, block.startTime)) {
              return 'unavailable';
            }
          }
          if (block.travelTimeAfter) {
            const returnTime = adjustTime(block.endTime, block.travelTimeAfter);
            if (isTimeBetween(time, block.endTime, returnTime)) {
              return 'unavailable';
            }
          }

          const blockAvailability = getAvailabilityFromBlockType(block.blockType);
          if (blockAvailability === 'unavailable') {
            return 'unavailable';
          }
        }

        // Check for free state
        const awayBlocks = blocksAtTime.filter((block) =>
          getAvailabilityFromBlockType(block.blockType) === 'free'
        );
        if (awayBlocks.length > 0 && children.length > 0) {
          const allChildrenAway = children.every((child) =>
            awayBlocks.some((block) => block.childIds.includes(child.id))
          );
          if (allChildrenAway) {
            return 'free';
          }
        }

        // Check for quiet state
        const sleepBlocks = blocksAtTime.filter((block) => block.blockType === 'sleep');
        if (sleepBlocks.length > 0 && children.length > 0) {
          const allChildrenAsleep = children.every((child) =>
            sleepBlocks.some((block) => block.childIds.includes(child.id))
          );
          if (allChildrenAsleep) {
            return 'quiet';
          }
        }

        return 'parenting';
      },

      getLeaveByTime: (block) => {
        if (!block.travelTimeBefore) return null;
        return adjustTime(block.startTime, -block.travelTimeBefore);
      },

      getReturnTime: (block) => {
        if (!block.travelTimeAfter) return null;
        return adjustTime(block.endTime, block.travelTimeAfter);
      },

      migrateFromChildcareSchedule: (schedule) => {
        // Check if already migrated
        const existing = get().blocks.find(
          (b) =>
            b.name === schedule.name &&
            b.childIds.includes(schedule.childId) &&
            b.blockType === 'childcare'
        );
        if (existing) return existing.id;

        return get().addBlock({
          childIds: [schedule.childId],
          name: schedule.name,
          blockType: 'childcare',
          recurrence: 'weekdays', // Default, will be overridden by daysOfWeek
          daysOfWeek: schedule.daysOfWeek,
          startTime: schedule.dropoffTime,
          endTime: schedule.pickupTime,
          isActive: schedule.isActive,
        });
      },
    }),
    {
      name: 'rhythm_care_blocks',
    }
  )
);
