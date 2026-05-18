import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DecorationState {
  owned: Record<string, number>; // decorationId → count
  buyDecoration: (id: string) => void;
  getCount: (id: string) => number;
}

export const useDecorationStore = create<DecorationState>()(
  persist(
    (set, get) => ({
      owned: {},

      buyDecoration: (id) => {
        set((state) => ({
          owned: { ...state.owned, [id]: (state.owned[id] ?? 0) + 1 },
        }));
      },

      getCount: (id) => get().owned[id] ?? 0,
    }),
    { name: 'rhythm_decorations' }
  )
);
