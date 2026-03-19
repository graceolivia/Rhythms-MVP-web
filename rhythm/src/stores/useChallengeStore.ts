import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { useGardenStore, PLOT_COLS, PLOT_ROW } from './useGardenStore';
import { useTaskStore } from './useTaskStore';
import type { ChallengeTemplate, ActiveChallenge, GrowthStage } from '../types';

import pinkroseSheet from '../assets/flowers/sheets/2_summer/pinkrose.png';
import snowdropSheet from '../assets/flowers/sheets/0_winter/snowdrop.png';
import winterPansySheet from '../assets/flowers/sheets/0_winter/winter-pansy.png';
import heliotropeSheet from '../assets/flowers/sheets/0_winter/heliotrope.png';

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
    repeatable: true,
    spriteSheet: pinkroseSheet,
    seedTasks: [
      { title: 'Put laundry in' },
      { title: 'Move to dryer', sequential: true },
      { title: 'Take laundry out', sequential: true },
      { title: 'Fold and put away', sequential: true },
    ],
  },
  {
    id: 'morning-close',
    title: 'Morning Routine',
    description: 'Complete your morning routine from start to finish — a calm, intentional start to the day.',
    type: 'daily-routine',
    targetCount: 1,
    flowerReward: 'daily-daisy',
    category: 'other',
    difficulty: 'gentle',
    repeatable: true,
    spriteSheet: snowdropSheet,
    seedTasks: [
      { title: 'Placeholder morning step 1' },
      { title: 'Placeholder morning step 2', sequential: true },
      { title: 'Placeholder morning step 3', sequential: true },
    ],
  },
  {
    id: 'evening-close',
    title: 'Evening Close',
    description: 'Wind down the day with intention — kitchen, kids, and yourself taken care of.',
    type: 'daily-routine',
    groupTitle: 'Evening Routine',
    targetCount: 1,
    flowerReward: 'golden-hour-lily',
    category: 'other',
    difficulty: 'gentle',
    repeatable: true,
    spriteSheet: winterPansySheet,
    seedTasks: [
      { title: 'Placeholder evening step 1' },
      { title: 'Placeholder evening step 2', sequential: true },
      { title: 'Placeholder evening step 3', sequential: true },
    ],
  },
  {
    id: 'waldorf-enrichment',
    title: 'Waldorf Child Enrichment',
    description: 'Bring rhythm and beauty into the week with intentional play, craft, and nature.',
    type: 'cumulative',
    targetCount: 5,
    flowerReward: 'self-care-sunflower',
    category: 'kids',
    difficulty: 'steady',
    spriteSheet: heliotropeSheet,
    seedTasks: [
      { title: 'Placeholder enrichment step 1' },
      { title: 'Placeholder enrichment step 2' },
      { title: 'Placeholder enrichment step 3' },
    ],
  },
];

// ===========================================
// HELPERS
// ===========================================

export function getGrowthStage(progress: number, target: number): GrowthStage {
  if (progress >= target) return 'bloom';
  if (progress === 0) return 'planted';
  const pct = progress / target;
  if (pct >= 0.68) return 'budding';
  if (pct >= 0.35) return 'sprout';
  return 'seed';
}

// ===========================================
// STORE
// ===========================================

interface ChallengeState {
  activeChallenges: ActiveChallenge[];
  completedChallengeIds: string[];
  savedStepsByTemplate: Record<string, string[]>;

  plantChallenge: (templateId: string, plotIndex: number, customStepTitles?: string[], repeatInterval?: 'daily' | 'weekly') => string | null;
  recordProgress: (challengeId: string) => 'progressed' | 'bloomed' | 'already-recorded' | 'not-found';
  abandonChallenge: (challengeId: string) => void;
  getActiveByPlot: (plotIndex: number) => ActiveChallenge | undefined;
  getTemplate: (templateId: string) => ChallengeTemplate | undefined;
  clearChallengeState: () => void;
  saveStepsForTemplate: (templateId: string, steps: string[]) => void;
  addSeededTask: (challengeId: string, title: string) => void;
  removeSeededTask: (challengeId: string, taskId: string) => void;
  processRepeatChallenges: () => void;
}

