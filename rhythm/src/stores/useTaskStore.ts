import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { format, getDay, subDays, differenceInDays, parseISO } from 'date-fns';
import type { Task, TaskInput, TaskInstance, TaskStatus, CareStatus, ChildTaskType, ChildcareSchedule, AvailabilityState } from '../types';
import { useChildStore } from './useChildStore';
import { useEventStore } from './useEventStore';

/**
 * Check if a task is suggested for the current availability state.
 * Uses the new bestWhen field, falling back to legacy napContext/careContext.
 */
export function isTaskSuggestedForAvailability(
  task: Task,
  currentAvailability: AvailabilityState
): boolean {
  // If task has bestWhen set, use it
  if (task.bestWhen && task.bestWhen.length > 0) {
    return task.bestWhen.includes(currentAvailability);
  }

  // Fall back to legacy logic for migration compatibility
  // Convert napContext to availability suggestion
  if (task.napContext && task.napContext !== 'any') {
    switch (task.napContext) {
      case 'both-asleep':
        return currentAvailability === 'quiet';
      case 'baby-asleep':
      case 'toddler-asleep':
        return currentAvailability === 'quiet';
      case 'both-awake':
        return currentAvailability === 'parenting';
    }
  }

  // Convert careContext to availability suggestion
  if (task.careContext && task.careContext !== 'any') {
    switch (task.careContext) {
      case 'all-away':
      case 'any-away':
        return currentAvailability === 'free' || currentAvailability === 'quiet';
      case 'all-home':
        return currentAvailability === 'parenting';
    }
  }

  // No specific availability preference
  return false;
}

const SEED_MAX_AGE_DAYS = 14;

/**
 * Get the new care status based on completing a child task type
 */
function getStatusFromTaskType(taskType: ChildTaskType): CareStatus | null {
  switch (taskType) {
    case 'bedtime':
      return 'asleep';
    case 'dropoff':
      return 'away';
    case 'wake-up':
    case 'pickup':
      return 'home';
    default:
      return null;
  }
}

/**
 * Get the display title for a task (prepends child name for child-linked tasks)
 */
export function getTaskDisplayTitle(task: Task, getChild: (id: string) => { name: string } | undefined): string {
  if (task.childId && task.childTaskType) {
    const child = getChild(task.childId);
    if (child) {
      return `${child.name} ${task.title}`;
    }
  }
  return task.title;
}


interface TaskState {
  tasks: Task[];
  taskInstances: TaskInstance[];

  // Task template actions
  addTask: (task: TaskInput) => string;
  updateTask: (id: string, updates: Partial<TaskInput>) => void;
  deleteTask: (id: string) => void;
  clearTasks: () => void;
  replaceTasks: (tasks: Task[], taskInstances: TaskInstance[]) => void;
  getTask: (id: string) => Task | undefined;

  // Task instance actions
  completeTask: (instanceId: string) => void;
  skipTask: (instanceId: string) => void;
  deferTask: (instanceId: string, deferToDate: string | null) => void;
  resetTaskInstance: (instanceId: string) => void;
  updateTaskCompletionTime: (instanceId: string, completedAt: string) => void;

  // Daily management
  generateDailyInstances: (date: Date) => void;
  getInstancesForDate: (date: string) => TaskInstance[];
  getDeferredTasks: () => TaskInstance[];

  // Meal task actions
  updateMealPlan: (taskId: string, date: string, meal: string) => void;
  getMealPlan: (taskId: string, date: string) => string | undefined;

  // Seeds queue management
  getSeeds: () => TaskInstance[];
  addSeed: (title: string, napContext: Task['napContext'], category?: Task['category']) => void;
  promoteToToday: (instanceId: string) => void;
  dismissSeed: (instanceId: string) => void;
  archiveOldSeeds: () => void;

  // Childcare task management
  ensureChildcareTasksExist: (schedule: ChildcareSchedule) => void;
  removeChildcareTasksForSchedule: (scheduleId: string) => void;
  getChildcareTasksForSchedule: (scheduleId: string) => Task[];
}

