/**
 * GardenPreview — unified sky + garden tableau for the Today screen.
 *
 * Layout (all values in unscaled px, then CSS-transformed to fit container):
 *
 *   y=0 ──────────── scene top / sky starts
 *   y=8             cottage top
 *   y=128 ─────────── HORIZON_Y: top fence = visual horizon, cottage base
 *   y=160 ─────────── COTTAGE_PAD: grid starts
 *   y=416           grid bottom
 *   y=448 ─────────── FULL_H: bottom fence
 *
 * The cottage sits exactly at the horizon so the upper half is against sky
 * and the lower half is in the garden, giving a natural "village" perspective.
 */

import { useRef, useLayoutEffect, useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useSunTimes } from '../../hooks/useSunTimes';
import { useGardenStore, GRID_COLS, GRID_ROWS, FLOWER_CATALOG, PLOT_COLS, PLOT_ROW } from '../../stores/useGardenStore';
import { useChallengeStore, CHALLENGE_TEMPLATES } from '../../stores/useChallengeStore';
import { GrowthSprite } from '../garden/GrowthSprite';
import { SpriteSheet } from '../garden/SpriteSheet';
import sunPng from '../../assets/sky/sun2.png';
import moonPng from '../../assets/sky/16moon.png';
import daySkyPng from '../../assets/sky/sky2.png';
import nightSkyPng from '../../assets/sky/nightsky.png';
import cottageSprite from '../../assets/cottage_scene/arcticbees-new-house.png';
import dirtTile from '../../assets/cottage_scene/dirt-tile.png';
import steppingStonePath from '../../assets/cottage_scene/stepping-stone-path.png';
import fenceSprite from '../../assets/cottage_scene/fence.png';
import fenceGateSprite from '../../assets/cottage_scene/fence-with-gate.png';
import { CharacterSprite, ROW_IDLE_BOUNCE_FRONT, ROW_IDLE_BOUNCE_SIDE, ROW_IDLE_BOUNCE_BACK } from '../character/CharacterSprite';
import { useCharacterStore } from '../../stores/useCharacterStore';

// ── Layout ────────────────────────────────────────────────────────────────────
const CELL = 32;
const FENCE = CELL;
// HORIZON_Y=112: sky is 16px shorter than before ("a hair lower")
// COTTAGE_PAD=144: grid starts one FENCE below horizon (144-32=112) ✓
// Cottage bottom sits flush with the top fence (HORIZON_Y), entirely in sky.
const HORIZON_Y  = 112;
const COTTAGE_PAD = HORIZON_Y + FENCE; // 144
const GRID_W = GRID_COLS * CELL;       // 416
const GRID_H = GRID_ROWS * CELL;       // 192 (6 rows × 32)
const FULL_W = GRID_W + FENCE * 2;     // 480
const FULL_H = COTTAGE_PAD + GRID_H + FENCE; // 368 (was 448)

// ── Celestial arc ─────────────────────────────────────────────────────────────
const SUN_SIZE = 32;
const MOON_SIZE = 32;
// Arc is measured from HORIZON_Y upward (positive = higher in scene = lower y)
const ARC_BASE_PX = 2;    // px above horizon at sunrise/sunset — sun peeks at the horizon
const ARC_HEIGHT_PX = 58; // additional rise at zenith

// ── Sky helpers ───────────────────────────────────────────────────────────────
type SkyStyle = { type: 'image'; src: string } | { type: 'gradient'; value: string };

