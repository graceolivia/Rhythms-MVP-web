import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CoinState {
  coins: number;
  earnCoin: () => void;
  spendCoins: (amount: number) => boolean;
}

export const useCoinStore = create<CoinState>()(
  persist(
    (set, get) => ({
      coins: 0,
      earnCoin: () => set((state) => ({ coins: state.coins + 1 })),
      spendCoins: (amount) => {
        if (get().coins < amount) return false;
        set((state) => ({ coins: state.coins - amount }));
        return true;
      },
    }),
    { name: 'rhythm_coins' }
  )
);