/**
 * Check if a task should occur on a given date based on its recurrence rule
 */
export function shouldTaskOccurOnDate(task: Task, date: Date): boolean {
  if (!task.isActive) return false;

  const dayOfWeek = getDay(date); // 0 = Sunday

  // If daysOfWeek is set, use it as the day filter
  if (task.daysOfWeek != null && task.daysOfWeek.length > 0) {
    return task.daysOfWeek.includes(dayOfWeek);
  }

  // Otherwise fall back to recurrence rules
  switch (task.recurrence) {
    case 'daily':
      return true;

    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;

    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6;

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
        const newTask = { id, ...taskData } as Task;
        set((state) => ({
          tasks: [...state.tasks, newTask],
        }));
        return id;
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updates } as Task : task
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

      clearTasks: () => {
        set({ tasks: [], taskInstances: [] });
      },

      replaceTasks: (tasks, taskInstances) => {
        set({ tasks, taskInstances });
      },

      getTask: (id) => {
        return get().tasks.find((task) => task.id === id);
      },

      // Task instance actions
      completeTask: (instanceId) => {
        const instance = get().taskInstances.find((i) => i.id === instanceId);
        const task = instance ? get().tasks.find((t) => t.id === instance.taskId) : null;

        // No-op for informational tasks
        if (task?.isInformational) {
          return;
        }

        set((state) => ({
          taskInstances: state.taskInstances.map((i) =>
            i.id === instanceId
              ? {
                  ...i,
                  status: 'completed' as TaskStatus,
                  completedAt: new Date().toISOString(),
                }
              : i
          ),
        }));

        // Update care status for child tasks (but not for bedtime - that's now handled by sleep timer)
        if (task?.childTaskType && task?.childId && task.childTaskType !== 'bedtime') {
          const newStatus = getStatusFromTaskType(task.childTaskType);
          if (newStatus) {
            useChildStore.getState().updateCareStatus(task.childId, newStatus);
          }
        }

        // Emit task-complete event
        if (task) {
          useEventStore.getState().emitEvent(`task-complete:${task.id}`);
        }
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

      updateTaskCompletionTime: (instanceId, completedAt) => {
        set((state) => ({
          taskInstances: state.taskInstances.map((instance) =>
            instance.id === instanceId
              ? {
                  ...instance,
                  status: 'completed' as TaskStatus,
                  completedAt,
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

      // Meal task actions
      updateMealPlan: (taskId, date, meal) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id !== taskId || task.type !== 'meal') return task;
            const plannedMeals = { ...task.plannedMeals, [date]: meal };
            return { ...task, plannedMeals };
          }),
        }));
      },

      getMealPlan: (taskId, date) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task || task.type !== 'meal') return undefined;
        return task.plannedMeals?.[date];
      },

      // Seeds queue management
      getSeeds: () => {
        return get().taskInstances.filter(
          (instance) => instance.status === 'deferred'
        );
      },

      addSeed: (title, napContext, category = 'other') => {
        // Create task template
        const taskId = uuidv4();
        const newTask: Task = {
          id: taskId,
          type: 'standard',
          title,
          tier: 'tending',
          scheduledTime: null,
          recurrence: 'daily',
          napContext,
          isActive: true,
          category,
        };

        // Create deferred instance (yesterday's date so it shows in seeds)
        const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
        const newInstance: TaskInstance = {
          id: uuidv4(),
          taskId,
          date: yesterday,
          status: 'deferred',
          completedAt: null,
          deferredTo: null,
        };

        set((state) => ({
          tasks: [...state.tasks, newTask],
          taskInstances: [...state.taskInstances, newInstance],
        }));
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

      // Childcare task management
      ensureChildcareTasksExist: (schedule) => {
        const { tasks } = get();

        // Check if tasks already exist (using a marker in the task)
        const existingDropoff = tasks.find((t) =>
          t.childId === schedule.childId &&
          t.childTaskType === 'dropoff' &&
          t.title === `dropoff (${schedule.name})`
        );
        const existingPickup = tasks.find((t) =>
          t.childId === schedule.childId &&
          t.childTaskType === 'pickup' &&
          t.title === `pickup (${schedule.name})`
        );

        const newTasks: Task[] = [];

        if (!existingDropoff) {
          newTasks.push({
            id: uuidv4(),
            type: 'standard',
            title: `dropoff (${schedule.name})`,
            tier: 'anchor',
            scheduledTime: schedule.dropoffTime,
            recurrence: 'daily',
            daysOfWeek: schedule.daysOfWeek,
            napContext: null,
            isActive: schedule.isActive,
            category: 'kids',
            preferredTimeBlock: 'morning',
            childId: schedule.childId,
            childTaskType: 'dropoff',
          });
        }

        if (!existingPickup) {
          newTasks.push({
            id: uuidv4(),
            type: 'standard',
            title: `pickup (${schedule.name})`,
            tier: 'anchor',
            scheduledTime: schedule.pickupTime,
            recurrence: 'daily',
            daysOfWeek: schedule.daysOfWeek,
            napContext: null,
            isActive: schedule.isActive,
            category: 'kids',
            preferredTimeBlock: 'afternoon',
            childId: schedule.childId,
            childTaskType: 'pickup',
          });
        }

        if (newTasks.length > 0) {
          set((state) => ({
            tasks: [...state.tasks, ...newTasks],
          }));
        }

        // Update existing tasks if schedule changed
        if (existingDropoff || existingPickup) {
          set((state) => ({
            tasks: state.tasks.map((task) => {
              if (task.childId === schedule.childId && task.title === `dropoff (${schedule.name})`) {
                return {
                  ...task,
                  scheduledTime: schedule.dropoffTime,
                  daysOfWeek: schedule.daysOfWeek,
                  isActive: schedule.isActive,
                };
              }
              if (task.childId === schedule.childId && task.title === `pickup (${schedule.name})`) {
                return {
                  ...task,
                  scheduledTime: schedule.pickupTime,
                  daysOfWeek: schedule.daysOfWeek,
                  isActive: schedule.isActive,
                };
              }
              return task;
            }),
          }));
        }
      },

      removeChildcareTasksForSchedule: (_scheduleId) => {
        // We identify tasks by their title pattern since we don't store scheduleId on tasks
        // This is a limitation - in a real app we'd add a scheduleId field to tasks
        // For now, we'll need to be careful about task cleanup
      },

      getChildcareTasksForSchedule: (_scheduleId) => {
        // Similar limitation as above
        return [];
      },
    }),
    {
      name: 'rhythm_tasks',
      version: 4,
      migrate: (persisted: unknown, version: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let state = persisted as any;

        if (version < 2) {
          state = {
            ...state,
            tasks: (state.tasks as any[]).map((task: any) => {
              if (task.type === 'meal') return task;
              if (task.category === 'meals') {
                const titleLower = (task.title as string).toLowerCase();
                const mealType = titleLower.includes('breakfast') ? 'breakfast'
                  : titleLower.includes('lunch') ? 'lunch'
                  : titleLower.includes('dinner') ? 'dinner'
                  : 'dinner';
                return { ...task, type: 'meal', mealType };
              }
              if (!('type' in task)) {
                return { ...task, type: 'standard' };
              }
              return task;
            }),
          };
        }

        if (version < 3) {
          // Mark bedtime tasks as informational
          state = {
            ...state,
            tasks: (state.tasks as any[]).map((task: any) => {
              if (task.childTaskType === 'bedtime') {
                return { ...task, isInformational: true };
              }
              return task;
            }),
          };
        }

        if (version < 4) {
          // Add triggeredBy and triggerDelayMinutes to existing tasks
          state = {
            ...state,
            tasks: (state.tasks as any[]).map((task: any) => ({
              ...task,
              triggeredBy: task.triggeredBy ?? null,
              triggerDelayMinutes: task.triggerDelayMinutes ?? null,
            })),
          };
        }

        return state as TaskState;
      },
    }
  )
);
