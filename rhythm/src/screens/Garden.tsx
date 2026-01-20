import { useMemo } from 'react';
import { format, parseISO, startOfMonth } from 'date-fns';
import { useGardenStore } from '../stores/useGardenStore';
import { useGoodEnoughDay } from '../hooks/useGoodEnoughDay';
import type { Flower, FlowerType, Season } from '../types';

const FLOWER_EMOJI: Record<FlowerType, string> = {
  'daily-daisy': '🌼',
  'rhythm-rose': '🌹',
  'golden-hour-lily': '🌷',
  'self-care-sunflower': '🌻',
  'challenge-bloom': '🌺',
};

const FLOWER_NAMES: Record<FlowerType, string> = {
  'daily-daisy': 'Daily Daisy',
  'rhythm-rose': 'Rhythm Rose',
  'golden-hour-lily': 'Golden Hour Lily',
  'self-care-sunflower': 'Self-Care Sunflower',
  'challenge-bloom': 'Challenge Bloom',
};

const SEASON_THEMES: Record<Season, { bg: string; accent: string; emoji: string }> = {
  spring: { bg: 'bg-spring-light', accent: 'text-spring', emoji: '🌱' },
  summer: { bg: 'bg-summer-light', accent: 'text-summer', emoji: '☀️' },
  fall: { bg: 'bg-fall-light', accent: 'text-fall', emoji: '🍂' },
  winter: { bg: 'bg-winter-light', accent: 'text-winter', emoji: '❄️' },
};

interface FlowerGroup {
  label: string;
  flowers: Flower[];
  startDate: Date;
}

function groupFlowersByMonth(flowers: Flower[]): FlowerGroup[] {
  const groups = new Map<string, FlowerGroup>();

  flowers.forEach((flower) => {
    const date = parseISO(flower.earnedDate);
    const monthStart = startOfMonth(date);
    const key = format(monthStart, 'yyyy-MM');
    const label = format(date, 'MMMM yyyy');

    if (!groups.has(key)) {
      groups.set(key, { label, flowers: [], startDate: monthStart });
    }
    groups.get(key)!.flowers.push(flower);
  });

  return Array.from(groups.values()).sort(
    (a, b) => b.startDate.getTime() - a.startDate.getTime()
  );
}

function FlowerBadge({ flower }: { flower: Flower }) {
  return (
    <div
      className="w-12 h-12 flex items-center justify-center text-2xl rounded-full bg-cream shadow-sm"
      title={`${FLOWER_NAMES[flower.type]} - ${format(parseISO(flower.earnedDate), 'MMM d')}`}
    >
      {FLOWER_EMOJI[flower.type]}
    </div>
  );
}

function PendingFlower() {
  const { isGoodEnough } = useGoodEnoughDay();

  if (isGoodEnough) return null;

  return (
    <div className="w-12 h-12 flex items-center justify-center text-2xl rounded-full bg-linen border-2 border-dashed border-bark/20">
      <span className="opacity-30">🌼</span>
    </div>
  );
}

function FlowerStats() {
  const flowers = useGardenStore((state) => state.flowers);
  const getTotalFlowers = useGardenStore((state) => state.getTotalFlowers);

  const stats = useMemo(() => {
    const total = getTotalFlowers();
    const byType = Object.entries(FLOWER_EMOJI).map(([type, emoji]) => ({
      type: type as FlowerType,
      emoji,
      name: FLOWER_NAMES[type as FlowerType],
      count: flowers.filter((f) => f.type === type).length,
    }));

    return { total, byType: byType.filter((s) => s.count > 0) };
  }, [flowers, getTotalFlowers]);

  return (
    <div className="bg-parchment rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-bark/60 text-sm">Total flowers</span>
        <span className="font-display text-2xl text-bark">{stats.total}</span>
      </div>
      {stats.byType.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {stats.byType.map(({ type, emoji, count }) => (
            <div key={type} className="flex items-center gap-1 text-sm text-bark/70">
              <span>{emoji}</span>
              <span>×{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Garden() {
  const flowers = useGardenStore((state) => state.flowers);
  const currentSeason = useGardenStore((state) => state.currentSeason);
  const hasEarnedFlowerToday = useGardenStore((state) => state.hasEarnedFlowerToday);

  const theme = SEASON_THEMES[currentSeason];
  const groupedFlowers = useMemo(() => groupFlowersByMonth(flowers), [flowers]);
  const showPendingFlower = !hasEarnedFlowerToday('daily-daisy');

  // Get today's flowers
  const today = format(new Date(), 'yyyy-MM-dd');
  const todaysFlowers = flowers.filter((f) => f.earnedDate === today);

  return (
    <div className={`min-h-screen ${theme.bg} p-4`}>
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl text-bark">Your Garden</h1>
          <span>{theme.emoji}</span>
        </div>
        <p className="text-bark/60 text-sm capitalize">{currentSeason} season</p>
      </header>

      <FlowerStats />

      {/* Today's Progress */}
      <section className="mb-6">
        <h2 className="font-body font-semibold text-bark/80 text-sm uppercase tracking-wide mb-3">
          Today
        </h2>
        <div className="bg-cream/50 rounded-lg p-4">
          <div className="flex flex-wrap gap-2">
            {todaysFlowers.map((flower) => (
              <FlowerBadge key={flower.id} flower={flower} />
            ))}
            {showPendingFlower && <PendingFlower />}
            {todaysFlowers.length === 0 && !showPendingFlower && (
              <p className="text-bark/50 text-sm">No flowers yet today</p>
            )}
          </div>
          {showPendingFlower && (
            <p className="text-bark/50 text-xs mt-3">
              Complete your rhythms to earn today's daisy
            </p>
          )}
        </div>
      </section>

      {/* Flower History */}
      {groupedFlowers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🌱</div>
          <p className="text-bark/60">Your garden is just beginning.</p>
          <p className="text-bark/40 text-sm mt-2">
            Complete your daily rhythms to grow flowers.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedFlowers.map((group) => (
            <section key={group.label}>
              <h2 className="font-body font-semibold text-bark/80 text-sm uppercase tracking-wide mb-3">
                {group.label}
              </h2>
              <div className="bg-cream/50 rounded-lg p-4">
                <div className="flex flex-wrap gap-2">
                  {group.flowers.map((flower) => (
                    <FlowerBadge key={flower.id} flower={flower} />
                  ))}
                </div>
                <p className="text-bark/40 text-xs mt-3">
                  {group.flowers.length} flower{group.flowers.length !== 1 ? 's' : ''} bloomed
                </p>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Garden Legend */}
      <section className="mt-8 pt-6 border-t border-bark/10">
        <h2 className="font-body font-semibold text-bark/80 text-sm uppercase tracking-wide mb-3">
          Flower Guide
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(FLOWER_EMOJI).map(([type, emoji]) => (
            <div key={type} className="flex items-center gap-2 text-sm">
              <span className="text-xl">{emoji}</span>
              <span className="text-bark/70">{FLOWER_NAMES[type as FlowerType]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