function getSkyStyle(p: number): SkyStyle {
  // Colors drawn from rhythms-sky-pack palette
  if (p < -0.15) return { type: 'image', src: nightSkyPng };
  // Pre-dawn: midnightInk → deepIndigo → plumNight → midnightInk
  if (p < -0.02) return { type: 'gradient', value: 'linear-gradient(180deg,#141C26 0%,#2A2C4E 40%,#3F2F4F 70%,#141C26 100%)' };
  // Dawn: dawnPink → apricotLight → powderSky → creamAnchor
  if (p < 0.08)  return { type: 'gradient', value: 'linear-gradient(180deg,#F4D2E0 0%,#EBAA78 40%,#AACCE0 80%,#FEF6EC 100%)' };
  // Early morning: mistBlue → paleSky → champagneCloud → creamAnchor
  if (p < 0.2)   return { type: 'gradient', value: 'linear-gradient(180deg,#84A8C4 0%,#BCDCEC 50%,#FAECD6 80%,#FEF6EC 100%)' };
  if (p < 0.8)   return { type: 'image', src: daySkyPng };
  // Golden hour: softAegean → sunsetPeach → softPetal → creamAnchor
  if (p < 0.92)  return { type: 'gradient', value: 'linear-gradient(180deg,#7094B1 0%,#D68A5C 45%,#E4ABC4 75%,#FEF6EC 100%)' };
  // Sunset: spicedApricot → mauvePink → mauveViolet → deepIndigo
  if (p < 1.02)  return { type: 'gradient', value: 'linear-gradient(180deg,#BA6A44 0%,#B06A8C 35%,#694F80 70%,#2A2C4E 100%)' };
  // Dusk: mulberryShade → inkIndigo → midnightInk
  if (p < 1.15)  return { type: 'gradient', value: 'linear-gradient(180deg,#523D64 0%,#383C64 60%,#141C26 100%)' };
  return { type: 'image', src: nightSkyPng };
}

const snap = (n: number) => Math.round(n / 2) * 2;

// ── Fence tile ────────────────────────────────────────────────────────────────
function FenceTile({ frame, src = fenceSprite, sheetFrames = 8 }: { frame: number; src?: string; sheetFrames?: number }) {
  return (
    <div style={{
      width: CELL, height: CELL, flexShrink: 0,
      backgroundImage: `url(${src})`,
      backgroundSize: `${CELL * sheetFrames}px ${CELL}px`,
      backgroundPosition: `${-frame * CELL}px 0px`,
      imageRendering: 'pixelated',
    }} />
  );
}

// ── Player character ──────────────────────────────────────────────────────────
// Rendered at scale=2: canvas 160×128, visible character ~40×55px.
// Character is centered at canvas x≈80, feet at canvas y≈110.
// Grid-relative start: center on col 7, feet at row 5.
const PLAYER_SCALE   = 2;
const PLAYER_W = 80 * PLAYER_SCALE;   // 160 — full canvas width
const PLAYER_H = 64 * PLAYER_SCALE;   // 128 — full canvas height
const PLAYER_CHAR_CX = 40 * PLAYER_SCALE; // 80 — visible char center-x within canvas
const PLAYER_CHAR_FEET_Y = 55 * PLAYER_SCALE; // 110 — approx feet y within canvas
const PLAYER_START_X = 7 * CELL + CELL / 2 - PLAYER_CHAR_CX; // 160
const PLAYER_START_Y = 3 * CELL - PLAYER_CHAR_FEET_Y;         // -14 — start mid-garden (row 3)
const PLAYER_SPEED = 1.5;
// Frames — 0: side  1: forward  2: back
type PlayerFrame = 0 | 1 | 2;

const DIRECTION_ROW: Record<PlayerFrame, number> = {
  0: ROW_IDLE_BOUNCE_SIDE,
  1: ROW_IDLE_BOUNCE_FRONT,
  2: ROW_IDLE_BOUNCE_BACK,
};

// ── Walkability map ───────────────────────────────────────────────────────────
// Format: 'col,row'  —  col 0 = grid left, row 0 = grid top, negative = above grid.
// Collision is tested at the character's feet center point.
// To add a new blocker, just add a 'col,row' string and a comment explaining what it is.
// House is 91×95px at 2× scale = 182×190px, left edge at col 6, bottom at COTTAGE_PAD.
// Block row 0 for cols 6–11 (house footprint).
const WALK_BLOCKED = new Set<string>([
  '6,0', '7,0', '8,0', '9,0', '10,0', '11,0',
]);

// Returns whether the character's feet center would land in a walkable cell
function isWalkable(px: number, py: number): boolean {
  const col = Math.floor((px + PLAYER_CHAR_CX) / CELL);
  const row = Math.floor((py + PLAYER_CHAR_FEET_Y) / CELL);
  return !WALK_BLOCKED.has(`${col},${row}`);
}

