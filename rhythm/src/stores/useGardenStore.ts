import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { format, getMonth } from 'date-fns';
import type { Flower, FlowerType, Season, Garden } from '../types';

// ===========================================
// GRID CONFIGURATION
// ===========================================

export const GRID_COLS = 7;
export const GRID_ROWS = 8;

// Blocked cells where the cottage sits (top-center)
export const BLOCKED_CELLS = new Set([
  '2,0', '3,0', '4,0',
  '2,1', '3,1', '4,1',
  '2,2', '3,2', '4,2',
]);

// ===========================================
// FLOWER CATALOG - maps earned flower types to display
// ===========================================

export const FLOWER_CATALOG: Record<FlowerType, { emoji: string; label: string }> = {
  'daily-daisy': { emoji: '🌼', label: 'Daily Daisy' },
  'rhythm-rose': { emoji: '🌹', label: 'Rhythm Rose' },
  'golden-hour-lily': { emoji: '🌷', label: 'Golden Hour Lily' },
  'self-care-sunflower': { emoji: '🌻', label: 'Self-Care Sunflower' },
  'challenge-bloom': { emoji: '🌺', label: 'Challenge Bloom' },
};

// ===========================================
// TYPES
// ===========================================

export interface PlacedFlower {
  id: string;
  flowerId: string; // References a Flower.id from the earned flowers
  flowerType: FlowerType;
  col: number;
  row: number;
  placedAt: string;
}

type GardenMode = 'place' | 'move' | 'remove';

function getCurrentSeason(): Season {
  const month = getMonth(new Date()); // 0-11
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

interface GardenState extends Garden {
  // Placed flowers on the grid
  placedFlowers: PlacedFlower[];

  // Currently selected flower type for placement
  selectedFlowerType: FlowerType | null;

  // Current mode
  mode: GardenMode;

  // For move mode - which placed flower is being moved
  movingFlowerId: string | null;

  // Earning flowers
  earnFlower: (type: FlowerType, challengeId?: string) => string;
  getFlowersForDate: (date: string) => Flower[];
  getTotalFlowers: () => number;
  getFlowersByType: (type: FlowerType) => Flower[];
  hasEarnedFlowerToday: (type: FlowerType) => boolean;
  unlockCustomization: (customizationId: string) => void;
  earnDailyFlowerIfEligible: () => boolean;

  // Grid placement actions
  selectFlowerType: (type: FlowerType | null) => void;
  setMode: (mode: GardenMode) => void;
  placeFlower: (col: number, row: number) => boolean;
  removeFlowerFromGrid: (placedId: string) => void;
  moveFlower: (placedId: string, newCol: number, newRow: number) => boolean;
  startMoving: (placedId: string) => void;
  cancelMoving: () => void;
  clearGarden: () => void;
  clearGardenState: () => void;

  // Helpers
  getFlowerAt: (col: number, row: number) => PlacedFlower | undefined;
  getUnplacedFlowers: () => Flower[];
  getUnplacedByType: (type: FlowerType) => Flower[];
}

export const useGardenStore = create<GardenState>()(
  persist(
    (set, get) => ({
      flowers: [],
      currentSeason: getCurrentSeason(),
      unlockedCustomizations: [],
      placedFlowers: [],
      selectedFlowerType: null,
      mode: 'place',
      movingFlowerId: null,

      // ===========================================
      // EARNING FLOWERS (existing functionality)
      // ===========================================

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

      earnDailyFlowerIfEligible: () => {
        const { hasEarnedFlowerToday, earnFlower } = get();

        if (!hasEarnedFlowerToday('daily-daisy')) {
          earnFlower('daily-daisy');
          return true;
        }

        return false;
      },

      // ===========================================
      // GRID PLACEMENT (new functionality)
      // ===========================================

      selectFlowerType: (type) => {
        set({ selectedFlowerType: type, mode: 'place', movingFlowerId: null });
      },

      setMode: (mode) => {
        set({ mode, movingFlowerId: null });
      },

      placeFlower: (col, row) => {
        const state = get();
        const key = `${col},${row}`;

        // Check if blocked
        if (BLOCKED_CELLS.has(key)) return false;

        // Check if already occupied
        if (state.placedFlowers.some(f => f.col === col && f.row === row)) return false;

        // Check if we have the flower type selected and available
        const type = state.selectedFlowerType;
        if (!type) return false;

        // Find an unplaced flower of this type
        const placedFlowerIds = new Set(state.placedFlowers.map(p => p.flowerId));
        const availableFlower = state.flowers.find(
          f => f.type === type && !placedFlowerIds.has(f.id)
        );

        if (!availableFlower) return false;

        // Place it!
        const newPlacedFlower: PlacedFlower = {
          id: `placed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          flowerId: availableFlower.id,
          flowerType: type,
          col,
          row,
          placedAt: new Date().toISOString(),
        };

        set({
          placedFlowers: [...state.placedFlowers, newPlacedFlower],
        });

        return true;
      },

      removeFlowerFromGrid: (placedId) => {
        set((state) => ({
          placedFlowers: state.placedFlowers.filter(f => f.id !== placedId),
        }));
      },

      moveFlower: (placedId, newCol, newRow) => {
        const state = get();
        const key = `${newCol},${newRow}`;

        // Check if blocked
        if (BLOCKED_CELLS.has(key)) return false;

        // Check if already occupied (by a different flower)
        const existingFlower = state.placedFlowers.find(f => f.col === newCol && f.row === newRow);
        if (existingFlower && existingFlower.id !== placedId) return false;

        set({
          placedFlowers: state.placedFlowers.map(f =>
            f.id === placedId ? { ...f, col: newCol, row: newRow } : f
          ),
          movingFlowerId: null,
        });

        return true;
      },

      startMoving: (placedId) => {
        set({ movingFlowerId: placedId, mode: 'move' });
      },

      cancelMoving: () => {
        set({ movingFlowerId: null });
      },

      clearGarden: () => {
        set({
          placedFlowers: [],
          movingFlowerId: null,
        });
      },

      clearGardenState: () => {
        set({
          flowers: [],
          placedFlowers: [],
          selectedFlowerType: null,
          unlockedCustomizations: [],
          currentSeason: getCurrentSeason(),
          mode: 'place',
          movingFlowerId: null,
        });
      },

      getFlowerAt: (col, row) => {
        return get().placedFlowers.find(f => f.col === col && f.row === row);
      },

      getUnplacedFlowers: () => {
        const state = get();
        const placedFlowerIds = new Set(state.placedFlowers.map(p => p.flowerId));
        return state.flowers.filter(f => !placedFlowerIds.has(f.id));
      },

      getUnplacedByType: (type) => {
        const state = get();
        const placedFlowerIds = new Set(state.placedFlowers.map(p => p.flowerId));
        return state.flowers.filter(f => f.type === type && !placedFlowerIds.has(f.id));
      },
    }),
    {
      name: 'rhythm_garden',
    }
  )
);
