import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { getDay } from 'date-fns';
import type { HabitBlock, HabitBlockItem } from '../types';
import { useTaskStore } from './useTaskStore';
import { useEventStore } from './useEventStore';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function shouldBlockOccurOnDate(block: HabitBlock, date: Date): boolean {
  if (!block.isActive) return false;
  const dayOfWeek = getDay(date);

  if (block.daysOfWeek && block.daysOfWeek.length > 0) {
    return block.daysOfWeek.includes(dayOfWeek);
  }

  switch (block.recurrence) {
    case 'daily': return true;
    case 'weekdays': return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekends': return dayOfWeek === 0 || dayOfWeek === 6;
    case 'weekly': return dayOfWeek === 0;
    default:
      if (typeof block.recurrence === 'object' && block.recurrence.type === 'specific-days') {
        return block.recurrence.days.includes(dayOfWeek);
      }
      return false;
  }
}

interface HabitBlockState {
  blocks: HabitBlock[];
  choreQueuePicks: Record<string, string>; // date → taskId

  // CRUD
  addBlock: (block: Omit<HabitBlock, 'id'>) => string;
  updateBlock: (id: string, updates: Partial<Omit<HabitBlock, 'id'>>) => void;
  removeBlock: (id: string) => void;
  getBlock: (id: string) => HabitBlock | undefined;
  replaceBlocks: (blocks: HabitBlock[]) => void;

  // Item management
  addItemToBlock: (blockId: string, item: Omit<HabitBlockItem, 'order'>) => void;
  removeItemFromBlock: (blockId: string, taskId: string) => void;
  reorderBlockItems: (blockId: string, items: HabitBlockItem[]) => void;
  updateBlockItem: (blockId: string, taskId: string, updates: Partial<HabitBlockItem>) => void;

  // Queries
  getBlocksForDate: (date: Date) => HabitBlock[];
  getActiveBlockNow: () => HabitBlock | null;
  getNextBlock: () => HabitBlock | null;
  getBlockOrder: () => HabitBlock[];

  // Chore queue
  getTodaysChoreQueuePick: (date: string) => string | null;
  setTodaysChoreQueuePick: (date: string, taskId: string) => void;
  shuffleChoreQueuePick: (date: string) => string | null;

  // Seeding
  seedDefaultBlocks: (childIds: string[]) => void;
}

