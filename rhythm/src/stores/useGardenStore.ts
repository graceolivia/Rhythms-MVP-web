import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { format, getMonth } from 'date-fns';
import type { Flower, FlowerType, Season, Garden } from '../types';

function getCurrentSeason(): Season {
  const month = getMonth(new Date()); // 0-11
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

interface GardenState extends Garden {
  // Actions
  earnFlower: (type: FlowerType, challengeId?: string) => string;
  getFlowersForDate: (date: string) => Flower[];
  getTotalFlowers: () => number;
  getFlowersByType: (type: FlowerType) => Flower[];
  hasEarnedFlowerToday: (type: FlowerType) => boolean;
  unlockCustomization: (customizationId: string) => void;

  // Good Enough integration
  earnDailyFlowerIfEligible: () => boolean;
}

export const useGardenStore = create<GardenState>()(
  persist(
    (set, get) => ({
      flowers: [],
      currentSeason: getCurrentSeason(),
      unlockedCustomizations: [],

      earnFlower: (type, challengeId) => {
        const id = uuidv4();
        const today = format(new Date(), 'yyyy-MM-dd');

        const newFlower: Flower = {
          id,
          type,
          earnedDate: today,
          challengeId: challengeId ?? null,
        };

        set((state) => ({
          flowers: [...state.flowers, newFlower],
          currentSeason: getCurrentSeason(),
        }));

        return id;
      },

      getFlowersForDate: (date) => {
        return get().flowers.filter((flower) => flower.earnedDate === date);
      },

      getTotalFlowers: () => {
        return get().flowers.length;
      },

      getFlowersByType: (type) => {
        return get().flowers.filter((flower) => flower.type === type);
      },

      hasEarnedFlowerToday: (type) => {
        const today = format(new Date(), 'yyyy-MM-dd');
        return get().flowers.some(
          (flower) => flower.type === type && flower.earnedDate === today
        );
      },

      unlockCustomization: (customizationId) => {
        set((state) => {
          if (state.unlockedCustomizations.includes(customizationId)) {
            return state;
          }
          return {
            unlockedCustomizations: [...state.unlockedCustomizations, customizationId],
          };
        });
      },

      // Called when Good Enough is achieved - earns daily-daisy if not already earned today
      earnDailyFlowerIfEligible: () => {
        const { hasEarnedFlowerToday, earnFlower } = get();

        if (!hasEarnedFlowerToday('daily-daisy')) {
          earnFlower('daily-daisy');
          return true;
        }

        return false;
      },
    }),
    {
      name: 'rhythm_garden',
    }
  )
);
