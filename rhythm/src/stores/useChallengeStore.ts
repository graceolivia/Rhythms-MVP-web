import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { useGardenStore } from './useGardenStore';
import { useTaskStore } from './useTaskStore';
import type { ChallengeTemplate, ActiveChallenge, GrowthStage } from '../types';

// Laundry challenge pixel art
import laundry084 from '../assets/flowers/084.png';
import laundry081 from '../assets/flowers/081.png';
import laundry083 from '../assets/flowers/083.png';
import laundry082 from '../assets/flowers/082.png';


// ===========================================
// CURATED CHALLENGE TEMPLATES
// ===========================================

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    id: 'water-before-coffee',
    title: 'Water Before Coffee',
    description: 'Drink a full glass of water before your first coffee each morning. A tiny act of self-care that sets the tone.',
    type: 'streak',
    targetCount: 7,
    flowerReward: 'self-care-sunflower',
    category: 'self-care',
    difficulty: 'gentle',
    seedTasks: [{ title: 'Drink water before coffee' }],
  },
  {
    id: 'morning-stretch',
    title: '5-Min Morning Stretch',
    description: 'Just five minutes of stretching before the day takes over. Your body will thank you.',
    type: 'streak',
    targetCount: 7,
    flowerReward: 'self-care-sunflower',
    category: 'self-care',
    difficulty: 'gentle',
    seedTasks: [{ title: '5-min morning stretch' }],
  },
  {
    id: 'phone-free-hour',
    title: 'Phone-Free First Hour',
    description: 'Keep your phone away for the first hour after waking. Be present with the morning.',
    type: 'streak',
    targetCount: 5,
    flowerReward: 'golden-hour-lily',
    category: 'self-care',
    difficulty: 'steady',
    seedTasks: [{ title: 'Phone-free first hour' }],
  },
  {
    id: 'clear-sink',
    title: 'Clear Sink Before Bed',
    description: 'End the day with a clean sink. Wake up to a small win already in place.',
    type: 'streak',
    targetCount: 7,
    flowerReward: 'daily-daisy',
    category: 'kitchen',
    difficulty: 'gentle',
    seedTasks: [{ title: 'Clear sink before bed' }],
  },
  {
    id: 'meal-prep',
    title: 'Meal Prep One Thing',
    description: 'Prep one component for a future meal — chop veggies, cook rice, marinate something. Five times and you\'ve built a habit.',
    type: 'cumulative',
    targetCount: 5,
    flowerReward: 'rhythm-rose',
    category: 'kitchen',
    difficulty: 'steady',
    seedTasks: [{ title: 'Meal prep one thing' }],
  },
  {
    id: 'tidy-one-room',
    title: 'Tidy One Room Daily',
    description: 'Pick one room and do a 10-minute tidy. Not deep cleaning — just resetting.',
    type: 'streak',
    targetCount: 7,
    flowerReward: 'rhythm-rose',
    category: 'tidying',
    difficulty: 'steady',
    seedTasks: [{ title: 'Tidy one room (10 min)' }],
  },
  {
    id: 'ten-self-care',
    title: '10 Self-Care Moments',
    description: 'Accumulate 10 intentional self-care moments — a bath, journaling, a walk alone, reading a chapter.',
    type: 'cumulative',
    targetCount: 10,
    flowerReward: 'challenge-bloom',
    category: 'self-care',
    difficulty: 'ambitious',
    seedTasks: [{ title: 'Self-care moment' }],
  },
  {
    id: 'laundry-cycle',
    title: 'Laundry Complete Cycle',
    description: 'One full cycle from start to finish: put a load in, dry it, take it out, fold and put away. Watch your flower grow with each step.',
    type: 'cumulative',
    targetCount: 4,
    flowerReward: 'daily-daisy',
    category: 'laundry',
    difficulty: 'gentle',
    sprites: [laundry084, laundry081, laundry083, laundry082],
    seedTasks: [
      { title: 'Put laundry in' },
      { title: 'Move to dryer', sequential: true },
      { title: 'Take laundry out', sequential: true },
      { title: 'Fold and put away', sequential: true },
    ],
  },
  {
    id: 'screen-free-bedtime',
    title: 'Screen-Free Bedtime',
    description: 'No screens for 30 minutes before bed. Read, stretch, or just be.',
    type: 'streak',
    targetCount: 5,
    flowerReward: 'golden-hour-lily',
    category: 'self-care',
    difficulty: 'steady',
    seedTasks: [{ title: 'Screen-free 30 min before bed' }],
  },
  {
    id: 'daily-outside',
    title: 'Daily Outside Time',
    description: 'Get outside with the kids every day for a week. Even 10 minutes counts.',
    type: 'streak',
    targetCount: 7,
    flowerReward: 'self-care-sunflower',
    category: 'kids',
    difficulty: 'gentle',
    seedTasks: [{ title: 'Outside time with kids' }],
  },
];

// ===========================================
// HELPERS
// ===========================================

export function getGrowthStage(progress: number, target: number): GrowthStage {
  if (progress >= target) return 'bloom';
  const pct = progress / target;
  if (pct >= 0.6) return 'budding';
  if (pct >= 0.25) return 'sprout';
  return 'seed';
}

// ===========================================
// STORE
// ===========================================

interface ChallengeState {
  activeChallenges: ActiveChallenge[];
  completedChallengeIds: string[];

