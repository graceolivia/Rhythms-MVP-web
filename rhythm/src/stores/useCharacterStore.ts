import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type HairStyle = 'braids' | 'buns' | 'ponytails';

export interface CharacterConfig {
  skinTone: number;   // 0-2 (variant index in body/arms sheets)
  outfitColor: number; // 0-7 (variant index in clothes sheet)
  hairStyle: HairStyle;
  hairColor: number;  // 0-7 (variant index in hair sheet)
}

interface CharacterState {
  config: CharacterConfig | null;
  setConfig: (config: CharacterConfig) => void;
  clearConfig: () => void;
}

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set) => ({
      config: null,
      setConfig: (config) => set({ config }),
      clearConfig: () => set({ config: null }),
    }),
    { name: 'rhythm_character' }
  )
);
