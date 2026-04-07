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
  playerName: string | null;
  setConfig: (config: CharacterConfig) => void;
  clearConfig: () => void;
  setPlayerName: (name: string) => void;
}

export const useCharacterStore = create<CharacterState>()(
  persist(
    (set) => ({
      config: null,
      playerName: null,
      setConfig: (config) => set({ config }),
      clearConfig: () => set({ config: null }),
      setPlayerName: (name) => set({ playerName: name }),
    }),
    { name: 'rhythm_character' }
  )
);
