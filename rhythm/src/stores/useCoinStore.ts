import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';

interface CoinState {
  coins: number;
  bonusEarnedDate: string | null;
  pendingBonus: boolean;
  earnCoin: () => void;
  spendCoins: (amount: number) => boolean;
  earnDailyBonus: () => void;
  clearPendingBonus: () => void;
}

export const useCoinStore = create<CoinState>()(
  persist(
    (set, get) => ({
      coins: 0,
      bonusEarnedDate: null,
      pendingBonus: false,
      earnCoin: () => set((state) => ({ coins: state.coins + 1 })),
      spendCoins: (amount) => {
        if (get().coins < amount) return false;
        set((state) => ({ coins: state.coins - amount }));
        return true;
      },
      earnDailyBonus: () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        if (get().bonusEarnedDate === today) return;
        set((state) => ({
          coins: state.coins + 3,
          bonusEarnedDate: today,
          pendingBonus: true,
        }));
      },
      clearPendingBonus: () => set({ pendingBonus: false }),
    }),
    { name: 'rhythm_coins' }
  )
);
