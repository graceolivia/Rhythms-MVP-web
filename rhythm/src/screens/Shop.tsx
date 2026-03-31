import { useState } from 'react';
import { useCoinStore } from '../stores/useCoinStore';
import { useGardenStore, FLOWER_CATALOG, getCurrentSeason } from '../stores/useGardenStore';
import { SpriteSheet } from '../components/garden/SpriteSheet';
import type { FlowerType, Season } from '../types';

const FLOWER_PRICE = 10;

const SEASON_DISPLAY: Record<Season, { label: string; emoji: string }> = {
  spring: { label: 'Spring', emoji: '🌸' },
  summer: { label: 'Summer', emoji: '☀️' },
  fall:   { label: 'Fall',   emoji: '🍂' },
  winter: { label: 'Winter', emoji: '❄️' },
};

export function Shop() {
  const coins = useCoinStore((s) => s.coins);
  const spendCoins = useCoinStore((s) => s.spendCoins);
  const earnFlower = useGardenStore((s) => s.earnFlower);
  const flowers = useGardenStore((s) => s.flowers);

  const currentSeason = getCurrentSeason();
  const { label: seasonLabel, emoji: seasonEmoji } = SEASON_DISPLAY[currentSeason];

  // Flash state: tracks which flower type just got bought
  const [justBought, setJustBought] = useState<FlowerType | null>(null);

  const seasonFlowers = (Object.entries(FLOWER_CATALOG) as [FlowerType, typeof FLOWER_CATALOG[FlowerType]][])
    .filter(([, info]) => info.season === currentSeason);

  const ownedCount = (type: FlowerType) => flowers.filter((f) => f.type === type).length;

  const handleBuy = (type: FlowerType) => {
    if (!spendCoins(FLOWER_PRICE)) return;
    earnFlower(type);
    setJustBought(type);
    setTimeout(() => setJustBought(null), 1000);
  };

  return (
    <div className="min-h-screen bg-parchment/30">
      <div className="max-w-lg mx-auto px-4 pt-8 pb-24">
        <h1 className="font-display text-2xl text-bark mb-1">Shop</h1>
        <p className="text-bark/50 text-sm mb-6">Spend your coins on flowers</p>

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

        {/* Season collection header */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">{seasonEmoji}</span>
          <h2 className="font-semibold text-bark text-sm">{seasonLabel} Collection</h2>
          <span className="ml-auto text-xs text-bark/40">{FLOWER_PRICE} coins each</span>
        </div>

        {/* Flower grid */}
        {seasonFlowers.length === 0 ? (
          <div className="bg-cream rounded-2xl p-6 text-center">
            <p className="text-bark/40 text-sm">No flowers available this season.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {seasonFlowers.map(([type, info]) => {
              const owned = ownedCount(type);
              const canAfford = coins >= FLOWER_PRICE;
              const bought = justBought === type;

              return (
                <div
                  key={type}
                  className="bg-cream rounded-2xl p-4 flex flex-col items-center gap-3"
                >
                  {/* Sprite preview at bloom frame */}
                  <div className="relative">
                    <SpriteSheet
                      src={info.sheet ?? info.sprite}
                      frame={1}
                      frameSize={16}
                      scale={4}
                      shadow
                    />
                    {owned > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-sage text-cream text-[10px] font-semibold rounded-full flex items-center justify-center">
                        ×{owned}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <p className="text-bark font-medium text-sm text-center leading-tight">
                    {info.label}
                  </p>

                  {/* Buy button */}
                  <button
                    onClick={() => handleBuy(type)}
                    disabled={!canAfford}
                    className={`w-full py-2 rounded-xl text-sm font-semibold transition-all ${
                      bought
                        ? 'bg-sage text-cream'
                        : canAfford
                          ? 'bg-terracotta text-cream hover:bg-terracotta/90 active:scale-95'
                          : 'bg-bark/10 text-bark/30 cursor-not-allowed'
                    }`}
                  >
                    {bought ? 'Added!' : `◎ ${FLOWER_PRICE}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-bark/30 mt-6">
          Collection refreshes each season
        </p>
      </div>
    </div>
  );
}
