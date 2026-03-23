import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import type { Flower, FlowerType, Season, Garden } from '../types';

// Your sprite sheets — add new ones here and add an entry to FLOWER_CATALOG below
import snowdropSheet from '../assets/flowers/sheets/0_winter/snowdrop.png';
import winterPansySheet from '../assets/flowers/sheets/0_winter/winter-pansy.png';
import heliotropeSheet from '../assets/flowers/sheets/0_winter/heliotrope.png';
import pinkroseSheet from '../assets/flowers/sheets/2_summer/pinkrose.png';
import forgetmenotSheet from '../assets/flowers/sheets/1_spring/forgetmenot.png';
import whiteroseSheet from '../assets/flowers/sheets/1_spring/whiterose.png';
import pinktulipSheet from '../assets/flowers/sheets/1_spring/pinktulip.png';
import primulaSheet from '../assets/flowers/sheets/1_spring/primula.png';
import hyacinthSheet from '../assets/flowers/sheets/1_spring/hyacinth.png';
import poppySheet from '../assets/flowers/sheets/1_spring/poppy.png';
import hibiscusSheet from '../assets/flowers/sheets/1_spring/hibiscus.png';
import pansySheet from '../assets/flowers/sheets/1_spring/pansy.png';

// ===========================================
// GRID CONFIGURATION
// ===========================================

export const GRID_COLS = 13;
export const GRID_ROWS = 6;

// Positions where growing challenge plants are displayed (avoids path at col 7)
export const PLOT_COLS = [2, 5, 9, 11];
export const PLOT_ROW  = GRID_ROWS - 1; // front row (row 5)

// Blocked cells — not plantable
export const BLOCKED_CELLS = new Set([
  // House porch — row 0, cols 5–7, 9–10
  '5,0', '6,0', '7,0', '9,0', '10,0',
  // Snowy path — col 7, all rows
  '7,1', '7,2', '7,3', '7,4', '7,5',
]);

// ===========================================
// FLOWER CATALOG - maps earned flower types to display
// ===========================================

// Helpers for sheet-based entries
const sheet  = (src: string, label: string, emoji: string) => ({
  emoji, label, sprite: src, sheet: src, sheetBloomFrame: 4, sheetFrameCount: 5,
});
const sheet6 = (src: string, label: string, emoji: string) => ({
  emoji, label, sprite: src, sheet: src, sheetBloomFrame: 5, sheetFrameCount: 6,
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
  season: Season;
}> = {
  // Winter
  'daily-daisy':        { ...sheet(snowdropSheet,    'Snowdrop',     '❄️'), season: 'winter' },
  'rhythm-rose':        { ...sheet(pinkroseSheet,    'Pink Rose',    '🌸'), season: 'summer' },
  'heliotrope':         { ...sheet(heliotropeSheet,  'Heliotrope',   '💜'), season: 'winter' },
  'winter-pansy':       { ...sheet(winterPansySheet, 'Winter Pansy', '🌸'), season: 'winter' },
  // Spring
  'forget-me-not':      { ...sheet6(forgetmenotSheet, 'Forget-Me-Not', '💙'), season: 'spring' },
  'white-rose':         { ...sheet6(whiteroseSheet,   'White Rose',    '🤍'), season: 'spring' },
  'pink-tulip':         { ...sheet6(pinktulipSheet,   'Pink Tulip',    '🌷'), season: 'spring' },
  'primula':            { ...sheet6(primulaSheet,     'Primula',       '🌼'), season: 'spring' },
  'hyacinth':           { ...sheet6(hyacinthSheet,    'Hyacinth',      '💜'), season: 'spring' },
  'poppy':              { ...sheet6(poppySheet,       'Poppy',         '🌺'), season: 'spring' },
  'hibiscus':           { ...sheet6(hibiscusSheet,    'Hibiscus',      '🌸'), season: 'spring' },
  'pansy':              { ...sheet6(pansySheet,       'Pansy',         '🌸'), season: 'spring' },
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

// Season boundaries (month is 0-indexed, day is 1-indexed)
const SEASON_DATES = [
  { season: 'spring' as Season, month: 2,  day: 20 }, // Mar 20
  { season: 'summer' as Season, month: 5,  day: 21 }, // Jun 21
  { season: 'fall'   as Season, month: 8,  day: 23 }, // Sep 23
  { season: 'winter' as Season, month: 11, day: 21 }, // Dec 21
];

function getCurrentSeason(): Season {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const day   = now.getDate();

  // Walk backwards through boundaries to find which season we're in
  for (let i = SEASON_DATES.length - 1; i >= 0; i--) {
    const { season, month: m, day: d } = SEASON_DATES[i];
    if (month > m || (month === m && day >= d)) return season;
  }
  return 'winter'; // Jan 1 – Mar 19
}

interface GardenState extends Garden {
  // Placed flowers on the grid
  placedFlowers: PlacedFlower[];

  // Season when the garden was last reset (cleared for new season); null = never reset
  lastSeasonReset: Season | null;

  // True after a seasonal reset — cleared once the user dismisses the notice
  seasonResetPending: boolean;
  dismissSeasonReset: () => void;

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
      lastSeasonReset: null,
      seasonResetPending: false,
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

      dismissSeasonReset: () => set({ seasonResetPending: false }),

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
          lastSeasonReset: null,
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
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // Clear the garden grid when the season has changed.
        // We compare the persisted currentSeason (set when flowers were last earned)
        // against the real current season — this catches existing users too.
        const currentSeason = getCurrentSeason();
        if (state.lastSeasonReset !== currentSeason) {
          state.placedFlowers       = [];
          state.lastSeasonReset     = currentSeason;
          state.currentSeason       = currentSeason;
          state.seasonResetPending  = true;
        }

        // Remap old/removed FlowerTypes to their replacements
        const TYPE_REMAP: Record<string, FlowerType> = {
          'golden-hour-lily':    'winter-pansy',
          'challenge-bloom':     'winter-pansy',
          'self-care-sunflower': 'heliotrope',
        };
        state.flowers = state.flowers.map(f =>
          TYPE_REMAP[f.type] ? { ...f, type: TYPE_REMAP[f.type] } : f
        );
        // Also remap flowerType on placedFlowers (stored separately)
        state.placedFlowers = state.placedFlowers.map(p =>
          TYPE_REMAP[p.flowerType] ? { ...p, flowerType: TYPE_REMAP[p.flowerType] } : p
        );
        // Drop any remaining unknown types
        const validTypes = new Set(Object.keys(FLOWER_CATALOG));
        const validFlowerIds = new Set(
          state.flowers.filter(f => validTypes.has(f.type)).map(f => f.id)
        );
        state.flowers       = state.flowers.filter(f => validTypes.has(f.type));
        state.placedFlowers = state.placedFlowers.filter(p => validFlowerIds.has(p.flowerId));
      },
    }
  )
);
