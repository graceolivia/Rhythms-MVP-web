// Children & Naps

export type ChildColor = 'lavender' | 'sage' | 'skyblue' | 'dustyrose' | 'terracotta' | 'clay';

export interface Child {
  id: string;
  name: string;
  birthdate: string; // ISO date
  isNappingAge: boolean;
  color?: ChildColor;
  bedtime?: string;   // HH:mm format (e.g., "19:30")
  wakeTime?: string;  // HH:mm format (e.g., "07:00")
}

export interface NapSchedule {
  id: string;
  childId: string;
  napNumber: number; // 1, 2, or 3
  typicalStart: string; // '09:30'
  typicalEnd: string; // '11:00'
}

export interface NapLog {
  id: string;
  childId: string;
  date: string; // ISO date
  startedAt: string; // ISO datetime
  endedAt: string | null; // null if still sleeping
}

// Tasks

export type TaskTier = 'anchor' | 'rhythm' | 'tending';

export type RecurrenceRule =
  | 'daily'
  | 'weekdays'
  | 'weekly'
  | 'monthly'
  | { type: 'specific-days'; days: number[] }; // 0=Sun

export type NapContext =
  | 'both-awake'
  | 'both-asleep'
  | 'toddler-asleep'
  | 'baby-asleep'
  | 'any';

export type TaskCategory =
  | 'meals'
  | 'kids'
  | 'kitchen'
  | 'laundry'
  | 'tidying'
  | 'cleaning'
  | 'errands'
  | 'self-care'
  | 'focus-work'
  | 'other';

export type TaskStatus =
  | 'pending'
  | 'completed'
  | 'skipped'
  | 'deferred';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type TimeBlock = 'morning' | 'midday' | 'afternoon' | 'evening';

interface BaseTask {
  id: string;
  title: string;
  tier: TaskTier;
  scheduledTime: string | null; // '08:45' for anchors
  recurrence: RecurrenceRule;
  napContext: NapContext | null; // when to suggest
  isActive: boolean;
  category: TaskCategory;
  daysOfWeek?: number[] | null; // 0=Sunday, 6=Saturday; null/undefined=every day
  preferredTimeBlock?: TimeBlock | null; // when this task is best done
  duration?: number | null; // duration in minutes (for anchors)
  travelTime?: number | null; // travel time before anchor in minutes
}

export interface StandardTask extends BaseTask {
  type: 'standard';
}

export interface MealTask extends BaseTask {
  type: 'meal';
  mealType: MealType;
  plannedMeals?: Record<string, string>; // ISO date -> what's planned
}

export type Task = StandardTask | MealTask;

/** Distributive Omit that preserves the discriminated union */
export type TaskInput = Omit<StandardTask, 'id'> | Omit<MealTask, 'id'>;

export interface TaskInstance {
  id: string;
  taskId: string;
  date: string; // ISO date
  status: TaskStatus;
  completedAt: string | null;
  deferredTo: string | null; // for Seeds queue
}

// Garden

export type Season = 'spring' | 'summer' | 'fall' | 'winter';

export type FlowerType =
  | 'daily-daisy' // basic daily completion
  | 'rhythm-rose' // all rhythms completed
  | 'golden-hour-lily' // used double-nap well
  | 'self-care-sunflower' // self-care task done
  | 'challenge-bloom'; // special challenge

export interface Flower {
  id: string;
  type: FlowerType;
  earnedDate: string;
  challengeId: string | null;
}

export interface Garden {
  flowers: Flower[];
  currentSeason: Season;
  unlockedCustomizations: string[];
}

// Settings & User

export type SeasonOfLife =
  | 'survival' // minimal expectations
  | 'finding-footing'
  | 'steady-rhythm';

export interface UserSettings {
  hasCompletedOnboarding: boolean;
  seasonOfLife: SeasonOfLife;
  location: { lat: number; lng: number } | null;
  sunriseResetEnabled: boolean;
}
