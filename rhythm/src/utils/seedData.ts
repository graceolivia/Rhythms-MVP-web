import { format } from 'date-fns';
import type { Child, NapSchedule, Task, TaskInstance } from '../types';

// ============================================
// SAMPLE CHILDREN
// ============================================

export const seedChildren: Omit<Child, 'id'>[] = [
  {
    name: 'Milo',
    birthdate: '2022-04-10',
    isNappingAge: true,
  },
  {
    name: 'Hazel',
    birthdate: '2024-07-15',
    isNappingAge: true,
  },
];

// ============================================
// NAP SCHEDULES (childId will be set after children are created)
// ============================================

export const seedNapSchedules: Omit<NapSchedule, 'id' | 'childId'>[] = [
  // Milo (toddler) - one afternoon nap
  {
    napNumber: 1,
    typicalStart: '13:00',
    typicalEnd: '15:00',
  },
];

export const seedBabyNapSchedules: Omit<NapSchedule, 'id' | 'childId'>[] = [
  // Hazel (baby) - two naps
  {
    napNumber: 1,
    typicalStart: '09:30',
    typicalEnd: '11:00',
  },
  {
    napNumber: 2,
    typicalStart: '13:30',
    typicalEnd: '15:00',
  },
];

// ============================================
// TASKS (Templates)
// ============================================

export const seedTasks: Omit<Task, 'id'>[] = [
  // ANCHORS - fixed time events
  {
    title: 'Milo daycare dropoff',
    tier: 'anchor',
    scheduledTime: '08:45',
    recurrence: 'weekdays',
    napContext: null,
    isActive: true,
    category: 'kids',
  },
  {
    title: 'Milo pickup',
    tier: 'anchor',
    scheduledTime: '12:30',
    recurrence: 'weekdays',
    napContext: null,
    isActive: true,
    category: 'kids',
  },
  {
    title: 'Hazel bedtime',
    tier: 'anchor',
    scheduledTime: '19:00',
    recurrence: 'daily',
    napContext: null,
    isActive: true,
    category: 'kids',
  },
  {
    title: 'Milo bedtime',
    tier: 'anchor',
    scheduledTime: '20:00',
    recurrence: 'daily',
    napContext: null,
    isActive: true,
    category: 'kids',
  },

  // RHYTHMS - daily non-negotiables
  {
    title: 'Breakfast for everyone',
    tier: 'rhythm',
    scheduledTime: null,
    recurrence: 'daily',
    napContext: 'any',
    isActive: true,
    category: 'meals',
  },
  {
    title: 'Dress & change both kids',
    tier: 'rhythm',
    scheduledTime: null,
    recurrence: 'daily',
    napContext: 'both-awake',
    isActive: true,
    category: 'kids',
  },
  {
    title: 'Lunch for me',
    tier: 'rhythm',
    scheduledTime: null,
    recurrence: 'daily',
    napContext: 'any',
    isActive: true,
    category: 'self-care',
  },
  {
    title: 'Lunch for Milo',
    tier: 'rhythm',
    scheduledTime: null,
    recurrence: 'daily',
    napContext: 'any',
    isActive: true,
    category: 'meals',
  },
  {
    title: 'Dinner for everyone',
    tier: 'rhythm',
    scheduledTime: null,
    recurrence: 'daily',
    napContext: 'any',
    isActive: true,
    category: 'meals',
  },
  {
    title: 'House reset',
    tier: 'rhythm',
    scheduledTime: null,
    recurrence: 'daily',
    napContext: 'both-asleep',
    isActive: true,
    category: 'tidying',
  },

  // TENDING - nice to haves
  {
    title: 'Empty dishwasher',
    tier: 'tending',
    scheduledTime: null,
    recurrence: 'daily',
    napContext: 'baby-asleep',
    isActive: true,
    category: 'kitchen',
  },
  {
    title: 'Wipe kitchen counters',
    tier: 'tending',
    scheduledTime: null,
    recurrence: 'daily',
    napContext: 'any',
    isActive: true,
    category: 'kitchen',
  },
  {
    title: 'Sweep kitchen',
    tier: 'tending',
    scheduledTime: null,
    recurrence: 'daily',
    napContext: 'both-asleep',
    isActive: true,
    category: 'kitchen',
  },
  {
    title: 'Focused computer work',
    tier: 'tending',
    scheduledTime: null,
    recurrence: 'daily',
    napContext: 'both-asleep',
    isActive: true,
    category: 'focus-work',
  },
  {
    title: 'Fold laundry',
    tier: 'tending',
    scheduledTime: null,
    recurrence: 'daily',
    napContext: 'toddler-asleep',
    isActive: true,
    category: 'laundry',
  },
  {
    title: 'Start a load of laundry',
    tier: 'tending',
    scheduledTime: null,
    recurrence: { type: 'specific-days', days: [1, 3, 5] }, // Mon, Wed, Fri
    napContext: 'any',
    isActive: true,
    category: 'laundry',
  },
  {
    title: 'Vacuum living room',
    tier: 'tending',
    scheduledTime: null,
    recurrence: 'weekly',
    napContext: 'both-awake',
    isActive: true,
    category: 'cleaning',
  },
];

// ============================================
// CHECK IF SEED DATA SHOULD BE LOADED
// ============================================

export function shouldLoadSeedData(): boolean {
  // Only load in development mode
  if (import.meta.env.PROD) {
    return false;
  }

  // Check if user has onboarded (rhythm_children exists with data)
  const existingChildren = localStorage.getItem('rhythm_children');
  if (!existingChildren) {
    return true;
  }

  try {
    const parsed = JSON.parse(existingChildren);
    // Zustand persist wraps state in { state: { children: [] }, version: 0 }
    const children = parsed?.state?.children ?? parsed?.children ?? parsed;
    return !children || (Array.isArray(children) && children.length === 0);
  } catch {
    return true;
  }
}

// ============================================
// LOAD SEED DATA INTO STORES
// ============================================

export function loadSeedData(stores: {
  childStore: {
    getState: () => { children: Child[]; addChild: (child: Omit<Child, 'id'>) => string };
  };
  napStore: {
    getState: () => { addNapSchedule: (schedule: Omit<NapSchedule, 'id'>) => string };
  };
  taskStore: {
    getState: () => { addTask: (task: Omit<Task, 'id'>) => string };
  };
}): void {
  console.log('🌱 Loading seed data for development...');

  const childState = stores.childStore.getState();
  const napState = stores.napStore.getState();
  const taskState = stores.taskStore.getState();

  // Add children and track their IDs
  const childIds: string[] = [];
  seedChildren.forEach((child) => {
    const id = childState.addChild(child);
    childIds.push(id);
  });

  // Add nap schedules for Milo (first child - toddler)
  if (childIds[0]) {
    seedNapSchedules.forEach((schedule) => {
      napState.addNapSchedule({ ...schedule, childId: childIds[0] });
    });
  }

  // Add nap schedules for Hazel (second child - baby)
  if (childIds[1]) {
    seedBabyNapSchedules.forEach((schedule) => {
      napState.addNapSchedule({ ...schedule, childId: childIds[1] });
    });
  }

  // Add tasks
  seedTasks.forEach((task) => {
    taskState.addTask(task);
  });

  console.log('✅ Seed data loaded!');
}
