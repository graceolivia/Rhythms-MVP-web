// Children & Naps

export type ChildColor = 'lavender' | 'sage' | 'skyblue' | 'dustyrose' | 'terracotta' | 'clay';

// Care status per child
export type CareStatus = 'home' | 'away' | 'asleep';

export interface Child {
  id: string;
  name: string;
  birthdate: string; // ISO date
  isNappingAge: boolean;
  color?: ChildColor;
  bedtime?: string;   // HH:mm format (e.g., "19:30")
  wakeTime?: string;  // HH:mm format (e.g., "07:00")
  careStatus?: CareStatus;  // Current care status (default: 'home')
}

export interface NapSchedule {
  id: string;
  childId: string;
  napNumber: number; // 1, 2, or 3
  typicalStart: string; // '09:30'
  typicalEnd: string; // '11:00'
  autoTrack?: boolean; // auto-start/end nap at schedule times (default: treated as true when undefined)
}

export type SleepType = 'nap' | 'night';

export interface NapLog {
  id: string;
  childId: string;
  date: string; // ISO date
  startedAt: string; // ISO datetime
  endedAt: string | null; // null if still sleeping
  sleepType?: SleepType; // 'nap' or 'night', defaults to 'nap' for backwards compatibility
  autoTracked?: boolean; // true if this log was auto-created by schedule
}

export interface ChildcareSchedule {
  id: string;
  childId: string;
  name: string;              // "Daycare", "Preschool", "Grandma's"
  daysOfWeek: number[];      // [1, 2, 3, 4, 5] for weekdays (0=Sun, 6=Sat)
  dropoffTime: string;       // "08:30" HH:mm format
  pickupTime: string;        // "16:00" HH:mm format
  isActive: boolean;
}

export interface AwayLog {
  id: string;
  childId: string;
  date: string;           // YYYY-MM-DD
  startedAt: string;      // ISO datetime
  endedAt: string | null; // null if still away
  scheduleName?: string;  // e.g., "Daycare"
}

// Availability States - the core states that determine what tasks to suggest
export type AvailabilityState =
  | 'unavailable'  // I'm busy (driving, at appointment with kid)
  | 'free'         // Kids are away, I have alone time
  | 'quiet'        // Kids asleep, I'm home but have quiet time
  | 'parenting';   // Kids home and awake (default)

// Care Block Types - determines the availability state created
export type CareBlockType =
  | 'childcare'    // Kid is away → I'm "free"
  | 'appointment'  // I'm with kid somewhere → I'm "unavailable"
  | 'activity'     // Kid's class/activity → I'm "unavailable"
  | 'babysitter'   // Sitter at home, I leave → I'm "free"
  | 'sleep';       // Nap or nighttime → I'm "quiet"

// A block of time that affects availability
export interface CareBlock {
  id: string;
  childIds: string[];           // Which children this affects (can be multiple)
  name: string;                 // "Daycare", "Doctor Appt", "Babysitter"
  blockType: CareBlockType;     // Determines the availability state created

  // Scheduling - either recurring OR one-off
  recurrence: 'one-off' | RecurrenceRule;
  oneOffDate?: string;          // ISO date for one-off events (YYYY-MM-DD)
  daysOfWeek?: number[];        // For recurring [0-6]

  // Time
  startTime: string;            // "08:30" HH:mm
  endTime: string;              // "16:00" HH:mm

  // Travel (optional)
  travelTimeBefore?: number;    // Minutes to get there
  travelTimeAfter?: number;     // Minutes to return

  isActive: boolean;
}

// Transitions

export type TransitionType = 'care-block-start' | 'care-block-end' | 'nap-start' | 'nap-end';

export interface PendingTransition {
  id: string;
  type: TransitionType;
  childId: string;
  scheduledTime: string;        // HH:mm
  scheduledDate: string;        // YYYY-MM-DD
  blockId?: string;             // CareBlock ID
  napScheduleId?: string;       // NapSchedule ID
  description: string;          // "Julian home from daycare?"
  autoConfirmAfterMs: number;   // Default 30 min (1800000)
  createdAt: string;
  status: 'pending' | 'confirmed' | 'dismissed' | 'auto-confirmed';
  autoTracked?: boolean;        // true if this transition auto-flipped nap state
}

// Habit Blocks

export type BlockAnchorType = 'time' | 'event' | 'after-previous';

export interface BlockAnchor {
  type: BlockAnchorType;
  time?: string;         // HH:mm — when type is 'time'
  eventKey?: string;     // e.g. 'nap-start:CHILD_ID' — when type is 'event'
}

