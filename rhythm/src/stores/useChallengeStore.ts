import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { useGardenStore } from './useGardenStore';
import { useTaskStore } from './useTaskStore';
import type { ChallengeTemplate, ActiveChallenge, GrowthStage } from '../types';

import pinkroseSheet from '../assets/flowers/sheets/2_summer/pinkrose.png';

// ===========================================
// CHALLENGE TEMPLATES
// Add new ones here! Each entry needs:
//   id          — unique kebab-case string
//   title       — short display name
//   description — shown in the challenge UI
//   type        — 'streak' (N days in a row) or 'cumulative' (N total completions)
//   targetCount — how many completions to bloom
//   flowerReward — which flower type is earned on bloom (see FLOWER_CATALOG in useGardenStore)
//   category    — task category tag
//   difficulty  — 'gentle' | 'steady' | 'ambitious'
//   spriteSheet — horizontal 16×16 sprite sheet (4 frames: seed→sprout→budding→bloom)
//   seedTasks   — tasks automatically added when the challenge is planted
// ===========================================

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    id: 'laundry-cycle',
    title: 'Laundry Complete Cycle',
    description: 'One full cycle from start to finish: put a load in, dry it, take it out, fold and put away.',
    type: 'cumulative',
    targetCount: 4,
    flowerReward: 'rhythm-rose',
    category: 'laundry',
    difficulty: 'gentle',
    spriteSheet: pinkroseSheet,
    seedTasks: [
      { title: 'Put laundry in' },
      { title: 'Move to dryer', sequential: true },
      { title: 'Take laundry out', sequential: true },
      { title: 'Fold and put away', sequential: true },
    ],
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

        // Check plot isn't already taken by a growing challenge (bloomed plots can be reused)
        if (state.activeChallenges.some(c => c.plotIndex === plotIndex && c.status === 'growing')) {
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
              tier: 'todo',
              scheduledTime: null,
              recurrence: isRecurring ? 'daily' : 'daily',
              napContext: null,
              isActive: true,
              category: template.category,
              triggeredBy: seedTask.sequential && prevTaskId
                ? `task-complete:${prevTaskId}`
                : null,
            });
            seededTaskIds.push(taskId);
            prevTaskId = taskId;
          }

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
          const bloomSprite = template.sprites?.[3];
          useGardenStore.getState().earnFlower(template.flowerReward, challengeId, bloomSprite);

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
