import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCoinStore } from './useCoinStore';

export type TutorialPhase =
  | 'not_started'
  | 'entrance'
  | 'intro'
  | 'name_input'
  | 'receive_seeds'
  | 'plant_prompt'
  | 'first_plant_response'
  | 'growth_demo'
  | 'wrap_up'
  | 'awaiting_first_task'
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

      startTutorial: () => {
        useCoinStore.setState((s) => ({ coins: s.coins + 50 }));
        set({ phase: 'entrance' });
      },
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
