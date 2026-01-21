import type { TaskTier, TaskCategory, NapContext } from '../types';

export interface ChoreTemplate {
  title: string;
  tier: TaskTier;
  category: TaskCategory;
  napContext: NapContext | null;
  scheduledTime?: string;
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
      { title: 'Make breakfast', tier: 'rhythm', category: 'meals', napContext: 'any' },
      { title: 'Pack lunches', tier: 'rhythm', category: 'meals', napContext: 'any' },
      { title: 'Lunch for kids', tier: 'rhythm', category: 'meals', napContext: 'any' },
      { title: 'Lunch for me', tier: 'rhythm', category: 'meals', napContext: 'any' },
      { title: 'Afternoon snack', tier: 'rhythm', category: 'meals', napContext: 'both-awake' },
      { title: 'Make dinner', tier: 'rhythm', category: 'meals', napContext: 'any' },
      { title: 'Meal prep', tier: 'tending', category: 'meals', napContext: 'both-asleep' },
      { title: 'Plan weekly meals', tier: 'tending', category: 'meals', napContext: 'both-asleep' },
      { title: 'Grocery list', tier: 'tending', category: 'meals', napContext: 'any' },
    ],
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    emoji: '🧽',
    chores: [
      { title: 'Load dishwasher', tier: 'rhythm', category: 'kitchen', napContext: 'any' },
      { title: 'Empty dishwasher', tier: 'tending', category: 'kitchen', napContext: 'baby-asleep' },
      { title: 'Hand wash dishes', tier: 'tending', category: 'kitchen', napContext: 'both-asleep' },
      { title: 'Wipe counters', tier: 'tending', category: 'kitchen', napContext: 'any' },
      { title: 'Clean stovetop', tier: 'tending', category: 'kitchen', napContext: 'both-asleep' },
      { title: 'Clean out fridge', tier: 'tending', category: 'kitchen', napContext: 'both-asleep' },
      { title: 'Take out kitchen trash', tier: 'tending', category: 'kitchen', napContext: 'any' },
      { title: 'Wipe down appliances', tier: 'tending', category: 'kitchen', napContext: 'both-asleep' },
    ],
  },
  {
    id: 'laundry',
    label: 'Laundry',
    emoji: '👕',
    chores: [
      { title: 'Start a load of laundry', tier: 'tending', category: 'laundry', napContext: 'any' },
      { title: 'Switch laundry to dryer', tier: 'tending', category: 'laundry', napContext: 'any' },
      { title: 'Fold laundry', tier: 'tending', category: 'laundry', napContext: 'toddler-asleep' },
      { title: 'Put away laundry', tier: 'tending', category: 'laundry', napContext: 'any' },
      { title: 'Sort dirty laundry', tier: 'tending', category: 'laundry', napContext: 'any' },
      { title: 'Wash bedding', tier: 'tending', category: 'laundry', napContext: 'both-awake' },
      { title: 'Iron clothes', tier: 'tending', category: 'laundry', napContext: 'both-asleep' },
    ],
  },
  {
    id: 'tidying',
    label: 'Tidying',
    emoji: '🧹',
    chores: [
      { title: 'Morning tidy up', tier: 'rhythm', category: 'tidying', napContext: 'both-awake' },
      { title: 'Evening reset', tier: 'rhythm', category: 'tidying', napContext: 'both-asleep' },
      { title: 'Make beds', tier: 'tending', category: 'tidying', napContext: 'any' },
      { title: 'Pick up toys', tier: 'tending', category: 'tidying', napContext: 'both-awake' },
      { title: 'Clear clutter hotspots', tier: 'tending', category: 'tidying', napContext: 'any' },
      { title: 'Tidy entryway', tier: 'tending', category: 'tidying', napContext: 'any' },
      { title: 'Sort mail/papers', tier: 'tending', category: 'tidying', napContext: 'both-asleep' },
      { title: 'Organize one drawer', tier: 'tending', category: 'tidying', napContext: 'both-asleep' },
    ],
  },
  {
    id: 'cleaning',
    label: 'Cleaning',
    emoji: '✨',
    chores: [
      { title: 'Sweep floors', tier: 'tending', category: 'cleaning', napContext: 'both-asleep' },
      { title: 'Vacuum', tier: 'tending', category: 'cleaning', napContext: 'both-awake' },
      { title: 'Mop floors', tier: 'tending', category: 'cleaning', napContext: 'both-asleep' },
      { title: 'Clean bathroom sink', tier: 'tending', category: 'cleaning', napContext: 'any' },
      { title: 'Clean toilet', tier: 'tending', category: 'cleaning', napContext: 'both-asleep' },
      { title: 'Clean shower/tub', tier: 'tending', category: 'cleaning', napContext: 'both-asleep' },
      { title: 'Dust surfaces', tier: 'tending', category: 'cleaning', napContext: 'both-asleep' },
      { title: 'Clean mirrors', tier: 'tending', category: 'cleaning', napContext: 'any' },
      { title: 'Wipe light switches & handles', tier: 'tending', category: 'cleaning', napContext: 'any' },
    ],
  },
  {
    id: 'errands',
    label: 'Errands',
    emoji: '🚗',
    chores: [
      { title: 'Grocery shopping', tier: 'tending', category: 'errands', napContext: null },
      { title: 'Return library books', tier: 'tending', category: 'errands', napContext: null },
      { title: 'Pick up prescriptions', tier: 'tending', category: 'errands', napContext: null },
      { title: 'Mail packages', tier: 'tending', category: 'errands', napContext: null },
      { title: 'Take car for service', tier: 'tending', category: 'errands', napContext: null },
      { title: 'Bank errands', tier: 'tending', category: 'errands', napContext: null },
      { title: 'Drop off donations', tier: 'tending', category: 'errands', napContext: null },
    ],
  },
  {
    id: 'self-care',
    label: 'Self-Care',
    emoji: '💆',
    chores: [
      { title: 'Eat a real lunch', tier: 'rhythm', category: 'self-care', napContext: 'both-asleep' },
      { title: 'Drink water', tier: 'rhythm', category: 'self-care', napContext: 'any' },
      { title: 'Take vitamins/meds', tier: 'rhythm', category: 'self-care', napContext: 'any' },
      { title: 'Shower', tier: 'tending', category: 'self-care', napContext: 'both-asleep' },
      { title: 'Exercise/movement', tier: 'tending', category: 'self-care', napContext: 'any' },
      { title: 'Read for pleasure', tier: 'tending', category: 'self-care', napContext: 'both-asleep' },
      { title: 'Call a friend', tier: 'tending', category: 'self-care', napContext: 'both-asleep' },
      { title: 'Journal/reflect', tier: 'tending', category: 'self-care', napContext: 'both-asleep' },
      { title: 'Rest/nap', tier: 'tending', category: 'self-care', napContext: 'both-asleep' },
    ],
  },
  {
    id: 'kids',
    label: 'Kids',
    emoji: '👶',
    chores: [
      { title: 'Morning wake up routine', tier: 'anchor', category: 'kids', napContext: null, scheduledTime: '07:00' },
      { title: 'Get kids dressed', tier: 'rhythm', category: 'kids', napContext: 'both-awake' },
      { title: 'Brush teeth (morning)', tier: 'rhythm', category: 'kids', napContext: 'both-awake' },
      { title: 'Brush teeth (evening)', tier: 'rhythm', category: 'kids', napContext: 'both-awake' },
      { title: 'Bath time', tier: 'rhythm', category: 'kids', napContext: 'both-awake' },
      { title: 'Bedtime routine', tier: 'anchor', category: 'kids', napContext: null, scheduledTime: '19:30' },
      { title: 'Read stories', tier: 'tending', category: 'kids', napContext: 'both-awake' },
      { title: 'Outdoor play time', tier: 'tending', category: 'kids', napContext: 'both-awake' },
      { title: 'Art/craft activity', tier: 'tending', category: 'kids', napContext: 'toddler-asleep' },
      { title: 'School pickup', tier: 'anchor', category: 'kids', napContext: null, scheduledTime: '15:00' },
      { title: 'School dropoff', tier: 'anchor', category: 'kids', napContext: null, scheduledTime: '08:30' },
    ],
  },
  {
    id: 'focus-work',
    label: 'Focus Work',
    emoji: '💻',
    chores: [
      { title: 'Focused computer work', tier: 'tending', category: 'focus-work', napContext: 'both-asleep' },
      { title: 'Pay bills', tier: 'tending', category: 'focus-work', napContext: 'both-asleep' },
      { title: 'Check/respond to emails', tier: 'tending', category: 'focus-work', napContext: 'both-asleep' },
      { title: 'Schedule appointments', tier: 'tending', category: 'focus-work', napContext: 'both-asleep' },
      { title: 'Budget review', tier: 'tending', category: 'focus-work', napContext: 'both-asleep' },
      { title: 'Creative project time', tier: 'tending', category: 'focus-work', napContext: 'both-asleep' },
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
