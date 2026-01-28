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
      { title: 'Make breakfast', tier: 'rhythm', category: 'meals', napContext: 'any', routineGroup: 'morning' },
      { title: 'Pack lunches', tier: 'rhythm', category: 'meals', napContext: 'any', routineGroup: 'morning' },
      { title: 'Lunch for kids', tier: 'rhythm', category: 'meals', napContext: 'any' },
      { title: 'Lunch for me', tier: 'rhythm', category: 'meals', napContext: 'any', bestWhen: ['quiet'] },
      { title: 'Afternoon snack', tier: 'rhythm', category: 'meals', napContext: 'both-awake', bestWhen: ['parenting'] },
      { title: 'Make dinner', tier: 'rhythm', category: 'meals', napContext: 'any' },
      { title: 'Meal prep', tier: 'tending', category: 'meals', napContext: 'both-asleep', bestWhen: ['quiet', 'free'], recurrence: 'weekly' },
      { title: 'Plan weekly meals', tier: 'tending', category: 'meals', napContext: 'both-asleep', bestWhen: ['quiet', 'free'], recurrence: 'weekly' },
      { title: 'Grocery list', tier: 'tending', category: 'meals', napContext: 'any', bestWhen: ['quiet'], recurrence: 'weekly' },
    ],
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    emoji: '🧽',
    chores: [
      { title: 'Load dishwasher', tier: 'rhythm', category: 'kitchen', napContext: 'any' },
      { title: 'Empty dishwasher', tier: 'tending', category: 'kitchen', napContext: 'baby-asleep', bestWhen: ['quiet'] },
      { title: 'Hand wash dishes', tier: 'tending', category: 'kitchen', napContext: 'both-asleep', bestWhen: ['quiet'] },
      { title: 'Wipe counters', tier: 'tending', category: 'kitchen', napContext: 'any' },
      { title: 'Clean stovetop', tier: 'tending', category: 'kitchen', napContext: 'both-asleep', bestWhen: ['quiet'], recurrence: 'weekly' },
      { title: 'Clean out fridge', tier: 'tending', category: 'kitchen', napContext: 'both-asleep', bestWhen: ['quiet', 'free'], recurrence: 'weekly' },
      { title: 'Take out kitchen trash', tier: 'tending', category: 'kitchen', napContext: 'any' },
      { title: 'Wipe down appliances', tier: 'tending', category: 'kitchen', napContext: 'both-asleep', bestWhen: ['quiet'], recurrence: 'weekly' },
    ],
  },
  {
    id: 'laundry',
    label: 'Laundry',
    emoji: '👕',
    chores: [
      { title: 'Start a load of laundry', tier: 'tending', category: 'laundry', napContext: 'any', recurrence: { type: 'specific-days', days: [1, 4] } }, // Mon & Thu
      { title: 'Switch laundry to dryer', tier: 'tending', category: 'laundry', napContext: 'any' },
      { title: 'Fold laundry', tier: 'tending', category: 'laundry', napContext: 'toddler-asleep', bestWhen: ['quiet'] },
      { title: 'Put away laundry', tier: 'tending', category: 'laundry', napContext: 'any', bestWhen: ['parenting'] },
      { title: 'Sort dirty laundry', tier: 'tending', category: 'laundry', napContext: 'any', recurrence: 'weekly' },
      { title: 'Wash bedding', tier: 'tending', category: 'laundry', napContext: 'both-awake', bestWhen: ['parenting'], recurrence: 'weekly' },
      { title: 'Iron clothes', tier: 'tending', category: 'laundry', napContext: 'both-asleep', bestWhen: ['quiet', 'free'] },
    ],
  },
  {
    id: 'tidying',
    label: 'Tidying',
    emoji: '🧹',
    chores: [
      { title: 'Morning tidy up', tier: 'rhythm', category: 'tidying', napContext: 'both-awake', routineGroup: 'morning', bestWhen: ['parenting'] },
      { title: 'Evening reset', tier: 'rhythm', category: 'tidying', napContext: 'both-asleep', routineGroup: 'bedtime', bestWhen: ['quiet'] },
      { title: 'Make beds', tier: 'tending', category: 'tidying', napContext: 'any', routineGroup: 'morning' },
      { title: 'Pick up toys', tier: 'tending', category: 'tidying', napContext: 'both-awake', bestWhen: ['parenting'] },
      { title: 'Clear clutter hotspots', tier: 'tending', category: 'tidying', napContext: 'any' },
      { title: 'Tidy entryway', tier: 'tending', category: 'tidying', napContext: 'any' },
      { title: 'Sort mail/papers', tier: 'tending', category: 'tidying', napContext: 'both-asleep', bestWhen: ['quiet', 'free'], recurrence: 'weekly' },
      { title: 'Organize one drawer', tier: 'tending', category: 'tidying', napContext: 'both-asleep', bestWhen: ['quiet', 'free'], recurrence: 'weekly' },
    ],
  },
  {
    id: 'cleaning',
    label: 'Cleaning',
    emoji: '✨',
    chores: [
      { title: 'Sweep floors', tier: 'tending', category: 'cleaning', napContext: 'both-asleep', bestWhen: ['quiet'], recurrence: 'weekly' },
      { title: 'Vacuum', tier: 'tending', category: 'cleaning', napContext: 'both-awake', bestWhen: ['parenting'], recurrence: 'weekly' },
      { title: 'Mop floors', tier: 'tending', category: 'cleaning', napContext: 'both-asleep', bestWhen: ['quiet', 'free'], recurrence: 'weekly' },
      { title: 'Clean bathroom sink', tier: 'tending', category: 'cleaning', napContext: 'any', recurrence: 'weekly' },
      { title: 'Clean toilet', tier: 'tending', category: 'cleaning', napContext: 'both-asleep', bestWhen: ['quiet'], recurrence: 'weekly' },
      { title: 'Clean shower/tub', tier: 'tending', category: 'cleaning', napContext: 'both-asleep', bestWhen: ['quiet', 'free'], recurrence: 'weekly' },
      { title: 'Dust surfaces', tier: 'tending', category: 'cleaning', napContext: 'both-asleep', bestWhen: ['quiet'], recurrence: 'weekly' },
      { title: 'Clean mirrors', tier: 'tending', category: 'cleaning', napContext: 'any', recurrence: 'weekly' },
      { title: 'Wipe light switches & handles', tier: 'tending', category: 'cleaning', napContext: 'any', recurrence: 'weekly' },
    ],
  },
  {
    id: 'errands',
    label: 'Errands',
    emoji: '🚗',
    chores: [
      { title: 'Grocery shopping', tier: 'tending', category: 'errands', napContext: null, bestWhen: ['free'], recurrence: 'weekly' },
      { title: 'Return library books', tier: 'tending', category: 'errands', napContext: null, bestWhen: ['free'] },
      { title: 'Pick up prescriptions', tier: 'tending', category: 'errands', napContext: null, bestWhen: ['free'] },
      { title: 'Mail packages', tier: 'tending', category: 'errands', napContext: null, bestWhen: ['free'] },
      { title: 'Take car for service', tier: 'tending', category: 'errands', napContext: null, bestWhen: ['free'] },
      { title: 'Bank errands', tier: 'tending', category: 'errands', napContext: null, bestWhen: ['free'] },
      { title: 'Drop off donations', tier: 'tending', category: 'errands', napContext: null, bestWhen: ['free'] },
    ],
  },
  {
    id: 'self-care',
    label: 'Self-Care',
    emoji: '💆',
    chores: [
      { title: 'Eat a real lunch', tier: 'rhythm', category: 'self-care', napContext: 'both-asleep', bestWhen: ['quiet'] },
      { title: 'Drink water', tier: 'rhythm', category: 'self-care', napContext: 'any' },
      { title: 'Take vitamins/meds', tier: 'rhythm', category: 'self-care', napContext: 'any', routineGroup: 'morning' },
      { title: 'Shower', tier: 'tending', category: 'self-care', napContext: 'both-asleep', bestWhen: ['quiet', 'free'] },
      { title: 'Exercise/movement', tier: 'tending', category: 'self-care', napContext: 'any', bestWhen: ['free'] },
      { title: 'Read for pleasure', tier: 'tending', category: 'self-care', napContext: 'both-asleep', bestWhen: ['quiet'] },
      { title: 'Call a friend', tier: 'tending', category: 'self-care', napContext: 'both-asleep', bestWhen: ['quiet', 'free'] },
      { title: 'Journal/reflect', tier: 'tending', category: 'self-care', napContext: 'both-asleep', bestWhen: ['quiet'] },
      { title: 'Rest/nap', tier: 'tending', category: 'self-care', napContext: 'both-asleep', bestWhen: ['quiet'] },
    ],
  },
  {
    id: 'kids',
    label: 'Kids',
    emoji: '👶',
    chores: [
      { title: 'Morning wake up routine', tier: 'anchor', category: 'kids', napContext: null, scheduledTime: '07:00', routineGroup: 'morning' },
      { title: 'Get kids dressed', tier: 'rhythm', category: 'kids', napContext: 'both-awake', bestWhen: ['parenting'], routineGroup: 'morning' },
      { title: 'Brush teeth (morning)', tier: 'rhythm', category: 'kids', napContext: 'both-awake', bestWhen: ['parenting'], routineGroup: 'morning' },
      { title: 'Brush teeth (evening)', tier: 'rhythm', category: 'kids', napContext: 'both-awake', bestWhen: ['parenting'], routineGroup: 'bedtime' },
      { title: 'Bath time', tier: 'rhythm', category: 'kids', napContext: 'both-awake', bestWhen: ['parenting'], routineGroup: 'bedtime' },
      { title: 'Bedtime routine', tier: 'anchor', category: 'kids', napContext: null, scheduledTime: '19:30', routineGroup: 'bedtime' },
      { title: 'Read stories', tier: 'tending', category: 'kids', napContext: 'both-awake', bestWhen: ['parenting'], routineGroup: 'bedtime' },
      { title: 'Outdoor play time', tier: 'tending', category: 'kids', napContext: 'both-awake', bestWhen: ['parenting'] },
      { title: 'Art/craft activity', tier: 'tending', category: 'kids', napContext: 'toddler-asleep', bestWhen: ['parenting'] },
      { title: 'School pickup', tier: 'anchor', category: 'kids', napContext: null, scheduledTime: '15:00' },
      { title: 'School dropoff', tier: 'anchor', category: 'kids', napContext: null, scheduledTime: '08:30' },
    ],
  },
  {
    id: 'focus-work',
    label: 'Focus Work',
    emoji: '💻',
    chores: [
      { title: 'Focused computer work', tier: 'tending', category: 'focus-work', napContext: 'both-asleep', bestWhen: ['quiet', 'free'] },
      { title: 'Pay bills', tier: 'tending', category: 'focus-work', napContext: 'both-asleep', bestWhen: ['quiet', 'free'], recurrence: 'weekly' },
      { title: 'Check/respond to emails', tier: 'tending', category: 'focus-work', napContext: 'both-asleep', bestWhen: ['quiet', 'free'] },
      { title: 'Schedule appointments', tier: 'tending', category: 'focus-work', napContext: 'both-asleep', bestWhen: ['quiet', 'free'] },
      { title: 'Budget review', tier: 'tending', category: 'focus-work', napContext: 'both-asleep', bestWhen: ['quiet', 'free'], recurrence: 'weekly' },
      { title: 'Creative project time', tier: 'tending', category: 'focus-work', napContext: 'both-asleep', bestWhen: ['quiet', 'free'] },
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
  return getChoresByTier('anchor');
}

export function getRhythms(): ChoreTemplate[] {
  return getChoresByTier('rhythm');
}

export function getTending(): ChoreTemplate[] {
  return getChoresByTier('tending');
}