// ── Debug ─────────────────────────────────────────────────────────────────────
const SHOW_GRID_COORDS = import.meta.env.DEV; // auto-off in production

// ── Main component ─────────────────────────────────────────────────────────────
export function GardenPreview({ justBloomedId }: { justBloomedId?: string | null }) {
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [now, setNow] = useState(() => new Date());
  const [playerPos, setPlayerPos] = useState({ x: PLAYER_START_X, y: PLAYER_START_Y });
  const [playerFrame, setPlayerFrame] = useState<PlayerFrame>(1);
  const [playerFlipped, setPlayerFlipped] = useState(false);
  const playerPosRef = useRef({ x: PLAYER_START_X, y: PLAYER_START_Y });
  const keysRef = useRef<Set<string>>(new Set());
  const rafRef = useRef(0);
  const rustleRef = useRef<Map<string, number>>(new Map());

  // Track held arrow keys
  useEffect(() => {
    const ARROWS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
    const onDown = (e: KeyboardEvent) => {
      if (ARROWS.has(e.key)) { e.preventDefault(); keysRef.current.add(e.key); }
    };
    const onUp = (e: KeyboardEvent) => keysRef.current.delete(e.key);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // Game loop
  useEffect(() => {
    const loop = () => {
      const keys = keysRef.current;
      if (keys.size > 0) {
        let { x, y } = playerPosRef.current;
        let dx = 0, dy = 0;
        if (keys.has('ArrowLeft'))  { dx -= PLAYER_SPEED; setPlayerFrame(0); setPlayerFlipped(true);  }
        if (keys.has('ArrowRight')) { dx += PLAYER_SPEED; setPlayerFrame(0); setPlayerFlipped(false); }
        if (keys.has('ArrowUp'))    { dy -= PLAYER_SPEED; setPlayerFrame(2); setPlayerFlipped(false); }
        if (keys.has('ArrowDown'))  { dy += PLAYER_SPEED; setPlayerFrame(1); setPlayerFlipped(false); }
        // Normalize diagonal so speed is consistent
        if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
        // Clamp to scene bounds (uses visible character area, not full transparent canvas)
        const nx = Math.max(-PLAYER_CHAR_CX, Math.min(GRID_W - PLAYER_CHAR_CX, x + dx));
        const ny = Math.max(-CELL * 5,       Math.min(GRID_H + CELL - PLAYER_CHAR_FEET_Y, y + dy));
        // Walkability check with wall-sliding
        if (isWalkable(nx, ny)) {
          x = nx; y = ny;
        } else if (isWalkable(nx, y)) {
          x = nx;           // slide horizontally
        } else if (isWalkable(x, ny)) {
          y = ny;           // slide vertically
        }                   // else fully blocked — don't move
        playerPosRef.current = { x, y };
        setPlayerPos({ x, y });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Scale scene to container width
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setScale(el.offsetWidth / FULL_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Clock tick for celestial bodies
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  // ── Sun / moon arc math ────────────────────────────────────────────────────
  const { sunrise, sunset } = useSunTimes();
  const sunriseMs = sunrise.getTime();
  const sunsetMs  = sunset.getTime();
  const nowMs     = now.getTime();
  const dayLength = sunsetMs - sunriseMs;
  const dayProgress = (nowMs - sunriseMs) / dayLength;

  const sunPosition = useMemo(() => {
    const visible = dayProgress > 0 && dayProgress < 1.05;
    const clamped = Math.max(0, Math.min(1, dayProgress));
    const x = snap(4 + clamped * (FULL_W - SUN_SIZE - 8));
    const rise = ARC_BASE_PX + 4 * clamped * (1 - clamped) * ARC_HEIGHT_PX;
    const y = snap(HORIZON_Y - rise - SUN_SIZE);
    // Fade in over first ~3% of day (~20 min after sunrise); existing fade-out at sunset
    const opacity = dayProgress <= 0.03
      ? dayProgress / 0.03
      : dayProgress > 1 ? Math.max(0, 1 - (dayProgress - 1) * 20) : 1;
    return { visible, x, y, opacity };
  }, [dayProgress]);

  const moonPosition = useMemo(() => {
    const nightLength = 24 * 60 * 60 * 1000 - dayLength;
    let nightProgress: number;
    if (dayProgress > 1)      nightProgress = (nowMs - sunsetMs)  / nightLength;
    else if (dayProgress < 0) nightProgress = 1 - (sunriseMs - nowMs) / nightLength;
    else                      nightProgress = -1;
    const visible = nightProgress > -0.05 && nightProgress < 1.05;
    const clamped = Math.max(0, Math.min(1, nightProgress));
    const x = snap(4 + clamped * (FULL_W - MOON_SIZE - 8));
    const rise = ARC_BASE_PX + 4 * clamped * (1 - clamped) * ARC_HEIGHT_PX;
    const y = snap(HORIZON_Y - rise - MOON_SIZE);
    const opacity = nightProgress < 0
      ? Math.max(0, 1 + nightProgress * 20)
      : nightProgress > 1 ? Math.max(0, 1 - (nightProgress - 1) * 20) : 1;
    return { visible, x, y, opacity };
  }, [dayProgress, nowMs, sunriseMs, sunsetMs, dayLength]);

  const skyStyle     = getSkyStyle(dayProgress);
  const isNight      = dayProgress < -0.1  || dayProgress > 1.1;
  const isDawnOrDusk = (dayProgress > -0.05 && dayProgress < 0.08) || (dayProgress > 0.92 && dayProgress < 1.05);
  const textColor    = isNight ? 'rgba(255,255,255,0.8)' : 'rgba(93,78,55,0.85)';
  const subtextColor = isNight ? 'rgba(255,255,255,0.45)' : 'rgba(93,78,55,0.45)';

  const characterConfig = useCharacterStore(s => s.config);

  // ── Garden data ────────────────────────────────────────────────────────────
  const getFlowerAt      = useGardenStore(s => s.getFlowerAt);
  const activeChallenges = useChallengeStore(s => s.activeChallenges);
  const growing = activeChallenges.filter(
    c => c.status === 'growing' || c.id === justBloomedId
  );

  // Pixel-precise feet Y for depth sorting — fires swap when feet are 85% down the flower's
  // cell so the bloom clears the character's lower body before she pops in front.
  const feetY = playerPos.y + PLAYER_CHAR_FEET_Y;
  const DEPTH_THRESHOLD = CELL * 1.5; // feet must reach halfway into the next row

  // Depth-sorted flowers split into two arrays by charRow.
  // These are rendered inside a single z:6 wrapper using DOM paint order — NOT z-index —
  // so GPU compositing of the character layer can't override them.
  const behindFlowers: React.ReactElement[] = [];
  const frontFlowers:  React.ReactElement[] = [];

  const RUSTLE_DURATION = 500;
  const RUSTLE_RADIUS = CELL * 0.6; // 19px — fires when close to flower center, still catches both when passing between them
  const RUSTLE_DUAL_MARGIN = 4; // px from a row boundary where both adjacent rows rustle
  const renderTime = Date.now();
  // Character center X relative to the FENCE left edge
  const charCenterX = playerPos.x + PLAYER_CHAR_CX;
  // Rustle row — shifted 3px up so the animation fires at the right visual moment
  const rustleAdjFeet = feetY - 16;
  const rustleRow = Math.floor(rustleAdjFeet / CELL);
  const rustlePosInCell = rustleAdjFeet - rustleRow * CELL; // 0 = top of cell, CELL-1 = bottom

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const pf = getFlowerAt(col, row);
      if (!pf) continue;
      const e = FLOWER_CATALOG[pf.flowerType];
      if (!e) continue;
      const x     = FENCE + col * CELL;
      const y     = COTTAGE_PAD + row * CELL;
      const src   = e.sheet ?? e.sprite;
      const frame = e.sheetBloomFrame ?? 0;

      // Rustle: triggered when character's same row and within horizontal radius
      const key = `${col}-${row}`;
      const flowerCenterX = col * CELL + CELL / 2;
      const rowMatch =
        rustleRow === row ||
        (rustleRow === row - 1 && rustlePosInCell >= CELL - RUSTLE_DUAL_MARGIN) || // near boundary below
        (rustleRow === row + 1 && rustlePosInCell <  RUSTLE_DUAL_MARGIN);          // near boundary above
      const isNear = rowMatch && Math.abs(charCenterX - flowerCenterX) < RUSTLE_RADIUS;
      if (isNear && !rustleRef.current.has(key)) {
        rustleRef.current.set(key, renderTime);
      } else if (!isNear) {
        rustleRef.current.delete(key); // clear so re-entry re-triggers
      }
      const rustleStart = rustleRef.current.get(key);
      const isRustling = rustleStart !== undefined && (renderTime - rustleStart) < RUSTLE_DURATION;

      const el = (
        <div key={`f-${col}-${row}`} style={{
          position: 'absolute', left: x, top: y, width: CELL, height: CELL,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={isRustling ? {
            animation: 'rustle 0.5s ease-in-out 1',
            transformOrigin: 'bottom center',
          } : undefined}>
            <SpriteSheet src={src} frame={frame} frameSize={16} scale={2} shadow />
          </div>
        </div>
      );
      if (feetY > row * CELL + DEPTH_THRESHOLD) behindFlowers.push(el);
      else                                       frontFlowers.push(el);
    }
  }

  // gridCells: normally empty (flowers rendered in depth layers); coord labels when debugging.
  const gridCells: React.ReactElement[] = [];
  if (SHOW_GRID_COORDS) {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        gridCells.push(
          <div key={`coord-${col}-${row}`} style={{
            gridColumn: col + 1, gridRow: row + 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.25)',
            pointerEvents: 'none',
          }}>
            <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.75)', fontFamily: 'monospace', lineHeight: 1 }}>
              {col},{row}
            </span>
          </div>
        );
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div ref={wrapRef} style={{ width: '100%', height: FULL_H * scale, overflow: 'hidden' }}>
      <div
        onClick={() => navigate('/garden')}
        style={{
          width: FULL_W, height: FULL_H,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
        }}
      >

        {/* ── Rustle keyframes ── */}
        <style>{`
          @keyframes rustle {
            0%   { transform: rotate(0deg); }
            20%  { transform: rotate(-9deg) translateX(-2px); }
            40%  { transform: rotate(7deg)  translateX(2px);  }
            60%  { transform: rotate(-5deg) translateX(-1px); }
            80%  { transform: rotate(4deg)  translateX(1px);  }
            100% { transform: rotate(0deg); }
          }
        `}</style>

        {/* ── Sky (behind everything, top HORIZON_Y px) ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: FULL_W, height: HORIZON_Y,
          overflow: 'hidden', zIndex: 0,
          ...(skyStyle.type === 'gradient' ? { background: skyStyle.value } : {}),
        }}>
          {skyStyle.type === 'image' && (
            <div style={{ display: 'flex', height: '100%' }}>
              {[0, 1, 2, 3].map(i => (
                <img key={i} src={skyStyle.src} alt=""
                  style={{ height: '100%', width: 'auto', imageRendering: 'pixelated', display: 'block', flexShrink: 0 }}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Sun ── */}
        {sunPosition.visible && (
          <img src={sunPng} alt="" style={{
            position: 'absolute',
            width: SUN_SIZE, height: SUN_SIZE,
            left: sunPosition.x, top: sunPosition.y,
            opacity: sunPosition.opacity,
            imageRendering: 'pixelated',
            filter: isDawnOrDusk ? 'brightness(1.3) saturate(0.7)' : 'none',
            zIndex: 2, pointerEvents: 'none',
          }} />
        )}

        {/* ── Moon ── */}
        {moonPosition.visible && (
          <img src={moonPng} alt="" style={{
            position: 'absolute',
            width: MOON_SIZE, height: MOON_SIZE,
            left: moonPosition.x, top: moonPosition.y,
            opacity: moonPosition.opacity,
            imageRendering: 'pixelated',
            zIndex: 2, pointerEvents: 'none',
          }} />
        )}

        {/* ── Date chip (top-left of sky, stays out of sun path) ── */}
        <div style={{
          position: 'absolute', top: 10, left: 14,
          zIndex: 5, pointerEvents: 'none',
        }}>
          <p style={{ fontSize: 20, lineHeight: 1.15, fontWeight: 600, color: textColor, fontFamily: 'Georgia, serif' }}>
            {format(now, 'MMMM d')}
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.2, color: subtextColor }}>
            {format(now, 'EEEE')} &nbsp;·&nbsp; ☀ {format(sunrise, 'h:mm a')}
          </p>
        </div>

        {/* ── Dirt tile (garden floor, from horizon down) ── */}
        <div style={{
          position: 'absolute', top: HORIZON_Y, left: 0,
          width: FULL_W, height: FULL_H - HORIZON_Y,
          backgroundImage: `url(${dirtTile})`,
          backgroundSize: `${CELL}px ${CELL}px`,
          imageRendering: 'pixelated',
          zIndex: 1,
        }} />

        {/* ── House — 2× scale (182×190px), left at col 6, bottom at grid top) ── */}
        <div style={{
          position: 'absolute', top: COTTAGE_PAD - 126, left: FENCE + 5 * CELL,
          zIndex: 4,
        }}>
          <img src={cottageSprite} alt="House" width={182} height={190}
            style={{ imageRendering: 'pixelated', filter: 'drop-shadow(2px 3px 1px rgba(0,0,0,0.25))', display: 'block' }}
          />
        </div>

        {/* ── Fence + grid (anchored at top: COTTAGE_PAD, left: FENCE) ── */}
        <div style={{ position: 'absolute', top: COTTAGE_PAD, left: FENCE, zIndex: 3 }}>
          <div style={{ position: 'relative' }}>

            {/* Top fence */}
            <div style={{ position: 'absolute', top: -FENCE, left: -FENCE, display: 'flex', zIndex: 2, pointerEvents: 'none' }}>
              <FenceTile frame={3} />
              {Array.from({ length: GRID_COLS }, (_, i) => <FenceTile key={i} frame={4} />)}
              <FenceTile frame={5} />
            </div>
            {/* Bottom fence rendered separately at z:7 — see below the depth layer */}
            {/* Left fence */}
            <div style={{ position: 'absolute', top: 0, left: -FENCE, display: 'flex', flexDirection: 'column', zIndex: 2, pointerEvents: 'none' }}>
              {Array.from({ length: GRID_ROWS }, (_, i) => <FenceTile key={i} frame={7} />)}
            </div>
            {/* Right fence */}
            <div style={{ position: 'absolute', top: 0, left: GRID_W, display: 'flex', flexDirection: 'column', zIndex: 2, pointerEvents: 'none' }}>
              {Array.from({ length: GRID_ROWS }, (_, i) => <FenceTile key={i} frame={6} />)}
            </div>

            {/* Grid — clicks turn the player toward the tap position */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL}px)`,
                gridTemplateRows: `repeat(${GRID_ROWS}, ${CELL}px)`,
                position: 'relative',
              }}
              onClick={e => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                const cx = (e.clientX - rect.left) / scale;
                const cy = (e.clientY - rect.top)  / scale;
                const { x: px, y: py } = playerPosRef.current;
                const dx = cx - (px + PLAYER_W / 2);
                const dy = cy - (py + PLAYER_H / 2);
                if (Math.abs(dx) >= Math.abs(dy)) {
                  setPlayerFrame(0); setPlayerFlipped(dx < 0);
                } else {
                  setPlayerFrame(dy > 0 ? 1 : 2); setPlayerFlipped(false);
                }
              }}
            >
              {gridCells}

              {/* Stepping stone path — col 7 */}
              <div style={{
                position: 'absolute', top: 0, left: 7 * CELL,
                width: CELL, height: GRID_H,
                backgroundImage: `url(${steppingStonePath})`,
                backgroundRepeat: 'repeat-y',
                backgroundSize: `${CELL}px ${CELL}px`,
                zIndex: 1, pointerEvents: 'none',
              }} />

            </div>
          </div>
        </div>

        {/* Depth layer — single z:6 wrapper; DOM paint order does the depth sorting.
            No z-index on children so GPU compositing of the character can't override them:
              1. behindFlowers  — painted first  → appear behind character
              2. character      — painted second → appears over behindFlowers
              3. frontFlowers   — painted last   → appear in front of character        */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 6, pointerEvents: 'none' }}>

          {/* 1. Flowers above character's row */}
          {behindFlowers}

          {/* 1b. Growing challenge plants above character's row */}
          {growing.map(challenge => {
            const col = PLOT_COLS[challenge.plotIndex];
            if (col === undefined || feetY <= PLOT_ROW * CELL + DEPTH_THRESHOLD) return null;
            const template = CHALLENGE_TEMPLATES.find(t => t.id === challenge.templateId);
            const isBlooming = justBloomedId === challenge.id;
            const animate = isBlooming ? 'bloom' : challenge.status === 'bloomed' ? 'none' : 'idle';
            return (
              <div key={`gb-${challenge.id}`} style={{
                position: 'absolute',
                left: FENCE + col * CELL, top: COTTAGE_PAD + PLOT_ROW * CELL,
                width: CELL, height: CELL,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <GrowthSprite stage={challenge.growthStage} flowerType={template?.flowerReward}
                  sprites={template?.sprites} spriteSheet={template?.spriteSheet}
                  size="xs" animate={animate} />
              </div>
            );
          })}

          {/* 2. Character — no willChange so it stays in normal paint flow */}
          {characterConfig && (
            <div style={{
              position: 'absolute',
              left: FENCE + playerPos.x,
              top: COTTAGE_PAD + playerPos.y,
            }}>
              <div style={{
                filter: 'drop-shadow(1px 2px 1px rgba(0,0,0,0.3))',
                transform: playerFlipped ? 'scaleX(-1)' : undefined,
                transformOrigin: 'center',
              }}>
                <CharacterSprite config={characterConfig} scale={PLAYER_SCALE}
                  animate row={DIRECTION_ROW[playerFrame]} />
              </div>
            </div>
          )}

          {/* 3. Flowers at/below character's row */}
          {frontFlowers}

          {/* 3b. Growing challenge plants at/below character's row */}
          {growing.map(challenge => {
            const col = PLOT_COLS[challenge.plotIndex];
            if (col === undefined || feetY > PLOT_ROW * CELL + DEPTH_THRESHOLD) return null;
            const template = CHALLENGE_TEMPLATES.find(t => t.id === challenge.templateId);
            const isBlooming = justBloomedId === challenge.id;
            const animate = isBlooming ? 'bloom' : challenge.status === 'bloomed' ? 'none' : 'idle';
            return (
              <div key={`gf-${challenge.id}`} style={{
                position: 'absolute',
                left: FENCE + col * CELL, top: COTTAGE_PAD + PLOT_ROW * CELL,
                width: CELL, height: CELL,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <GrowthSprite stage={challenge.growthStage} flowerType={template?.flowerReward}
                  sprites={template?.sprites} spriteSheet={template?.spriteSheet}
                  size="xs" animate={animate} />
              </div>
            );
          })}

        </div>

        {/* Bottom fence — z:7, above the character layer so she walks behind it */}
        <div style={{
          position: 'absolute',
          top: COTTAGE_PAD + GRID_H, left: 0,
          display: 'flex', zIndex: 7, pointerEvents: 'none',
        }}>
          <FenceTile frame={0} />
          {Array.from({ length: GRID_COLS }, (_, i) => {
            if (i === 6) return <FenceTile key={i} frame={8}  src={fenceGateSprite} sheetFrames={11} />;
            if (i === 7) return <FenceTile key={i} frame={9}  src={fenceGateSprite} sheetFrames={11} />;
            if (i === 8) return <FenceTile key={i} frame={10} src={fenceGateSprite} sheetFrames={11} />;
            return <FenceTile key={i} frame={1} />;
          })}
          <FenceTile frame={2} />
        </div>

      </div>
    </div>
  );
}
