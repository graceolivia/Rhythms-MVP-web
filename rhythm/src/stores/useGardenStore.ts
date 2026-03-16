import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { format, getMonth } from 'date-fns';
import type { Flower, FlowerType, Season, Garden } from '../types';

// Your sprite sheets — add new ones here and add an entry to FLOWER_CATALOG below
import snowdropSheet from '../assets/flowers/sheets/0_winter/snowdrop.png';
import winterPansySheet from '../assets/flowers/sheets/0_winter/winter-pansy.png';
import heliotropeSheet from '../assets/flowers/sheets/0_winter/heliotrope.png';
import pinkroseSheet from '../assets/flowers/sheets/2_summer/pinkrose.png';

// ===========================================
// GRID CONFIGURATION
// ===========================================

export const GRID_COLS = 13;
export const GRID_ROWS = 6;

// Positions where growing challenge plants are displayed (avoids path at col 7)
export const PLOT_COLS = [2, 5, 9, 11];
export const PLOT_ROW  = GRID_ROWS - 1; // front row (row 5)

// Blocked cells where the cottage sits (top-center)
export const BLOCKED_CELLS = new Set([
  // Cottage footprint — image only visually reaches into row 0 (cols 5–7, center of 13)
  '5,0', '6,0', '7,0',
  // Stepping stone path — col 7, rows 1–5
  '7,1', '7,2', '7,3', '7,4', '7,5',
]);

// ===========================================
// FLOWER CATALOG - maps earned flower types to display
// ===========================================

// Helpers for sheet-based entries
const sheet = (src: string, label: string, emoji: string) => ({
  emoji, label, sprite: src, sheet: src, sheetBloomFrame: 3, sheetFrameCount: 4,
});

// FLOWER CATALOG — maps FlowerType keys to display info + sprites.
// All entries here use your own sprite sheets (16×16, 4 frames, bloom = frame 3).
// To add a new flower: import its sheet above, add a FlowerType in types/index.ts,
// then add an entry here using the sheet() helper.
export const FLOWER_CATALOG: Record<FlowerType, {
  emoji: string;
  label: string;
  sprite: string;
  sheet?: string;
  sheetBloomFrame?: number;
  sheetFrameCount?: number;
}> = {
  'daily-daisy':        sheet(snowdropSheet,    'Snowdrop',     '❄️'),
  'rhythm-rose':        sheet(pinkroseSheet,    'Pink Rose',    '🌸'),
  'golden-hour-lily':   sheet(winterPansySheet, 'Winter Pansy', '🌸'),
  'self-care-sunflower':sheet(heliotropeSheet,  'Heliotrope',   '💜'),
  'challenge-bloom':    sheet(winterPansySheet, 'Winter Pansy', '🌸'),
  'heliotrope':         sheet(heliotropeSheet,  'Heliotrope',   '💜'),
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
  earnFlower: (type: FlowerType, challengeId?: string, sprite?: string) => string;
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
  autoPlaceFlower: (flowerId: string, flowerType: FlowerType, col: number, row: number) => void;
  removeFlowerFromGrid: (placedId: string) => void;
  moveFlower: (placedId: string, newCol: number, newRow: number) => boolean;
  startMoving: (placedId: string) => void;
  cancelMoving: () => void;
  clearGarden: () => void;
  clearGardenState: () => void;
  replaceGardenData: (flowers: Flower[], placedFlowers: PlacedFlower[]) => void;

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

      earnFlower: (type, challengeId, sprite) => {
        const id = uuidv4();
        const today = format(new Date(), 'yyyy-MM-dd');

        const newFlower: Flower = {
          id,
          type,
          earnedDate: today,
          challengeId: challengeId ?? null,
          sprite: sprite ?? FLOWER_CATALOG[type].sprite,
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

      autoPlaceFlower: (flowerId, flowerType, col, row) => {
        const state = get();
        // Skip if cell already occupied (e.g. a manual placement is already there)
        if (state.placedFlowers.some(f => f.col === col && f.row === row)) return;
        set({
          placedFlowers: [...state.placedFlowers, {
            id: `placed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            flowerId,
            flowerType,
            col,
            row,
            placedAt: new Date().toISOString(),
          }],
        });
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

      replaceGardenData: (flowers, placedFlowers) => {
        set({
          flowers,
          placedFlowers,
          currentSeason: getCurrentSeason(),
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
