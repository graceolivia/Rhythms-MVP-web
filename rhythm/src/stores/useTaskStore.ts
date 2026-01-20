import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { format, getDay, subDays, differenceInDays, parseISO } from 'date-fns';
import type { Task, TaskInstance, TaskStatus } from '../types';

const SEED_MAX_AGE_DAYS = 14;

interface TaskState {
  tasks: Task[];
  taskInstances: TaskInstance[];

  // Task template actions
  addTask: (task: Omit<Task, 'id'>) => string;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id'>>) => void;
  deleteTask: (id: string) => void;
  getTask: (id: string) => Task | undefined;

  // Task instance actions
  completeTask: (instanceId: string) => void;
  skipTask: (instanceId: string) => void;
  deferTask: (instanceId: string, deferToDate: string) => void;
  resetTaskInstance: (instanceId: string) => void;

  // Daily management
  generateDailyInstances: (date: Date) => void;
  getInstancesForDate: (date: string) => TaskInstance[];
  getDeferredTasks: () => TaskInstance[];

  // Seeds queue management
  getSeeds: () => TaskInstance[];
  promoteToToday: (instanceId: string) => void;
  dismissSeed: (instanceId: string) => void;
  archiveOldSeeds: () => void;
}

/**
 * Check if a task should occur on a given date based on its recurrence rule
 */
function shouldTaskOccurOnDate(task: Task, date: Date): boolean {
  if (!task.isActive) return false;

  const dayOfWeek = getDay(date); // 0 = Sunday

  switch (task.recurrence) {
    case 'daily':
      return true;

    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;

    case 'weekly':
      // Default to Sunday for weekly tasks
      return dayOfWeek === 0;

    case 'monthly':
      // Default to 1st of month
      return date.getDate() === 1;

    default:
      // Handle specific-days recurrence
      if (typeof task.recurrence === 'object' && task.recurrence.type === 'specific-days') {
        return task.recurrence.days.includes(dayOfWeek);
      }
      return false;
  }
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      taskInstances: [],

      // Task template actions
      addTask: (taskData) => {
        const id = uuidv4();
        const newTask: Task = { id, ...taskData };
        set((state) => ({
          tasks: [...state.tasks, newTask],
        }));
        return id;
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updates } : task
          ),
        }));
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== id),
          // Also remove any instances of this task
          taskInstances: state.taskInstances.filter((instance) => instance.taskId !== id),
        }));
      },

      getTask: (id) => {
        return get().tasks.find((task) => task.id === id);
      },

      // Task instance actions
      completeTask: (instanceId) => {
        set((state) => ({
          taskInstances: state.taskInstances.map((instance) =>
            instance.id === instanceId
              ? {
                  ...instance,
                  status: 'completed' as TaskStatus,
                  completedAt: new Date().toISOString(),
                }
              : instance
          ),
        }));
      },

      skipTask: (instanceId) => {
        set((state) => ({
          taskInstances: state.taskInstances.map((instance) =>
            instance.id === instanceId
              ? { ...instance, status: 'skipped' as TaskStatus }
              : instance
          ),
        }));
      },

      deferTask: (instanceId, deferToDate) => {
        set((state) => ({
          taskInstances: state.taskInstances.map((instance) =>
            instance.id === instanceId
              ? {
                  ...instance,
                  status: 'deferred' as TaskStatus,
                  deferredTo: deferToDate,
                }
              : instance
          ),
        }));
      },

      resetTaskInstance: (instanceId) => {
        set((state) => ({
          taskInstances: state.taskInstances.map((instance) =>
            instance.id === instanceId
              ? {
                  ...instance,
                  status: 'pending' as TaskStatus,
                  completedAt: null,
                  deferredTo: null,
                }
              : instance
          ),
        }));
      },

      // Daily management
      generateDailyInstances: (date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const yesterdayStr = format(subDays(date, 1), 'yyyy-MM-dd');
        const { tasks, taskInstances, archiveOldSeeds } = get();

        // First, archive old seeds
        archiveOldSeeds();

        // Move incomplete tending tasks from yesterday to seeds queue
        const updatedInstances = taskInstances.map((instance) => {
          // Only process yesterday's pending tending tasks
          if (instance.date !== yesterdayStr || instance.status !== 'pending') {
            return instance;
          }

          const task = tasks.find((t) => t.id === instance.taskId);
          if (task?.tier === 'tending') {
            // Move to seeds queue by marking as deferred
            return {
              ...instance,
              status: 'deferred' as TaskStatus,
              deferredTo: null, // null means "seeds queue" not a specific date
            };
          }

          return instance;
        });

        // Check which tasks already have instances for this date
        const existingTaskIds = new Set(
          updatedInstances
            .filter((instance) => instance.date === dateStr)
            .map((instance) => instance.taskId)
        );

        // Generate new instances for tasks that should occur today
        const newInstances: TaskInstance[] = tasks
          .filter((task) => shouldTaskOccurOnDate(task, date) && !existingTaskIds.has(task.id))
          .map((task) => ({
            id: uuidv4(),
            taskId: task.id,
            date: dateStr,
            status: 'pending' as TaskStatus,
            completedAt: null,
            deferredTo: null,
          }));

        set({
          taskInstances: [...updatedInstances, ...newInstances],
        });
      },

      getInstancesForDate: (date) => {
        return get().taskInstances.filter((instance) => instance.date === date);
      },

      getDeferredTasks: () => {
        return get().taskInstances.filter((instance) => instance.status === 'deferred');
      },

      // Seeds queue management
      getSeeds: () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        return get().taskInstances.filter(
          (instance) =>
            instance.status === 'deferred' &&
            instance.date !== today // Not today's tasks
        );
      },

      promoteToToday: (instanceId) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        set((state) => ({
          taskInstances: state.taskInstances.map((instance) =>
            instance.id === instanceId
              ? {
                  ...instance,
                  date: today,
                  status: 'pending' as TaskStatus,
                  deferredTo: null,
                }
              : instance
          ),
        }));
      },

      dismissSeed: (instanceId) => {
        set((state) => ({
          taskInstances: state.taskInstances.map((instance) =>
            instance.id === instanceId
              ? { ...instance, status: 'skipped' as TaskStatus }
              : instance
          ),
        }));
      },

      archiveOldSeeds: () => {
        const today = new Date();
        set((state) => ({
          taskInstances: state.taskInstances.map((instance) => {
            // Only process deferred (seeds) instances
            if (instance.status !== 'deferred') {
              return instance;
            }

            const instanceDate = parseISO(instance.date);
            const ageInDays = differenceInDays(today, instanceDate);

            // Auto-archive seeds older than 14 days
            if (ageInDays > SEED_MAX_AGE_DAYS) {
              return { ...instance, status: 'skipped' as TaskStatus };
            }

            return instance;
          }),
        }));
      },
    }),
    {
      name: 'rhythm_tasks',
    }
  )
);
