import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TutorialPhase =
  | 'not_started'
  | 'intro'
  | 'name_input'
  | 'receive_seeds'
  | 'plant_prompt'
  | 'first_plant_response'
  | 'add_task_prompt'
  | 'wrap_up'
  | 'complete';

interface TutorialState {
  phase: TutorialPhase;
  playerName: string | null;
  hasReceivedStarterSeeds: boolean;
  hasPlantedFirstSeed: boolean;
  hasAddedFirstTask: boolean;
  tutorialComplete: boolean;

  startTutorial: () => void;
  setPhase: (phase: TutorialPhase) => void;
  setPlayerName: (name: string) => void;
  markSeedsReceived: () => void;
  markSeedPlanted: () => void;
  markTaskAdded: () => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set) => ({
      phase: 'not_started',
      playerName: null,
      hasReceivedStarterSeeds: false,
      hasPlantedFirstSeed: false,
      hasAddedFirstTask: false,
      tutorialComplete: false,

      startTutorial: () => set({ phase: 'intro' }),
      setPhase: (phase) => set({ phase }),
      setPlayerName: (name) => set({ playerName: name }),
      markSeedsReceived: () => set({ hasReceivedStarterSeeds: true }),
      markSeedPlanted: () => set({ hasPlantedFirstSeed: true }),
      markTaskAdded: () => set({ hasAddedFirstTask: true }),
      completeTutorial: () => set({ phase: 'complete', tutorialComplete: true }),
      resetTutorial: () => set({
        phase: 'not_started',
        playerName: null,
        hasReceivedStarterSeeds: false,
        hasPlantedFirstSeed: false,
        hasAddedFirstTask: false,
        tutorialComplete: false,
      }),
    }),
    { name: 'rhythm_tutorial' }
  )
);