  plantChallenge: (templateId: string, plotIndex: number) => string | null;
  recordProgress: (challengeId: string) => 'progressed' | 'bloomed' | 'already-recorded' | 'not-found';
  abandonChallenge: (challengeId: string) => void;
  getActiveByPlot: (plotIndex: number) => ActiveChallenge | undefined;
  getTemplate: (templateId: string) => ChallengeTemplate | undefined;
  clearChallengeState: () => void;
}

export const useChallengeStore = create<ChallengeState>()(
  persist(
    (set, get) => ({
      activeChallenges: [],
      completedChallengeIds: [],

      plantChallenge: (templateId, plotIndex) => {
        const state = get();
        const template = CHALLENGE_TEMPLATES.find(t => t.id === templateId);
        if (!template) return null;

        // Check plot isn't already taken (growing or bloomed)
        if (state.activeChallenges.some(c => c.plotIndex === plotIndex && (c.status === 'growing' || c.status === 'bloomed'))) {
          return null;
        }

        // Check not already active
        if (state.activeChallenges.some(c => c.templateId === templateId && c.status === 'growing')) {
          return null;
        }

        const id = uuidv4();
        const today = format(new Date(), 'yyyy-MM-dd');

        // Seed tasks if the template defines them
        const seededTaskIds: string[] = [];
        if (template.seedTasks && template.seedTasks.length > 0) {
          const taskStore = useTaskStore.getState();
          let prevTaskId: string | null = null;

          for (const seedTask of template.seedTasks) {
            const isRecurring = template.type === 'streak';
            const taskId = taskStore.addTask({
              type: 'standard',
              title: seedTask.title,
              tier: 'tending',
              scheduledTime: null,
              recurrence: isRecurring ? 'daily' : 'daily',
              napContext: null,
              isActive: true,
              category: template.category,
              // Sequential tasks chain off the previous task
              triggeredBy: seedTask.sequential && prevTaskId
                ? `task-complete:${prevTaskId}`
                : null,
            });
            seededTaskIds.push(taskId);
            prevTaskId = taskId;
          }

          // Generate instances for the new tasks
          taskStore.generateDailyInstances(new Date());
        }

        const challenge: ActiveChallenge = {
          id,
          templateId,
          startedDate: today,
          currentStreak: 0,
          totalProgress: 0,
          lastProgressDate: null,
          growthStage: 'seed',
          plotIndex,
          status: 'growing',
          bloomedDate: null,
          seededTaskIds,
        };

        set((s) => ({
          activeChallenges: [...s.activeChallenges, challenge],
        }));

        return id;
      },

      recordProgress: (challengeId) => {
        const state = get();
        const challenge = state.activeChallenges.find(c => c.id === challengeId);
        if (!challenge || challenge.status !== 'growing') return 'not-found';

        const template = CHALLENGE_TEMPLATES.find(t => t.id === challenge.templateId);
        if (!template) return 'not-found';

        const today = format(new Date(), 'yyyy-MM-dd');

        // For streak challenges, only one progress per day
        if (template.type === 'streak' && challenge.lastProgressDate === today) {
          return 'already-recorded';
        }

        const newProgress = challenge.totalProgress + 1;
        const newStreak = template.type === 'streak' ? challenge.currentStreak + 1 : challenge.currentStreak;
        const newStage = getGrowthStage(newProgress, template.targetCount);
        const isBlooming = newProgress >= template.targetCount;

        if (isBlooming) {
          // Earn the flower
          useGardenStore.getState().earnFlower(template.flowerReward, challengeId);

          // Deactivate seeded tasks
          if (challenge.seededTaskIds?.length) {
            const taskStore = useTaskStore.getState();
            for (const taskId of challenge.seededTaskIds) {
              taskStore.updateTask(taskId, { isActive: false });
            }
          }
        }

        set((s) => ({
          activeChallenges: s.activeChallenges.map(c =>
            c.id === challengeId
              ? {
                  ...c,
                  totalProgress: newProgress,
                  currentStreak: newStreak,
                  lastProgressDate: today,
                  growthStage: newStage,
                  status: isBlooming ? 'bloomed' : 'growing',
                  bloomedDate: isBlooming ? today : null,
                }
              : c
          ),
          completedChallengeIds: isBlooming
            ? [...s.completedChallengeIds, challengeId]
            : s.completedChallengeIds,
        }));

        return isBlooming ? 'bloomed' : 'progressed';
      },

      abandonChallenge: (challengeId) => {
        const challenge = get().activeChallenges.find(c => c.id === challengeId);

        // Deactivate seeded tasks
        if (challenge?.seededTaskIds?.length) {
          const taskStore = useTaskStore.getState();
          for (const taskId of challenge.seededTaskIds) {
            taskStore.updateTask(taskId, { isActive: false });
          }
        }

        set((s) => ({
          activeChallenges: s.activeChallenges.map(c =>
            c.id === challengeId ? { ...c, status: 'abandoned' } : c
          ),
        }));
      },

      getActiveByPlot: (plotIndex) => {
        return get().activeChallenges.find(
          c => c.plotIndex === plotIndex && c.status === 'growing'
        );
      },

      getTemplate: (templateId) => {
        return CHALLENGE_TEMPLATES.find(t => t.id === templateId);
      },

      clearChallengeState: () => {
        set({ activeChallenges: [], completedChallengeIds: [] });
      },
    }),
    {
      name: 'rhythm_challenges',
    }
  )
);