export const useHabitBlockStore = create<HabitBlockState>()(
  persist(
    (set, get) => ({
      blocks: [],
      choreQueuePicks: {},

      addBlock: (blockData) => {
        const id = uuidv4();
        const block: HabitBlock = { id, ...blockData };
        set((state) => ({ blocks: [...state.blocks, block] }));
        return id;
      },

      updateBlock: (id, updates) => {
        set((state) => ({
          blocks: state.blocks.map((b) =>
            b.id === id ? { ...b, ...updates } : b
          ),
        }));
      },

      removeBlock: (id) => {
        set((state) => ({
          blocks: state.blocks.filter((b) => b.id !== id),
        }));
      },

      getBlock: (id) => {
        return get().blocks.find((b) => b.id === id);
      },

      replaceBlocks: (blocks) => {
        set({ blocks });
      },

      addItemToBlock: (blockId, item) => {
        set((state) => ({
          blocks: state.blocks.map((b) => {
            if (b.id !== blockId) return b;
            const maxOrder = b.items.reduce((max, i) => Math.max(max, i.order), 0);
            return {
              ...b,
              items: [...b.items, { ...item, order: maxOrder + 1 }],
            };
          }),
        }));
      },

      removeItemFromBlock: (blockId, taskId) => {
        set((state) => ({
          blocks: state.blocks.map((b) => {
            if (b.id !== blockId) return b;
            const filtered = b.items.filter((i) => i.taskId !== taskId);
            // Re-order remaining items
            const reordered = filtered.map((item, idx) => ({ ...item, order: idx + 1 }));
            return { ...b, items: reordered };
          }),
        }));
      },

      reorderBlockItems: (blockId, items) => {
        set((state) => ({
          blocks: state.blocks.map((b) =>
            b.id === blockId ? { ...b, items } : b
          ),
        }));
      },

      updateBlockItem: (blockId, taskId, updates) => {
        set((state) => ({
          blocks: state.blocks.map((b) => {
            if (b.id !== blockId) return b;
            return {
              ...b,
              items: b.items.map((i) =>
                i.taskId === taskId ? { ...i, ...updates } : i
              ),
            };
          }),
        }));
      },

      getBlocksForDate: (date) => {
        return get().blocks.filter((b) => shouldBlockOccurOnDate(b, date));
      },

      getActiveBlockNow: () => {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const todaysBlocks = get().getBlocksForDate(now);

        // Sort time-anchored blocks by start time
        const timeBlocks = todaysBlocks
          .filter((b) => b.anchor.type === 'time' && b.anchor.time)
          .sort((a, b) => timeToMinutes(a.anchor.time!) - timeToMinutes(b.anchor.time!));

        // Find which block's time window we're in
        for (let i = 0; i < timeBlocks.length; i++) {
          const block = timeBlocks[i];
          const startMins = timeToMinutes(block.anchor.time!);

          // End time is either the block's estimated end, or the next block's start, whichever is earlier
          let endMins: number;
          if (block.estimatedEndTime) {
            endMins = timeToMinutes(block.estimatedEndTime);
          } else if (i + 1 < timeBlocks.length) {
            endMins = timeToMinutes(timeBlocks[i + 1].anchor.time!);
          } else {
            // Last block: assume 90 minutes
            endMins = startMins + 90;
          }

          if (currentMinutes >= startMins && currentMinutes < endMins) {
            return block;
          }
        }

        // Check event-triggered blocks
        const eventBlocks = todaysBlocks.filter((b) => b.anchor.type === 'event' && b.anchor.eventKey);
        for (const block of eventBlocks) {
          if (useEventStore.getState().hasEventFired(block.anchor.eventKey!)) {
            // Event-triggered block is active for 90 minutes after event fires
            const ts = useEventStore.getState().getEventTimestamp(block.anchor.eventKey!);
            if (ts) {
              const firedAt = new Date(ts);
              const elapsed = (now.getTime() - firedAt.getTime()) / 60000;
              const duration = block.estimatedEndTime
                ? timeToMinutes(block.estimatedEndTime) - timeToMinutes(block.anchor.time || '00:00')
                : 90;
              if (elapsed < duration) {
                return block;
              }
            }
          }
        }

        return null;
      },

      getNextBlock: () => {
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const todaysBlocks = get().getBlocksForDate(now);

        const timeBlocks = todaysBlocks
          .filter((b) => b.anchor.type === 'time' && b.anchor.time)
          .sort((a, b) => timeToMinutes(a.anchor.time!) - timeToMinutes(b.anchor.time!));

        return timeBlocks.find((b) => timeToMinutes(b.anchor.time!) > currentMinutes) ?? null;
      },

      getBlockOrder: () => {
        const todaysBlocks = get().getBlocksForDate(new Date());
        return todaysBlocks
          .filter((b) => b.anchor.type === 'time' && b.anchor.time)
          .sort((a, b) => timeToMinutes(a.anchor.time!) - timeToMinutes(b.anchor.time!));
      },

      getTodaysChoreQueuePick: (date) => {
        const existing = get().choreQueuePicks[date];
        if (existing) return existing;

        // Auto-pick on first access
        const taskStore = useTaskStore.getState();
        const choreQueueTasks = taskStore.tasks.filter((t) => t.isChoreQueue && t.isActive);
        if (choreQueueTasks.length === 0) return null;

        // Find tasks not completed today
        const todaysInstances = taskStore.getInstancesForDate(date);
        const completedTaskIds = new Set(
          todaysInstances.filter((i) => i.status === 'completed').map((i) => i.taskId)
        );
        const available = choreQueueTasks.filter((t) => !completedTaskIds.has(t.id));
        if (available.length === 0) return null;

        // Pick a random one
        const pick = available[Math.floor(Math.random() * available.length)];
        get().setTodaysChoreQueuePick(date, pick.id);
        return pick.id;
      },

      setTodaysChoreQueuePick: (date, taskId) => {
        set((state) => ({
          choreQueuePicks: { ...state.choreQueuePicks, [date]: taskId },
        }));
      },

      shuffleChoreQueuePick: (date) => {
        const currentPick = get().choreQueuePicks[date];
        const taskStore = useTaskStore.getState();
        const choreQueueTasks = taskStore.tasks.filter((t) => t.isChoreQueue && t.isActive);

        const todaysInstances = taskStore.getInstancesForDate(date);
        const completedTaskIds = new Set(
          todaysInstances.filter((i) => i.status === 'completed').map((i) => i.taskId)
        );
        const available = choreQueueTasks.filter(
          (t) => !completedTaskIds.has(t.id) && t.id !== currentPick
        );

        if (available.length === 0) return currentPick ?? null;

        const pick = available[Math.floor(Math.random() * available.length)];
        get().setTodaysChoreQueuePick(date, pick.id);
        return pick.id;
      },

      seedDefaultBlocks: (childIds) => {
        // Import default blocks dynamically to avoid circular deps
        import('../data/defaultBlocks').then(({ createDefaultBlocks }) => {
          const { blocks: newBlocks, choreTasks } = createDefaultBlocks(childIds);

          // Add chore queue tasks
          const taskStore = useTaskStore.getState();
          for (const chore of choreTasks) {
            // Check if task with this title already exists
            const existing = taskStore.tasks.find(
              (t) => t.title.toLowerCase() === chore.title.toLowerCase()
            );
            if (!existing) {
              taskStore.addTask({
                type: 'standard',
                title: chore.title,
                tier: 'tending',
                scheduledTime: null,
                recurrence: 'daily',
                napContext: null,
                isActive: true,
                category: chore.category,
                isChoreQueue: true,
              });
            } else if (!existing.isChoreQueue) {
              taskStore.updateTask(existing.id, { isChoreQueue: true });
            }
          }

          // Add blocks, resolving task references
          for (const blockDef of newBlocks) {
            const resolvedItems: HabitBlockItem[] = [];

            for (const item of blockDef.items) {
              if (item.choreQueueSlot) {
                resolvedItems.push(item);
                continue;
              }

              // Find or create the task
              let task = taskStore.tasks.find(
                (t) => t.title.toLowerCase() === item.taskId.toLowerCase()
              );

              if (!task) {
                // Create a new task for this block item
                const id = taskStore.addTask({
                  type: 'standard',
                  title: item.taskId, // taskId is title in default blocks before resolution
                  tier: 'tending',
                  scheduledTime: null,
                  recurrence: 'daily',
                  napContext: null,
                  isActive: true,
                  category: 'other',
                });
                task = taskStore.getTask(id);
              }

              if (task) {
                resolvedItems.push({ ...item, taskId: task.id });
              }
            }

            get().addBlock({
              ...blockDef,
              items: resolvedItems,
            });
          }
        });
      },
    }),
    {
      name: 'rhythm_habit_blocks',
      version: 1,
    }
  )
);
