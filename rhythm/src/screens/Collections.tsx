import { useMemo } from 'react';
import { format } from 'date-fns';
import { useGardenStore, FLOWER_CATALOG } from '../stores/useGardenStore';
import { SpriteSheet } from '../components/garden/SpriteSheet';
import type { FlowerType } from '../types';

// ── Stamp border ──────────────────────────────────────────────────────────────
// Uses the classic CSS stamp mask trick:
//   • radial-gradient tiles transparent circles (holes) across the entire element
//     including the padding — these become the perforations
//   • conic-gradient content-box fills the inner content area solid so it is
//     always fully visible regardless of where the circles land
//
// The element background (white) shows through in the padding strips between
// holes, creating the stamp border. The inner content div carries its own
// background (cream), visible because the content-box layer keeps it opaque.
const R = 9; // perforation radius — controls hole size and spacing
const STAMP_MASK =
  `radial-gradient(50% 50%, #0000 66%, #000 67%) round ${R}px ${R}px/${R * 2}px ${R * 2}px, ` +
  `conic-gradient(#000 0 0) content-box`;

// ── Per-type accent colors ────────────────────────────────────────────────────
const STAMP_COLORS: Record<FlowerType, string> = {
  'daily-daisy':          '#AABFCE',
  'rhythm-rose':          '#C49090',
  'golden-hour-lily':     '#C4A050',
  'self-care-sunflower':  '#8FA87C',
  'challenge-bloom':      '#A898BC',
  'heliotrope':           '#8890BC',
};

const TILTS = [-1.4, 0.9, -0.7, 1.6, -1.1, 0.5];

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
      // drop-shadow follows the perforated stamp outline (not the bounding box)
      filter: earned
        ? 'drop-shadow(2px 5px 12px rgba(93,78,55,0.32))'
        : 'grayscale(1) opacity(0.38) drop-shadow(1px 3px 6px rgba(93,78,55,0.18))',
    }}>
      {/* Stamp shell — warm cream perforated teeth */}
      <div style={{
        padding: R,
        background: '#F0E6D3',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        WebkitMask: STAMP_MASK,
        mask: STAMP_MASK,
      } as React.CSSProperties}>

        {/* Inner content — two nested 1px lines frame the cream interior */}
        <div style={{ background: '#FDF5E8', border: `1px solid ${color}`, padding: 3 }}>
        <div style={{ border: `1px solid ${color}` }}>

          {/* Flower */}
          <div style={{
            padding: '16px 0 12px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: 78,
            background: `${color}12`,
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
              <span style={{ fontSize: 38, opacity: 0.18 }}>✿</span>
            )}
          </div>

          {/* Text */}
          <div style={{ padding: '7px 10px 14px', textAlign: 'center' }}>
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
              <div style={{ fontSize: 10, color: 'rgba(93,78,55,0.28)', marginTop: 4, fontStyle: 'italic' }}>
                not yet earned
              </div>
            )}
          </div>

        </div>
        </div>
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
