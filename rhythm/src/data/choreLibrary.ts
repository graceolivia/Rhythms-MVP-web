import type { TaskTier, TaskCategory, NapContext, RecurrenceRule, AvailabilityState } from '../types';

export interface ChoreTemplate {
  title: string;
  tier: TaskTier;
  category: TaskCategory;
  napContext: NapContext | null;
  scheduledTime?: string;
  // New fields for Phase 3
  bestWhen?: AvailabilityState[];
  recurrence?: RecurrenceRule;
  routineGroup?: string;
  isChoreQueue?: boolean;
}

export interface ChoreCategory {
  id: TaskCategory;
  label: string;
  emoji: string;
  chores: ChoreTemplate[];
}

export const choreLibrary: ChoreCategory[] = [
  {
    id: 'meals',
    label: 'Meals',
    emoji: '🍳',
    chores: [
      { title: 'Make breakfast', tier: 'routine', category: 'meals', napContext: 'any', routineGroup: 'morning' },
      { title: 'Pack lunches', tier: 'routine', category: 'meals', napContext: 'any', routineGroup: 'morning' },
      { title: 'Lunch for kids', tier: 'routine', category: 'meals', napContext: 'any' },
      { title: 'Lunch for me', tier: 'routine', category: 'meals', napContext: 'any', bestWhen: ['quiet'] },
      { title: 'Afternoon snack', tier: 'routine', category: 'meals', napContext: 'both-awake', bestWhen: ['parenting'] },
      { title: 'Make dinner', tier: 'routine', category: 'meals', napContext: 'any' },
      { title: 'Meal prep', tier: 'todo', category: 'meals', napContext: 'both-asleep', bestWhen: ['quiet', 'free'], recurrence: 'weekly' },
      { title: 'Plan weekly meals', tier: 'todo', category: 'meals', napContext: 'both-asleep', bestWhen: ['quiet', 'free'], recurrence: 'weekly' },
      { title: 'Grocery list', tier: 'todo', category: 'meals', napContext: 'any', bestWhen: ['quiet'], recurrence: 'weekly' },
    ],
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    emoji: '🧽',
    chores: [
      { title: 'Load dishwasher', tier: 'routine', category: 'kitchen', napContext: 'any' },
      { title: 'Empty dishwasher', tier: 'todo', category: 'kitchen', napContext: 'baby-asleep', bestWhen: ['quiet'] },
      { title: 'Hand wash dishes', tier: 'todo', category: 'kitchen', napContext: 'both-asleep', bestWhen: ['quiet'] },
      { title: 'Wipe counters', tier: 'todo', category: 'kitchen', napContext: 'any' },
      { title: 'Clean stovetop', tier: 'todo', category: 'kitchen', napContext: 'both-asleep', bestWhen: ['quiet'], recurrence: 'weekly' },
      { title: 'Clean out fridge', tier: 'todo', category: 'kitchen', napContext: 'both-asleep', bestWhen: ['quiet', 'free'], recurrence: 'weekly', isChoreQueue: true },
      { title: 'Take out kitchen trash', tier: 'todo', category: 'kitchen', napContext: 'any' },
      { title: 'Wipe down appliances', tier: 'todo', category: 'kitchen', napContext: 'both-asleep', bestWhen: ['quiet'], recurrence: 'weekly', isChoreQueue: true },
    ],
  },
  {
    id: 'laundry',
    label: 'Laundry',
    emoji: '👕',
    chores: [
      { title: 'Start a load of laundry', tier: 'todo', category: 'laundry', napContext: 'any', recurrence: { type: 'specific-days', days: [1, 4] } }, // Mon & Thu
      { title: 'Switch laundry to dryer', tier: 'todo', category: 'laundry', napContext: 'any' },
      { title: 'Fold laundry', tier: 'todo', category: 'laundry', napContext: 'toddler-asleep', bestWhen: ['quiet'] },
      { title: 'Put away laundry', tier: 'todo', category: 'laundry', napContext: 'any', bestWhen: ['parenting'] },
      { title: 'Sort dirty laundry', tier: 'todo', category: 'laundry', napContext: 'any', recurrence: 'weekly' },
      { title: 'Wash bedding', tier: 'todo', category: 'laundry', napContext: 'both-awake', bestWhen: ['parenting'], recurrence: 'weekly' },
      { title: 'Iron clothes', tier: 'todo', category: 'laundry', napContext: 'both-asleep', bestWhen: ['quiet', 'free'] },
    ],
  },
  {
    id: 'tidying',
    label: 'Tidying',
    emoji: '🧹',
    chores: [
      { title: 'Morning tidy up', tier: 'routine', category: 'tidying', napContext: 'both-awake', routineGroup: 'morning', bestWhen: ['parenting'] },
      { title: 'Evening reset', tier: 'routine', category: 'tidying', napContext: 'both-asleep', routineGroup: 'bedtime', bestWhen: ['quiet'] },
      { title: 'Make beds', tier: 'todo', category: 'tidying', napContext: 'any', routineGroup: 'morning' },
      { title: 'Pick up toys', tier: 'todo', category: 'tidying', napContext: 'both-awake', bestWhen: ['parenting'] },
      { title: 'Clear clutter hotspots', tier: 'todo', category: 'tidying', napContext: 'any' },
      { title: 'Tidy entryway', tier: 'todo', category: 'tidying', napContext: 'any' },
      { title: 'Sort mail/papers', tier: 'todo', category: 'tidying', napContext: 'both-asleep', bestWhen: ['quiet', 'free'], recurrence: 'weekly', isChoreQueue: true },
      { title: 'Organize one drawer', tier: 'todo', category: 'tidying', napContext: 'both-asleep', bestWhen: ['quiet', 'free'], recurrence: 'weekly', isChoreQueue: true },
    ],
  },
  {
    id: 'cleaning',
    label: 'Cleaning',
    emoji: '✨',
    chores: [
      { title: 'Sweep floors', tier: 'todo', category: 'cleaning', napContext: 'both-asleep', bestWhen: ['quiet'], recurrence: 'weekly' },
      { title: 'Vacuum', tier: 'todo', category: 'cleaning', napContext: 'both-awake', bestWhen: ['parenting'], recurrence: 'weekly' },
      { title: 'Mop floors', tier: 'todo', category: 'cleaning', napContext: 'both-asleep', bestWhen: ['quiet', 'free'], recurrence: 'weekly' },
      { title: 'Clean bathroom sink', tier: 'todo', category: 'cleaning', napContext: 'any', recurrence: 'weekly' },
      { title: 'Clean toilet', tier: 'todo', category: 'cleaning', napContext: 'both-asleep', bestWhen: ['quiet'], recurrence: 'weekly', isChoreQueue: true },
      { title: 'Clean shower/tub', tier: 'todo', category: 'cleaning', napContext: 'both-asleep', bestWhen: ['quiet', 'free'], recurrence: 'weekly' },
      { title: 'Dust surfaces', tier: 'todo', category: 'cleaning', napContext: 'both-asleep', bestWhen: ['quiet'], recurrence: 'weekly', isChoreQueue: true },
      { title: 'Clean mirrors', tier: 'todo', category: 'cleaning', napContext: 'any', recurrence: 'weekly', isChoreQueue: true },
      { title: 'Wipe light switches & handles', tier: 'todo', category: 'cleaning', napContext: 'any', recurrence: 'weekly', isChoreQueue: true },
    ],
  },
  {
    id: 'errands',
    label: 'Errands',
    emoji: '🚗',
    chores: [
      { title: 'Grocery shopping', tier: 'todo', category: 'errands', napContext: null, bestWhen: ['free'], recurrence: 'weekly' },
      { title: 'Return library books', tier: 'todo', category: 'errands', napContext: null, bestWhen: ['free'] },
      { title: 'Pick up prescriptions', tier: 'todo', category: 'errands', napContext: null, bestWhen: ['free'] },
      { title: 'Mail packages', tier: 'todo', category: 'errands', napContext: null, bestWhen: ['free'] },
      { title: 'Take car for service', tier: 'todo', category: 'errands', napContext: null, bestWhen: ['free'] },
      { title: 'Bank errands', tier: 'todo', category: 'errands', napContext: null, bestWhen: ['free'] },
      { title: 'Drop off donations', tier: 'todo', category: 'errands', napContext: null, bestWhen: ['free'] },
    ],
  },
  {
    id: 'self-care',
    label: 'Self-Care',
    emoji: '💆',
    chores: [
      { title: 'Eat a real lunch', tier: 'routine', category: 'self-care', napContext: 'both-asleep', bestWhen: ['quiet'] },
      { title: 'Drink water', tier: 'routine', category: 'self-care', napContext: 'any' },
      { title: 'Take vitamins/meds', tier: 'routine', category: 'self-care', napContext: 'any', routineGroup: 'morning' },
      { title: 'Shower', tier: 'todo', category: 'self-care', napContext: 'both-asleep', bestWhen: ['quiet', 'free'] },
      { title: 'Exercise/movement', tier: 'todo', category: 'self-care', napContext: 'any', bestWhen: ['free'] },
      { title: 'Read for pleasure', tier: 'todo', category: 'self-care', napContext: 'both-asleep', bestWhen: ['quiet'] },
      { title: 'Call a friend', tier: 'todo', category: 'self-care', napContext: 'both-asleep', bestWhen: ['quiet', 'free'] },
      { title: 'Journal/reflect', tier: 'todo', category: 'self-care', napContext: 'both-asleep', bestWhen: ['quiet'] },
      { title: 'Rest/nap', tier: 'todo', category: 'self-care', napContext: 'both-asleep', bestWhen: ['quiet'] },
    ],
  },
  {
    id: 'kids',
    label: 'Kids',
    emoji: '👶',
    chores: [
      { title: 'Morning wake up routine', tier: 'fixed-schedule', category: 'kids', napContext: null, scheduledTime: '07:00', routineGroup: 'morning' },
      { title: 'Get kids dressed', tier: 'routine', category: 'kids', napContext: 'both-awake', bestWhen: ['parenting'], routineGroup: 'morning' },
      { title: 'Brush teeth (morning)', tier: 'routine', category: 'kids', napContext: 'both-awake', bestWhen: ['parenting'], routineGroup: 'morning' },
      { title: 'Brush teeth (evening)', tier: 'routine', category: 'kids', napContext: 'both-awake', bestWhen: ['parenting'], routineGroup: 'bedtime' },
      { title: 'Bath time', tier: 'routine', category: 'kids', napContext: 'both-awake', bestWhen: ['parenting'], routineGroup: 'bedtime' },
      { title: 'Bedtime routine', tier: 'fixed-schedule', category: 'kids', napContext: null, scheduledTime: '19:30', routineGroup: 'bedtime' },
      { title: 'Read stories', tier: 'todo', category: 'kids', napContext: 'both-awake', bestWhen: ['parenting'], routineGroup: 'bedtime' },
      { title: 'Outdoor play time', tier: 'todo', category: 'kids', napContext: 'both-awake', bestWhen: ['parenting'] },
      { title: 'Art/craft activity', tier: 'todo', category: 'kids', napContext: 'toddler-asleep', bestWhen: ['parenting'] },
      { title: 'School pickup', tier: 'fixed-schedule', category: 'kids', napContext: null, scheduledTime: '15:00' },
      { title: 'School dropoff', tier: 'fixed-schedule', category: 'kids', napContext: null, scheduledTime: '08:30' },
    ],
  },
  {
    id: 'focus-work',
    label: 'Focus Work',
    emoji: '💻',
    chores: [
      { title: 'Focused computer work', tier: 'todo', category: 'focus-work', napContext: 'both-asleep', bestWhen: ['quiet', 'free'] },
      { title: 'Pay bills', tier: 'todo', category: 'focus-work', napContext: 'both-asleep', bestWhen: ['quiet', 'free'], recurrence: 'weekly' },
      { title: 'Check/respond to emails', tier: 'todo', category: 'focus-work', napContext: 'both-asleep', bestWhen: ['quiet', 'free'] },
      { title: 'Schedule appointments', tier: 'todo', category: 'focus-work', napContext: 'both-asleep', bestWhen: ['quiet', 'free'] },
      { title: 'Budget review', tier: 'todo', category: 'focus-work', napContext: 'both-asleep', bestWhen: ['quiet', 'free'], recurrence: 'weekly' },
      { title: 'Creative project time', tier: 'todo', category: 'focus-work', napContext: 'both-asleep', bestWhen: ['quiet', 'free'] },
    ],
  },
];

// Helper functions
export function getChoresByCategory(category: TaskCategory): ChoreTemplate[] {
  const cat = choreLibrary.find((c) => c.id === category);
  return cat?.chores || [];
}

export function getChoresByTier(tier: TaskTier): ChoreTemplate[] {
  return choreLibrary.flatMap((cat) => cat.chores.filter((c) => c.tier === tier));
}

export function getAllChores(): ChoreTemplate[] {
  return choreLibrary.flatMap((cat) => cat.chores);
}

export function getAnchors(): ChoreTemplate[] {
  return getChoresByTier('fixed-schedule');
}

export function getRhythms(): ChoreTemplate[] {
  return getChoresByTier('routine');
}

export function getTending(): ChoreTemplate[] {
  return getChoresByTier('todo');
}
