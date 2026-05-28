import { useState } from 'react';
import { useCoinStore } from '../stores/useCoinStore';
import { useGardenStore, FLOWER_CATALOG, getCurrentSeason } from '../stores/useGardenStore';
import { useDecorationStore } from '../stores/useDecorationStore';
import { SpriteSheet } from '../components/garden/SpriteSheet';
import { ChallengesPanel } from './Challenges';
import { DECOR_CATALOG } from '../data/decorations';
import { useAnimatedFrame } from '../hooks/useAnimatedFrame';
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

  const buyDecoration = useDecorationStore((s) => s.buyDecoration);
  const getDecorCount = useDecorationStore((s) => s.getCount);

  const [tab, setTab] = useState<'shop' | 'challenges'>('shop');
  const [shopSubTab, setShopSubTab] = useState<'seeds' | 'decorations'>('seeds');
  const [justBought, setJustBought] = useState<FlowerType | null>(null);
  const [justBoughtDecor, setJustBoughtDecor] = useState<string | null>(null);
  const fountainFrame = useAnimatedFrame(4);

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
      <div className="max-w-lg mx-auto px-4 pt-8">

        {/* Top-level tab bar */}
        <div className="flex gap-1 bg-cream rounded-lg p-1 mb-6">
          <button
            onClick={() => setTab('shop')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === 'shop' ? 'bg-parchment text-bark shadow-sm' : 'text-bark/40 hover:text-bark/60'
            }`}
          >
            Shop
          </button>
          <button
            onClick={() => setTab('challenges')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              tab === 'challenges' ? 'bg-parchment text-bark shadow-sm' : 'text-bark/40 hover:text-bark/60'
            }`}
          >
            Challenges
          </button>
        </div>

        {tab === 'shop' && (
          /* Sub-tab bar */
          <div className="flex gap-1 bg-cream rounded-lg p-1 mb-6">
            <button
              onClick={() => setShopSubTab('seeds')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                shopSubTab === 'seeds' ? 'bg-parchment text-bark shadow-sm' : 'text-bark/40 hover:text-bark/60'
              }`}
            >
              Seed Shop
            </button>
            <button
              onClick={() => setShopSubTab('decorations')}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                shopSubTab === 'decorations' ? 'bg-parchment text-bark shadow-sm' : 'text-bark/40 hover:text-bark/60'
              }`}
            >
              Garden Decorations
            </button>
          </div>
        )}

        {tab === 'shop' && shopSubTab === 'seeds' ? (
          <>
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

                      <p className="text-bark font-medium text-sm text-center leading-tight">
                        {info.label}
                      </p>

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

            <p className="text-center text-xs text-bark/30 mt-6 mb-24">
              Collection refreshes each season
            </p>
          </>
        ) : tab === 'shop' && shopSubTab === 'decorations' ? (
          <>
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

            <div className="grid grid-cols-2 gap-3 mb-24">
              {DECOR_CATALOG.filter(item => item.purchasable ?? item.price != null).map((item) => {
                const owned = getDecorCount(item.id);
                const canAfford = coins >= item.price!;
                const bought = justBoughtDecor === item.id;
                const frame = (item.frames ?? 1) > 1 ? fountainFrame : 0;

                return (
                  <div key={item.id} className="bg-cream rounded-2xl p-4 flex flex-col items-center gap-3">
                    <div className="relative flex items-end justify-center" style={{ height: 64 }}>
                      <SpriteSheet
                        src={item.src}
                        frame={frame}
                        frameSize={item.frameSize}
                        frameWidth={item.frameWidth}
                        scale={item.shopScale}
                        shadow
                      />
                      {owned > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-sage text-cream text-[10px] font-semibold rounded-full flex items-center justify-center">
                          ×{owned}
                        </span>
                      )}
                    </div>

                    <p className="text-bark font-medium text-sm text-center leading-tight">
                      {item.label}
                    </p>

                    <button
                      onClick={() => {
                        if (!spendCoins(item.price!)) return;
                        buyDecoration(item.id);
                        setJustBoughtDecor(item.id);
                        setTimeout(() => setJustBoughtDecor(null), 1000);
                      }}
                      disabled={!canAfford}
                      className={`w-full py-2 rounded-xl text-sm font-semibold transition-all ${
                        bought
                          ? 'bg-sage text-cream'
                          : canAfford
                            ? 'bg-terracotta text-cream hover:bg-terracotta/90 active:scale-95'
                            : 'bg-bark/10 text-bark/30 cursor-not-allowed'
                      }`}
                    >
                      {bought ? 'Added!' : `◎ ${item.price!}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <ChallengesPanel />
        )}
      </div>
    </div>
  );
}
