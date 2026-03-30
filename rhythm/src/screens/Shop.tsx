import { useCoinStore } from '../stores/useCoinStore';

export function Shop() {
  const coins = useCoinStore((state) => state.coins);

  return (
    <div className="min-h-screen bg-parchment/30">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
        <h1 className="font-display text-2xl text-bark mb-1">Shop</h1>
        <p className="text-bark/50 text-sm mb-8">Spend your coins on rewards</p>

        {/* Coin balance */}
        <div className="bg-cream rounded-2xl p-5 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-terracotta/10 flex items-center justify-center text-2xl">
            ◎
          </div>
          <div>
            <p className="text-xs text-bark/50 uppercase tracking-wide font-medium">Your balance</p>
            <p className="font-display text-3xl text-bark">{coins}</p>
          </div>
        </div>

        {/* Coming soon */}
        <div className="bg-cream rounded-2xl p-6 text-center">
          <p className="text-bark/40 text-sm">Items coming soon</p>
        </div>
      </div>
    </div>
  );
}