export interface HabitBlockItem {
  taskId: string;        // References Task.id
  order: number;         // Position in the stack (1, 2, 3...)
  isTrackable: boolean;  // true = checkbox (aspirational); false = listed only (routine)
  choreQueueSlot?: boolean; // true = this slot picks a random chore from the queue
}

export interface HabitBlock {
  id: string;
  name: string;              // "Morning Rush", "Evening Close"
  emoji?: string;            // Optional visual marker
  anchor: BlockAnchor;
  estimatedEndTime?: string; // HH:mm soft end
  deadline?: string;         // HH:mm hard deadline (escalating reminders)
  deadlineLabel?: string;    // "Leave for pickup by"
  items: HabitBlockItem[];
  recurrence: RecurrenceRule;
  daysOfWeek?: number[];
  isActive: boolean;
  color?: string;            // Tailwind color key
}

// Tasks

export type TaskTier = 'anchor' | 'rhythm' | 'tending';

export type RecurrenceRule =
  | 'daily'
  | 'weekdays'
  | 'weekends'    // Sat-Sun
  | 'weekly'
  | 'monthly'
  | { type: 'specific-days'; days: number[] }; // 0=Sun

export type NapContext =
  | 'both-awake'
  | 'both-asleep'
  | 'toddler-asleep'
  | 'baby-asleep'
  | 'any';

// Child task types for special behaviors
export type ChildTaskType = 'bedtime' | 'wake-up' | 'dropoff' | 'pickup' | 'custom' | null;

// Care context for task suggestions (based on care status)
export type CareContext = 'all-home' | 'any-away' | 'all-away' | 'any';

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
  napContext: NapContext | null; // when to suggest (deprecated - use bestWhen)
  isActive: boolean;
  category: TaskCategory;
  daysOfWeek?: number[] | null; // 0=Sunday, 6=Saturday; null/undefined=every day
  preferredTimeBlock?: TimeBlock | null; // when this task is best done
  duration?: number | null; // duration in minutes (for anchors)
  travelTime?: number | null; // travel time before anchor in minutes
  childId?: string | null;           // Link to specific child
  childTaskType?: ChildTaskType;     // Type of child task
  careContext?: CareContext | null;  // When to suggest (deprecated - use bestWhen)

  // NEW: When is this task best done? (replaces napContext + careContext)
  bestWhen?: AvailabilityState[] | null;  // e.g., ['free', 'quiet'] or ['parenting']
                                           // null/empty = any time

  // NEW: Routine grouping (simple phase)
  routineGroup?: string | null;     // e.g., "bedtime", "morning-routine"
  routineOrder?: number | null;     // Sort order within routine (1, 2, 3...)

  // Informational tasks are shown as time markers, not completable
  isInformational?: boolean;

  // Event-triggered sequencing: task only appears when trigger fires
  triggeredBy?: string | null;          // 'nap-end', 'nap-end:CHILD_ID', 'task-complete:TASK_ID'
  triggerDelayMinutes?: number | null;  // Optional delay after trigger

  // Chore queue: random daily chore pool
  isChoreQueue?: boolean;  // true = in the "one random chore a day" pool
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

// Challenges

export type ChallengeType = 'streak' | 'cumulative';
export type GrowthStage = 'seed' | 'sprout' | 'budding' | 'bloom';

export interface ChallengeSeedTask {
  title: string;
  /** If true, this task chains off the previous one via triggeredBy */
  sequential?: boolean;
}

export interface ChallengeTemplate {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  targetCount: number;
  flowerReward: FlowerType;
  category: TaskCategory;
  difficulty: 'gentle' | 'steady' | 'ambitious';
  /** Optional pixel art sprites per growth stage (seed, sprout, budding, bloom) */
  sprites?: [string, string, string, string];
  /** Tasks seeded when the challenge is planted */
  seedTasks?: ChallengeSeedTask[];
}

export interface ActiveChallenge {
  id: string;
  templateId: string;
  startedDate: string;
  currentStreak: number;
  totalProgress: number;
  lastProgressDate: string | null;
  growthStage: GrowthStage;
  plotIndex: number;
  status: 'growing' | 'bloomed' | 'wilted' | 'abandoned';
  bloomedDate: string | null;
  /** IDs of tasks seeded when this challenge was planted */
  seededTaskIds?: string[];
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
  /** Pixel art sprite for this specific flower (bloom stage) */
  sprite?: string;
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
