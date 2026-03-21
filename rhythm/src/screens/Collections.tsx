import { useMemo } from 'react';
import { format } from 'date-fns';
import { useGardenStore, FLOWER_CATALOG } from '../stores/useGardenStore';
import { SpriteSheet } from '../components/garden/SpriteSheet';
import type { FlowerType } from '../types';

// ── Stamp perforation mask ────────────────────────────────────────────────────
// Cuts semicircles from all 4 edges, creating a classic postage-stamp look.
const P = 13; // spacing between hole centers (px)
const R = 5;  // hole radius (px)
const STAMP_MASK = [
  `radial-gradient(circle at 0 50%,    transparent ${R}px, #000 ${R+1}px) -${R}px 0          / ${P}px ${P}px repeat-y`,
  `radial-gradient(circle at 100% 50%, transparent ${R}px, #000 ${R+1}px) calc(100% + ${R}px) 0 / ${P}px ${P}px repeat-y`,
  `radial-gradient(circle at 50% 0,    transparent ${R}px, #000 ${R+1}px) 0 -${R}px          / ${P}px ${P}px repeat-x`,
  `radial-gradient(circle at 50% 100%, transparent ${R}px, #000 ${R+1}px) 0 calc(100% + ${R}px) / ${P}px ${P}px repeat-x`,
].join(', ');

// ── Per-type accent colors ────────────────────────────────────────────────────
const STAMP_COLORS: Record<FlowerType, string> = {
  'daily-daisy':          '#AABFCE',
  'rhythm-rose':          '#C49090',
  'golden-hour-lily':     '#C4A050',
  'self-care-sunflower':  '#8FA87C',
  'challenge-bloom':      '#A898BC',
  'heliotrope':           '#8890BC',
};

// Gentle tilts per position so stamps look hand-arranged
const TILTS = [-1.4, 0.9, -0.7, 1.6, -1.1, 0.5, -0.4, 1.2];

// ── StampCard ─────────────────────────────────────────────────────────────────
function StampCard({ type, count, firstEarned, index }: {
  type: FlowerType;
  count: number;
  firstEarned: string | null;
  index: number;
}) {
  const catalog = FLOWER_CATALOG[type];
  const earned  = count > 0;
  const color   = STAMP_COLORS[type];
  const tilt    = TILTS[index % TILTS.length];

  return (
    <div style={{
      transform: `rotate(${tilt}deg)`,
      filter: earned
        ? 'drop-shadow(2px 5px 10px rgba(93,78,55,0.28))'
        : 'grayscale(1) opacity(0.38) drop-shadow(1px 3px 6px rgba(93,78,55,0.18))',
    }}>
      <div style={{
        background: '#FDFAF4',
        WebkitMaskImage: STAMP_MASK,
        maskImage: STAMP_MASK,
      }}>
        {/* Top color band */}
        <div style={{ height: 8, background: color }} />

        {/* Flower */}
        <div style={{
          padding: '16px 0 12px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 80,
          background: `${color}22`,
        }}>
          {earned ? (
            <SpriteSheet
              src={catalog.sheet ?? catalog.sprite}
              frame={catalog.sheetBloomFrame ?? 0}
              frameSize={16}
              scale={4}
              shadow
            />
          ) : (
            <span style={{ fontSize: 38, opacity: 0.2 }}>✿</span>
          )}
        </div>

        {/* Text */}
        <div style={{ padding: '7px 12px 16px', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'Georgia, serif',
            fontSize: 13,
            fontWeight: 700,
            color: '#5D4E37',
            letterSpacing: '0.01em',
          }}>
            {catalog.label}
          </div>

          {earned ? (
            <>
              <div style={{ fontSize: 11, color: 'rgba(93,78,55,0.55)', marginTop: 4 }}>
                ×{count} earned
              </div>
              {firstEarned && (
                <div style={{
                  fontSize: 9,
                  color: 'rgba(93,78,55,0.4)',
                  marginTop: 5,
                  fontStyle: 'italic',
                  lineHeight: 1.6,
                }}>
                  first earned<br />
                  {format(new Date(firstEarned), 'MMM d, yyyy')}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 10, color: 'rgba(93,78,55,0.3)', marginTop: 4, fontStyle: 'italic' }}>
              not yet earned
            </div>
          )}
        </div>

        {/* Bottom band */}
        <div style={{ height: 5, background: color, opacity: 0.45 }} />
      </div>
    </div>
  );
}

// ── Collections screen ────────────────────────────────────────────────────────
export function Collections() {
  const flowers = useGardenStore(s => s.flowers);

  const stats = useMemo(() => {
    const map = {} as Record<FlowerType, { count: number; firstEarned: string | null }>;
    (Object.keys(FLOWER_CATALOG) as FlowerType[]).forEach(type => {
      map[type] = { count: 0, firstEarned: null };
    });
    flowers.forEach(f => {
      map[f.type].count++;
      if (!map[f.type].firstEarned || f.earnedDate < map[f.type].firstEarned!) {
        map[f.type].firstEarned = f.earnedDate;
      }
    });
    return map;
  }, [flowers]);

  const types = Object.keys(FLOWER_CATALOG) as FlowerType[];
  const typesEarned = types.filter(t => stats[t].count > 0).length;

  return (
    <div className="min-h-screen" style={{ background: '#D9D0C7' }}>
      <div className="max-w-lg mx-auto pb-24">
        <header className="px-5 pt-6 pb-2">
          <h1 className="font-display text-2xl text-bark">Collections</h1>
          <p className="text-sm text-bark/50 mt-0.5">
            {typesEarned} of {types.length} varieties · {flowers.length} total
          </p>
        </header>

        <div className="px-5 py-5 grid grid-cols-2 gap-8">
          {types.map((type, i) => (
            <StampCard
              key={type}
              type={type}
              count={stats[type].count}
              firstEarned={stats[type].firstEarned}
              index={i}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