export const useChallengeStore = create<ChallengeState>()(
  persist(
    (set, get) => ({
      activeChallenges: [],
      completedChallengeIds: [],
      savedStepsByTemplate: {},

      plantChallenge: (templateId, plotIndex, customStepTitles?, repeatInterval?) => {
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

          for (let si = 0; si < template.seedTasks.length; si++) {
            const seedTask = template.seedTasks[si];
            const isRecurring = template.type === 'streak';
            const taskId = taskStore.addTask({
              type: 'standard',
              title: customStepTitles?.[si] ?? seedTask.title,
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
          startedAt: new Date().toISOString(),
          currentStreak: 0,
          totalProgress: 0,
          lastProgressDate: null,
          growthStage: 'planted',
          plotIndex,
          status: 'growing',
          bloomedDate: null,
          seededTaskIds,
          dailyRoutineTarget: template.type === 'daily-routine'
            ? (seededTaskIds.length || template.targetCount)
            : undefined,
          repeatInterval,
        };

        set((s) => ({
          activeChallenges: [...s.activeChallenges, challenge],
          ...(customStepTitles?.length
            ? { savedStepsByTemplate: { ...s.savedStepsByTemplate, [templateId]: customStepTitles } }
            : {}),
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

        // Use dailyRoutineTarget for daily-routine challenges (set at plant time to seedTasks.length)
        const effectiveTarget = template.type === 'daily-routine'
          ? (challenge.dailyRoutineTarget ?? template.targetCount)
          : template.targetCount;

        const newProgress = challenge.totalProgress + 1;
        const newStreak = template.type === 'streak' ? challenge.currentStreak + 1 : challenge.currentStreak;
        const newStage = getGrowthStage(newProgress, effectiveTarget);
        const isBlooming = newProgress >= effectiveTarget;

        if (isBlooming) {
          const bloomSprite = template.sprites?.[3];
          const gardenStore = useGardenStore.getState();
          const flowerId = gardenStore.earnFlower(template.flowerReward, challengeId, bloomSprite);
          const col = PLOT_COLS[challenge.plotIndex];
          if (col !== undefined) {
            gardenStore.autoPlaceFlower(flowerId, template.flowerReward, col, PLOT_ROW);
          }

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

      saveStepsForTemplate: (templateId, steps) => {
        set(s => ({
          savedStepsByTemplate: { ...s.savedStepsByTemplate, [templateId]: steps },
        }));
      },

      addSeededTask: (challengeId, title) => {
        const state = get();
        const challenge = state.activeChallenges.find(c => c.id === challengeId);
        if (!challenge) return;
        const template = CHALLENGE_TEMPLATES.find(t => t.id === challenge.templateId);
        if (!template) return;

        const taskStore = useTaskStore.getState();
        const taskId = taskStore.addTask({
          type: 'standard',
          title,
          tier: 'todo',
          scheduledTime: null,
          recurrence: 'daily',
          napContext: null,
          isActive: true,
          category: template.category,
          triggeredBy: null,
        });
        taskStore.generateDailyInstances(new Date());

        const newSeededTaskIds = [...(challenge.seededTaskIds ?? []), taskId];
        set(s => ({
          activeChallenges: s.activeChallenges.map(c =>
            c.id === challengeId
              ? {
                  ...c,
                  seededTaskIds: newSeededTaskIds,
                  dailyRoutineTarget: template.type === 'daily-routine'
                    ? newSeededTaskIds.length
                    : c.dailyRoutineTarget,
                }
              : c
          ),
        }));
      },

      removeSeededTask: (challengeId, taskId) => {
        const state = get();
        const challenge = state.activeChallenges.find(c => c.id === challengeId);
        if (!challenge) return;
        const template = CHALLENGE_TEMPLATES.find(t => t.id === challenge.templateId);

        useTaskStore.getState().updateTask(taskId, { isActive: false });

        const newSeededTaskIds = (challenge.seededTaskIds ?? []).filter(id => id !== taskId);
        set(s => ({
          activeChallenges: s.activeChallenges.map(c =>
            c.id === challengeId
              ? {
                  ...c,
                  seededTaskIds: newSeededTaskIds,
                  dailyRoutineTarget: template?.type === 'daily-routine'
                    ? newSeededTaskIds.length
                    : c.dailyRoutineTarget,
                }
              : c
          ),
        }));
      },

      processRepeatChallenges: () => {
        const state = get();
        const today = format(new Date(), 'yyyy-MM-dd');

        // Group bloomed challenges by templateId — only consider the most recently bloomed
        const bloomedByTemplate = new Map<string, ActiveChallenge>();
        for (const c of state.activeChallenges) {
          if (c.status !== 'bloomed' || !c.repeatInterval || !c.bloomedDate) continue;
          const existing = bloomedByTemplate.get(c.templateId);
          if (!existing || c.bloomedDate > existing.bloomedDate!) {
            bloomedByTemplate.set(c.templateId, c);
          }
        }

        for (const [templateId, c] of bloomedByTemplate) {
          // Skip if already has a growing version
          if (state.activeChallenges.some(a => a.templateId === templateId && a.status === 'growing')) continue;

          let shouldReplant = false;
          if (c.repeatInterval === 'daily') {
            shouldReplant = c.bloomedDate! < today;
          } else if (c.repeatInterval === 'weekly') {
            const bloomDate = new Date(c.bloomedDate!);
            const daysSince = Math.floor((Date.now() - bloomDate.getTime()) / (1000 * 60 * 60 * 24));
            shouldReplant = daysSince >= 7;
          }

          if (shouldReplant) {
            const savedSteps = state.savedStepsByTemplate[templateId];
            get().plantChallenge(templateId, c.plotIndex, savedSteps, c.repeatInterval);
          }
        }
      },
    }),
    {
      name: 'rhythm_challenges',
    }
  )
);
