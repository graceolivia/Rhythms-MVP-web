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

import { useRef, useLayoutEffect, useState, useMemo, useEffect, useCallback } from 'react';

import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { useSunTimes } from '../../hooks/useSunTimes';
import { useGardenStore, GRID_COLS, GRID_ROWS, FLOWER_CATALOG, PLOT_COLS, PLOT_ROW, BLOCKED_CELLS, getCurrentSeason } from '../../stores/useGardenStore';
import type { FlowerType, Season } from '../../types';
import { useChallengeStore, CHALLENGE_TEMPLATES } from '../../stores/useChallengeStore';
import { useSettingsStore, getChallengeWitherLevel } from '../../stores/useSettingsStore';
import { useTutorialStore } from '../../stores/useTutorialStore';
import { TutorialOverlay } from '../tutorial/TutorialOverlay';
import { GrowthSprite } from '../garden/GrowthSprite';
import { SpriteSheet } from '../garden/SpriteSheet';
import sunPng from '../../assets/sky/sun2.png';
import moonPng from '../../assets/sky/16moon.png';
import daySkyPng from '../../assets/sky/sky2.png';
import nightSkyPng from '../../assets/sky/nightsky.png';
import winterSheetPng from '../../assets/cottage_scene/farm_winter_recolor.png';
import springSheetPng from '../../assets/cottage_scene/farm_spring_summer.png';
import autumnSheetPng from '../../assets/cottage_scene/farm_autumn.png';
import { winterGroundDark, house_small, fencePieces, fenceDoorOpening, snowyPath, snowPiles, right_tree, pine_tree, mailbox } from '../../assets/cottage_scene/winterSprites';
import { spring_pine_tree, spring_house, spring_mailbox, spring_fencePieces, spring_fenceDoorOpening, spring_path } from '../../assets/cottage_scene/springSprites';
import { autumn_pine_tree, autumn_house, autumn_mailbox, autumn_fencePieces, autumn_fenceDoorOpening, autumn_path } from '../../assets/cottage_scene/autumnSprites';
import { CharacterSprite, ROW_IDLE_BOUNCE_FRONT, ROW_IDLE_BOUNCE_SIDE, ROW_IDLE_BOUNCE_BACK } from '../character/CharacterSprite';
import { useCharacterStore } from '../../stores/useCharacterStore';
import { useCoinStore } from '../../stores/useCoinStore';
import witchBroomSheet    from '../../assets/npcs/witch_idle_on_a_broom-Sheet.png';
import witchWalkLeftSheet from '../../assets/npcs/witch_walk_left-Sheet.png';
import witchIdlePng       from '../../assets/npcs/witch_idle.png';
import arrowPng           from '../../assets/effects/arrow.png';
import sparklePng         from '../../assets/effects/sparkle.png';

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

// ── Fence tile constants ───────────────────────────────────────────────────────
const FENCE_TILE_SRC = 16; // source px in spritesheet
const FENCE_TILE_DST = CELL; // dest px in scene (2× scale)

// ── Player character ──────────────────────────────────────────────────────────
// Rendered at scale=2: canvas 160×128, visible character ~40×55px.
// Character is centered at canvas x≈80, feet at canvas y≈110.
// Grid-relative start: center on col 7, feet at row 5.
const PLAYER_SCALE   = 2;
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
// Pine tree occupies (0,0)–(2,0). House porch occupies row 0 cols 5–7, 9–10.
// Row -1 and above is blocked via y-clamp in the game loop.
const WALK_BLOCKED = new Set<string>([
  '5,0', '6,0', '7,0', '8,0', '9,0', '10,0', // house porch
]);

// Returns whether the character's feet center would land in a walkable cell
function isWalkable(px: number, py: number): boolean {
  const col = Math.floor((px + PLAYER_CHAR_CX) / CELL);
  const row = Math.floor((py + PLAYER_CHAR_FEET_Y - HOUSE_TILE) / CELL);
  return !WALK_BLOCKED.has(`${col},${row}`);
}

// ── Winter ground tiles ───────────────────────────────────────────────────────
// 16×16 source tiles from farm_winter.png, drawn at 2× scale (32px dest) to match fence/path art.
// Canvas covers y=HORIZON_Y → FULL_H, x=0 → FULL_W (15 cols × 8 rows at 32px/tile).
const GROUND_TILE     = 16;  // source tile size in spritesheet
const GROUND_TILE_DST = 32;  // destination tile size in scene (2× scale)
// Derived at runtime once the layout constants above are defined:
const GROUND_COLS = FULL_W / GROUND_TILE_DST;                              // 15
const GROUND_ROWS = (FULL_H - HORIZON_Y) / GROUND_TILE_DST;               // 8
const GARDEN_COL_START = 0;                                                // left border sits under fence
const GARDEN_COL_END   = GROUND_COLS - 1;                                  // 14 — mirrors left, sits under right fence
const GARDEN_ROW_START = (COTTAGE_PAD - HORIZON_Y) / GROUND_TILE_DST;     // 1
// Path occupies garden grid cols 6–8 → ground tile cols 7–9
const GROUND_PATH_COL_START = (FENCE + 6 * CELL) / GROUND_TILE_DST;       // 7
const GROUND_PATH_COL_END   = (FENCE + 9 * CELL) / GROUND_TILE_DST - 1;   // 9
const GARDEN_ROW_END   = (COTTAGE_PAD - HORIZON_Y + GRID_H) / GROUND_TILE_DST;  // 7

function getGroundTile(col: number, row: number): { sx: number; sy: number } {
  const inCol = col >= GARDEN_COL_START && col <= GARDEN_COL_END;
  const inRow = row >= GARDEN_ROW_START && row <= GARDEN_ROW_END;
  if (!inCol || !inRow) return winterGroundDark.solidSnow;
  const underLeftFence  = col === 0;                // leftmost tile, under left fence
  const underRightFence = col === GROUND_COLS - 1;  // rightmost tile, under right fence
  if (row === GARDEN_ROW_START) {
    if (underLeftFence)  return winterGroundDark.topLeft;
    if (underRightFence) return winterGroundDark.topRight;
    return winterGroundDark.topCenter;
  }
  if (row === GARDEN_ROW_END) {
    if (underLeftFence)  return winterGroundDark.bottomLeft;
    if (underRightFence) return winterGroundDark.bottomRight;
    return winterGroundDark.bottomCenter;
  }
  if (underLeftFence)  return winterGroundDark.midLeft;
  if (underRightFence) return winterGroundDark.midRight;
  if (col >= GROUND_PATH_COL_START && col <= GROUND_PATH_COL_END) return winterGroundDark.dirt;
  return winterGroundDark.dirt;
}

// ── House sprite ──────────────────────────────────────────────────────────────
// house_small tile data imported from winterSprites.ts
const HOUSE_MIN_COL = 44;
const HOUSE_MIN_ROW = 23;
const HOUSE_TILE = 16;
const HOUSE_COLS = 6; // cols 44–49
const HOUSE_ROWS = 6; // rows 23–28

// ── Debug ─────────────────────────────────────────────────────────────────────
// Run `VITE_HIDE_DEV_OVERLAY=1 npm run dev` to hide all dev overlays
const DEV_OVERLAY = import.meta.env.DEV && !import.meta.env.VITE_HIDE_DEV_OVERLAY;
const SHOW_GRID_COORDS = DEV_OVERLAY;

// ── Witch — scene-coordinate constants ───────────────────────────────────────
// All values are unscaled scene pixels (same space as CELL, FENCE, etc.)
const WITCH_SCALE = 2;
const WITCH_FRAME = 32;
const WITCH_W = WITCH_FRAME * WITCH_SCALE; // 64
const WITCH_H = WITCH_FRAME * WITCH_SCALE; // 64
// Player feet in scene coords
const PLAYER_FEET_SCENE_Y = COTTAGE_PAD + PLAYER_START_Y + PLAYER_CHAR_FEET_Y; // 240
// Witch sprite has bottom padding so her visual feet aren't at the sprite's bottom edge
const WITCH_FEET_OFFSET = 12; // px to raise so she visually lines up with the player
// Witch sprite top when standing on ground (feet match player ground level)
const WITCH_GROUND_TOP = PLAYER_FEET_SCENE_Y - WITCH_H - WITCH_FEET_OFFSET; // 156
// Fly-right: enters from just off the left edge, glides slowly to near the right edge
const WITCH_FLY_START_LEFT = -WITCH_W;               // -64 — off left edge
const WITCH_FLY_TOP        = 36;                     // cruising altitude in the sky
const WITCH_PEAK_LEFT      = FULL_W - WITCH_W - 12;  // 404 — near right edge, past the house
// Fly-down: flips around and swoops diagonally to land right of the player
const WITCH_LAND_LEFT  = FENCE + 10 * CELL; // 352 — col 10, a few paces right of player
// Walk-left: strolls back to stand just right of the player (col 7)
const WITCH_FINAL_LEFT = FENCE +  8 * CELL; // 288 — col 8, beside player

type WitchStep = 'fly_right' | 'fly_down' | 'landing' | 'walking' | 'arrived' | 'fly_away';

/**
 * Witch NPC — visible for the full tutorial lifecycle.
 *
 * Entrance:  fly_right → fly_down → landing → walking → arrived → dialogue
 * Exit:      tutorialComplete fires → fly_away (broom, upper-left) → gone
 *
 * Dialogue phases: idle sprite stays at WITCH_FINAL_LEFT / WITCH_GROUND_TOP.
 */
function WitchInScene() {
  const tutorialPhase    = useTutorialStore((s) => s.phase);
  const tutorialComplete = useTutorialStore((s) => s.tutorialComplete);

  const [step,  setStep]  = useState<WitchStep>('fly_right');
  const [left,  setLeft]  = useState(WITCH_FLY_START_LEFT);
  const [top,   setTop]   = useState(WITCH_FLY_TOP);
  const [frame, setFrame] = useState(0);
  const [gone,  setGone]  = useState(() => tutorialComplete);

  const isEntrance = tutorialPhase === 'entrance';

  // Entrance animation state machine
  useEffect(() => {
    if (!isEntrance) return;
    const t: ReturnType<typeof setTimeout>[] = [];

    // ① Slow sweep right across the sky (3 s ease-in-out)
    t.push(setTimeout(() => setLeft(WITCH_PEAK_LEFT), 50));

    // ② At peak: flip around, then swoop diagonally down-left to landing spot
    t.push(setTimeout(() => setStep('fly_down'),                              3150));
    t.push(setTimeout(() => { setLeft(WITCH_LAND_LEFT); setTop(WITCH_GROUND_TOP); }, 3250));

    // ③ Hop off broom
    t.push(setTimeout(() => setStep('landing'), 4350));

    // ④ Walk left toward player
    t.push(setTimeout(() => setStep('walking'),         4850));
    t.push(setTimeout(() => setLeft(WITCH_FINAL_LEFT),  4950));

    // ⑤ Arrive — start dialogue
    t.push(setTimeout(() => setStep('arrived'),                               5950));
    t.push(setTimeout(() => useTutorialStore.getState().setPhase('intro'),    6450));

    return () => t.forEach(clearTimeout);
  }, [isEntrance]);

  // Fly-away when tutorial completes
  useEffect(() => {
    if (!tutorialComplete) return;
    const t: ReturnType<typeof setTimeout>[] = [];
    // Snap position to ground before animating (handles the isDialogue override)
    setLeft(WITCH_FINAL_LEFT);
    setTop(WITCH_GROUND_TOP);
    setStep('fly_away');
    // Brief pause (she's hopping on), then lift off up-left
    t.push(setTimeout(() => { setLeft(WITCH_FLY_START_LEFT); setTop(-WITCH_H); }, 400));
    // Unmount after she's off-screen
    t.push(setTimeout(() => setGone(true), 2200));
    return () => t.forEach(clearTimeout);
  }, [tutorialComplete]);

  // Frame cycling for animated steps
  useEffect(() => {
    const animated = step === 'fly_right' || step === 'fly_down' || step === 'walking' || step === 'fly_away';
    setFrame(0);
    if (!animated) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % 4), 125); // 8 fps
    return () => clearInterval(id);
  }, [step]);

  if (gone || tutorialPhase === 'not_started') return null;

  // Dialogue phases: snap witch to her final resting spot (handles page re-mounts too)
  const isDialogue = !isEntrance && !tutorialComplete && tutorialPhase !== 'complete';
  const displayLeft = isDialogue ? WITCH_FINAL_LEFT : left;
  const displayTop  = isDialogue ? WITCH_GROUND_TOP : top;
  const displayStep = isDialogue ? 'arrived'        : step;

  const transition = isDialogue        ? 'none' :
    step === 'fly_right' ? 'left 3.0s ease-in-out' :
    step === 'fly_down'  ? 'left 1.0s ease-out, top 1.0s ease-out' :
    step === 'walking'   ? 'left 1.0s linear' :
    step === 'fly_away'  ? 'left 1.6s ease-in, top 1.6s ease-in' :
    'none';

  // Sprite selection
  const isBroom   = displayStep === 'fly_right' || displayStep === 'fly_down' || displayStep === 'fly_away';
  const isWalking = displayStep === 'walking';
  const src       = isBroom ? witchBroomSheet : isWalking ? witchWalkLeftSheet : null;
  const bgSize    = src ? `${4 * WITCH_W}px ${WITCH_H}px` : `${WITCH_W}px ${WITCH_H}px`;
  const bgPos     = src ? `-${frame * WITCH_W}px 0` : '0 0';
  // Broom faces left by default; flip only when flying right
  const flipX     = displayStep === 'fly_right';

  return (
    <div
      style={{
        position:    'absolute',
        left:        displayLeft,
        top:         displayTop,
        width:       WITCH_W,
        height:      WITCH_H,
        transition,
        backgroundImage:    `url(${src ?? witchIdlePng})`,
        backgroundSize:     bgSize,
        backgroundPosition: bgPos,
        imageRendering: 'pixelated',
        transform:   flipX ? 'scaleX(-1)' : undefined,
        pointerEvents: 'none',
      }}
    />
  );
}

// ── Sparkle overlay ────────────────────────────────────────────────────────────
// Plays a 3-frame sparkle animation at a flower's cell whenever it is planted or grows.

const SPARKLE_FRAMES   = 3;
const SPARKLE_FRAME_MS = 130;  // ms per frame → ~390ms total
const SPARKLE_SCALE    = 3;    // 16 * 3 = 48px — slightly larger than a cell for drama
const SPARKLE_PX       = 16 * SPARKLE_SCALE;

type SparkleInstance = { id: string; col: number; row: number };

function SparkleOverlay() {
  const [sparkles, setSparkles] = useState<SparkleInstance[]>([]);
  const [frame, setFrame]       = useState(0);

  // Global frame ticker
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % SPARKLE_FRAMES), SPARKLE_FRAME_MS);
    return () => clearInterval(id);
  }, []);

  // Subscribe to garden store — detect new placements and growth ticks
  useEffect(() => {
    return useGardenStore.subscribe((state, prev) => {
      const added: SparkleInstance[] = [];
      state.placedFlowers.forEach((pf) => {
        const prevPf = prev.placedFlowers.find((p) => p.id === pf.id);
        if (!prevPf || pf.growthTicks > (prevPf.growthTicks ?? 0)) {
          added.push({ id: `${pf.id}-${Date.now()}`, col: pf.col, row: pf.row });
        }
      });
      if (added.length === 0) return;
      setSparkles((s) => [...s, ...added]);
      setTimeout(
        () => setSparkles((s) => s.filter((sp) => !added.some((a) => a.id === sp.id))),
        SPARKLE_FRAME_MS * SPARKLE_FRAMES + 50,
      );
    });
  }, []);

  if (sparkles.length === 0) return null;

  // Center the sparkle sprite over the cell
  const offset = (SPARKLE_PX - CELL) / 2;

  return (
    <>
      {sparkles.map((s) => (
        <div
          key={s.id}
          style={{
            position:          'absolute',
            left:              FENCE + s.col * CELL - offset,
            top:               COTTAGE_PAD + s.row * CELL - offset,
            width:             SPARKLE_PX,
            height:            SPARKLE_PX,
            backgroundImage:   `url(${sparklePng})`,
            backgroundSize:    `${SPARKLE_FRAMES * SPARKLE_PX}px ${SPARKLE_PX}px`,
            backgroundPosition:`-${frame * SPARKLE_PX}px 0`,
            imageRendering:    'pixelated',
            pointerEvents:     'none',
            zIndex:            25,
          }}
        />
      ))}
    </>
  );
}

// ── Tutorial plot overlay ───────────────────────────────────────────────────────
// Renders pulsing tappable circles over each front-row plot during the tutorial
// plant_prompt phase. Lives inside the scaled scene div so it scales with the garden.
function TutorialPlotOverlay() {
  const phase = useTutorialStore((s) => s.phase);
  const setPhase = useTutorialStore((s) => s.setPhase);
  const markSeedPlanted = useTutorialStore((s) => s.markSeedPlanted);
  const getUnplacedFlowers = useGardenStore((s) => s.getUnplacedFlowers);
  const autoPlaceFlower = useGardenStore((s) => s.autoPlaceFlower);

  if (phase !== 'plant_prompt') return null;

  // Plant at the same row as the player (row 3 = COTTAGE_PAD + 3*CELL = player feet Y)
  // and one cell to the left (col 6; player stands at col 7 on the path)
  const TUTORIAL_PLANT_COL = 6;
  const TUTORIAL_PLANT_ROW = 1;

  const handlePlant = () => {
    const unplaced = getUnplacedFlowers().find((f) => f.type === 'forget-me-not');
    if (unplaced) {
      autoPlaceFlower(unplaced.id, 'forget-me-not', TUTORIAL_PLANT_COL, TUTORIAL_PLANT_ROW);
    }
    markSeedPlanted();
    setPhase('first_plant_response');
  };

  const spotLeft = FENCE + TUTORIAL_PLANT_COL * CELL;
  const spotTop  = COTTAGE_PAD + TUTORIAL_PLANT_ROW * CELL;

  return (
    <>
      <style>{`
        @keyframes tutorialPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(122,158,126,0.7); transform: scale(1); }
          50% { box-shadow: 0 0 0 8px rgba(122,158,126,0); transform: scale(1.08); }
        }
        @keyframes tutorialBounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-4px); }
        }
      `}</style>

      {/* Pulsing highlight on the cell */}
      <div
        onClick={handlePlant}
        style={{
          position: 'absolute',
          left: spotLeft,
          top: spotTop,
          width: CELL,
          height: CELL,
          borderRadius: '50%',
          border: '2px solid rgba(122,158,126,0.9)',
          background: 'rgba(122,158,126,0.3)',
          animation: 'tutorialPulse 1.8s ease-in-out infinite',
          cursor: 'pointer',
          zIndex: 20,
        }}
      />

      {/* Arrow pointing down at the spot */}
      <img
        src={arrowPng}
        onClick={handlePlant}
        style={{
          position: 'absolute',
          left: spotLeft + CELL / 2 - 16,
          top: spotTop - 36,
          width: 32,
          height: 32,
          imageRendering: 'pixelated',
          animation: 'tutorialBounce 1.0s ease-in-out infinite',
          cursor: 'pointer',
          zIndex: 21,
          pointerEvents: 'auto',
        }}
      />
    </>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function GardenPreview({ justBloomedId }: { justBloomedId?: string | null }) {
  const coins = useCoinStore((state) => state.coins);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [now, setNow] = useState(() => new Date());
  const [simProgress, setSimProgress] = useState<number | null>(null); // dev-only time scrubber
  const [simSeason,   setSimSeason]   = useState<Season | null>(null); // dev-only season override
  const [playerPos, setPlayerPos] = useState({ x: PLAYER_START_X, y: PLAYER_START_Y });
  const [playerFrame, setPlayerFrame] = useState<PlayerFrame>(1);
  const [playerFlipped, setPlayerFlipped] = useState(false);
  const playerPosRef = useRef({ x: PLAYER_START_X, y: PLAYER_START_Y });
  const keysRef = useRef<Set<string>>(new Set());
  const targetRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef(0);
  const rustleRef = useRef<Map<string, number>>(new Map());
  const groundCanvasRef    = useRef<HTMLCanvasElement>(null);
  const snowPilesCanvasRef = useRef<HTMLCanvasElement>(null);
  const houseCanvasRef = useRef<HTMLCanvasElement>(null);
  const pathCanvasRef  = useRef<HTMLCanvasElement>(null);
  const topFenceRef    = useRef<HTMLCanvasElement>(null);
  const leftFenceRef   = useRef<HTMLCanvasElement>(null);
  const rightFenceRef  = useRef<HTMLCanvasElement>(null);
  const bottomFenceRef = useRef<HTMLCanvasElement>(null);
  const rightTreeRef   = useRef<HTMLCanvasElement>(null);
  const pineTreeRef    = useRef<HTMLCanvasElement>(null);
  const mailboxRef     = useRef<HTMLCanvasElement>(null);

  // Season sheet — must be declared before canvas effects that depend on it
  const currentSeason    = useGardenStore(s => s.currentSeason);
  const effectiveSeason  = simSeason ?? currentSeason;
  const seasonSheet      = effectiveSeason === 'winter' ? winterSheetPng
                         : effectiveSeason === 'fall'   ? autumnSheetPng
                         : springSheetPng; // spring + summer
  const isWinter         = effectiveSeason === 'winter';
  const isFall           = effectiveSeason === 'fall';
  const seasonPineTree = isWinter ? pine_tree        : isFall ? autumn_pine_tree : spring_pine_tree;
  const seasonHouse    = isWinter ? house_small      : isFall ? autumn_house     : spring_house;
  const seasonMailbox  = isWinter ? mailbox          : isFall ? autumn_mailbox   : spring_mailbox;
  const seasonFencePieces      = isWinter ? fencePieces      : isFall ? autumn_fencePieces      : spring_fencePieces;
  const seasonFenceDoorOpening = isWinter ? fenceDoorOpening : isFall ? autumn_fenceDoorOpening : spring_fenceDoorOpening;
  const seasonPath     = isWinter ? snowyPath        : isFall ? autumn_path      : spring_path;

  // Draw ground tiles (snow/grass/autumn perimeter + dirt garden interior)
  useEffect(() => {
    const canvas = groundCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      for (let row = 0; row < GROUND_ROWS; row++) {
        for (let col = 0; col < GROUND_COLS; col++) {
          const { sx, sy } = getGroundTile(col, row);
          ctx.drawImage(img, sx, sy, GROUND_TILE, GROUND_TILE,
            col * GROUND_TILE_DST, row * GROUND_TILE_DST, GROUND_TILE_DST, GROUND_TILE_DST);
        }
      }
    };
    img.src = seasonSheet;
  }, [seasonSheet]);

  // Draw house_small tiles from seasonal spritesheet onto the house canvas
  useEffect(() => {
    const canvas = houseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    const tiles = seasonHouse;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      tiles.forEach(t => {
        const dx = (t.col - HOUSE_MIN_COL) * HOUSE_TILE;
        const dy = (t.row - HOUSE_MIN_ROW) * HOUSE_TILE;
        ctx.drawImage(img, t.sx, t.sy, HOUSE_TILE, HOUSE_TILE, dx, dy, HOUSE_TILE, HOUSE_TILE);
      });
    };
    img.src = seasonSheet;
  }, [effectiveSeason, seasonSheet]);

  // Draw right tree (5×5 tiles at 1× scale, to the right of the house)
  useEffect(() => {
    const canvas = rightTreeRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      const S = 16, D = HOUSE_TILE;
      const minCol = Math.min(...right_tree.map(t => t.col));
      const minRow = Math.min(...right_tree.map(t => t.row));
      right_tree.forEach(t => {
        ctx.drawImage(img, t.sx, t.sy, S, S,
          (t.col - minCol) * D, (t.row - minRow) * D, D, D);
      });
    };
    img.src = seasonSheet;
  }, [seasonSheet]);

  // Draw mailbox (1×2 tiles at 1× draw / 2× CSS display)
  useEffect(() => {
    const canvas = mailboxRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    const tiles = seasonMailbox;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      const S = 16, D = HOUSE_TILE;
      const minRow = Math.min(...tiles.map(t => t.row));
      tiles.forEach(t => {
        ctx.drawImage(img, t.sx, t.sy, S, S, 0, (t.row - minRow) * D, D, D);
      });
    };
    img.src = seasonSheet;
  }, [effectiveSeason, seasonSheet]);

  // Draw pine tree (3×4 tiles at 1× draw / 2× CSS display)
  useEffect(() => {
    const canvas = pineTreeRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    const tiles = seasonPineTree;
    const sheet = seasonSheet;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      const S = 16, D = HOUSE_TILE;
      const minCol = Math.min(...tiles.map(t => t.col));
      const minRow = Math.min(...tiles.map(t => t.row));
      tiles.forEach(t => {
        ctx.drawImage(img, t.sx, t.sy, S, S,
          (t.col - minCol) * D, (t.row - minRow) * D, D, D);
      });
    };
    img.src = sheet;
  }, [effectiveSeason, seasonSheet]);

  // Draw snow piles (winter only)
  useEffect(() => {
    const canvas = snowPilesCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (effectiveSeason !== 'winter') return;
    const img = new Image();
    img.onload = () => {
      ctx.imageSmoothingEnabled = false;
      for (let x = 0; x < FULL_W; x += snowPiles.length * GROUND_TILE_DST) {
        snowPiles.forEach((t, i) => {
          ctx.drawImage(img, t.sx, t.sy, GROUND_TILE, GROUND_TILE,
            x + i * GROUND_TILE_DST, 0, GROUND_TILE_DST, GROUND_TILE_DST);
        });
      }
    };
    img.src = winterSheetPng;
  }, [effectiveSeason]);

  // Draw path tiles (3 cols wide × GRID_ROWS tall, 2× scale)
  useEffect(() => {
    const canvas = pathCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    const sp = seasonPath;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      const S = 16, D = CELL;
      const cols = [sp.topLeft,    sp.topCenter,    sp.topRight,
                    sp.midLeft,    sp.midCenter,    sp.midRight,
                    sp.bottomLeft, sp.bottomCenter, sp.bottomRight];
      for (let row = 0; row <= GRID_ROWS; row++) {
        const tiles = row === 0 ? cols.slice(0, 3)
                    : row === GRID_ROWS ? cols.slice(6, 9)
                    : cols.slice(3, 6);
        tiles.forEach((t, ci) => {
          ctx.drawImage(img, t.sx, t.sy, S, S, ci * D, row * D, D, D);
        });
      }
    };
    img.src = seasonSheet;
  }, [effectiveSeason, seasonSheet]);

  // Draw fence tiles from seasonal spritesheet onto the four fence canvases
  useEffect(() => {
    const canvases = [topFenceRef.current, leftFenceRef.current, rightFenceRef.current, bottomFenceRef.current];
    if (canvases.some(c => !c)) return;
    const img = new Image();
    const fp   = seasonFencePieces;
    const door = seasonFenceDoorOpening;
    img.onload = () => {
      const S = FENCE_TILE_SRC, D = FENCE_TILE_DST;

      const blit = (ctx: CanvasRenderingContext2D, tile: { sx: number; sy: number }, dx: number, dy: number) => {
        ctx.drawImage(img, tile.sx, tile.sy, S, S, dx, dy, D, D);
      };

      // Top fence
      const topCtx = topFenceRef.current!.getContext('2d')!;
      topCtx.imageSmoothingEnabled = false;
      topCtx.clearRect(0, 0, topFenceRef.current!.width, topFenceRef.current!.height);
      blit(topCtx, fp.topLeft, 0, 0);
      for (let i = 0; i < GRID_COLS; i++) blit(topCtx, fp.topCenter, (1 + i) * D, 0);
      blit(topCtx, fp.topRight, (1 + GRID_COLS) * D, 0);

      // Left fence
      const leftCtx = leftFenceRef.current!.getContext('2d')!;
      leftCtx.imageSmoothingEnabled = false;
      leftCtx.clearRect(0, 0, leftFenceRef.current!.width, leftFenceRef.current!.height);
      for (let i = 0; i < GRID_ROWS; i++) blit(leftCtx, fp.midLeft, 0, i * D);

      // Right fence
      const rightCtx = rightFenceRef.current!.getContext('2d')!;
      rightCtx.imageSmoothingEnabled = false;
      rightCtx.clearRect(0, 0, rightFenceRef.current!.width, rightFenceRef.current!.height);
      for (let i = 0; i < GRID_ROWS; i++) blit(rightCtx, fp.midRight, 0, i * D);

      // Bottom fence — bottomLeft + bottomCenter×7 + door + bottomCenter×5 + bottomRight
      const btmCtx = bottomFenceRef.current!.getContext('2d')!;
      btmCtx.imageSmoothingEnabled = false;
      btmCtx.clearRect(0, 0, bottomFenceRef.current!.width, bottomFenceRef.current!.height);
      const leftDoor = [...door].sort((a, b) => a.col - b.col)[0];
      let bx = 0;
      blit(btmCtx, fp.bottomLeft, bx, 0);   bx += D;
      for (let i = 0; i < 7; i++) { blit(btmCtx, fp.bottomCenter, bx, 0); bx += D; }
      btmCtx.drawImage(img, leftDoor.sx, leftDoor.sy, S, S, bx, 0, D, D); bx += D;
      for (let i = 0; i < 5; i++) { blit(btmCtx, fp.bottomCenter, bx, 0); bx += D; }
      blit(btmCtx, fp.bottomRight, bx, 0);
    };
    img.src = seasonSheet;
  }, [effectiveSeason, seasonSheet]);

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
      // Freeze the player during the tutorial; allow movement once complete
      const { tutorialComplete, phase: tutorialPhase } = useTutorialStore.getState();
      if (!tutorialComplete && tutorialPhase !== 'complete') {
        targetRef.current = null;
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const keys = keysRef.current;
      if (keys.size > 0) {
        // Keyboard clears any tap-to-walk target
        targetRef.current = null;
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
        const ny = Math.max(-PLAYER_CHAR_FEET_Y + HOUSE_TILE, Math.min(GRID_H + CELL - PLAYER_CHAR_FEET_Y, y + dy));
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
      } else if (targetRef.current) {
        // Tap-to-walk: move toward the tapped destination
        let { x, y } = playerPosRef.current;
        const tx = targetRef.current.x;
        const ty = targetRef.current.y;
        const dx = tx - x;
        const dy = ty - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= PLAYER_SPEED * 1.5) {
          // Arrived — snap to target and stop
          x = tx; y = ty;
          targetRef.current = null;
        } else {
          const ndx = (dx / dist) * PLAYER_SPEED;
          const ndy = (dy / dist) * PLAYER_SPEED;
          // Update facing direction
          if (Math.abs(ndx) >= Math.abs(ndy)) {
            setPlayerFrame(0); setPlayerFlipped(ndx < 0);
          } else {
            setPlayerFrame(ndy > 0 ? 1 : 2); setPlayerFlipped(false);
          }
          const nx = Math.max(-PLAYER_CHAR_CX, Math.min(GRID_W - PLAYER_CHAR_CX, x + ndx));
          const ny = Math.max(-PLAYER_CHAR_FEET_Y + HOUSE_TILE, Math.min(GRID_H + CELL - PLAYER_CHAR_FEET_Y, y + ndy));
          if (isWalkable(nx, ny)) {
            x = nx; y = ny;
          } else if (isWalkable(nx, y)) {
            x = nx;
          } else if (isWalkable(x, ny)) {
            y = ny;
          } else {
            targetRef.current = null; // blocked — give up
          }
        }
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
  const dayLength = sunsetMs - sunriseMs;
  const effectiveNowMs = simProgress !== null
    ? (() => { const m = new Date(now); m.setHours(0,0,0,0); return m.getTime() + simProgress * 24 * 60 * 60 * 1000; })()
    : now.getTime();
  const dayProgress = (effectiveNowMs - sunriseMs) / dayLength;

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
    if (dayProgress > 1)      nightProgress = (effectiveNowMs - sunsetMs)  / nightLength;
    else if (dayProgress < 0) nightProgress = 1 - (sunriseMs - effectiveNowMs) / nightLength;
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
  }, [dayProgress, effectiveNowMs, sunriseMs, sunsetMs, dayLength]);

  const skyStyle     = getSkyStyle(dayProgress);
  const isNight      = dayProgress < -0.1  || dayProgress > 1.1;
  const isDawnOrDusk = (dayProgress > -0.05 && dayProgress < 0.08) || (dayProgress > 0.92 && dayProgress < 1.05);
  const textColor    = isNight ? 'rgba(255,255,255,0.8)' : 'rgba(93,78,55,0.85)';
  const subtextColor = isNight ? 'rgba(255,255,255,0.45)' : 'rgba(93,78,55,0.45)';

  // Ambient darkness overlay — fades in at dusk, peaks at night, lifts at dawn
  const ambientOpacity = (() => {
    if (dayProgress >= 0.12 && dayProgress <= 0.88) return 0;          // full daylight
    if (dayProgress <= -0.25 || dayProgress >= 1.25) return 0.3;       // deep night
    if (dayProgress < 0.12)  return (0.12 - dayProgress) / (0.12 + 0.25) * 0.3;  // dawn lift
    return (dayProgress - 0.88) / (1.25 - 0.88) * 0.3;                // dusk fade-in
  })();

  const characterConfig = useCharacterStore(s => s.config);

  // ── Edit garden state ──────────────────────────────────────────────────────
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editToast, setEditToast] = useState<string | null>(null);

  // Auto-open the palette when the witch gives seeds so the player can see them
  const tutorialPhase = useTutorialStore((s) => s.phase);
  useEffect(() => {
    if (tutorialPhase === 'seeds_revealed') setIsEditOpen(true);
    if (tutorialPhase === 'plant_prompt')  setIsEditOpen(false);
  }, [tutorialPhase]);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [draggingGridId, setDraggingGridId] = useState<string | null>(null);

  // ── Garden data ────────────────────────────────────────────────────────────
  const getFlowerAt        = useGardenStore(s => s.getFlowerAt);
  const selectedFlowerType = useGardenStore(s => s.selectedFlowerType);
  const editMode           = useGardenStore(s => s.mode);
  const flowers            = useGardenStore(s => s.flowers);
  const placedFlowers      = useGardenStore(s => s.placedFlowers);
  const selectFlowerType   = useGardenStore(s => s.selectFlowerType);
  const placeFlower        = useGardenStore(s => s.placeFlower);
  const removeFlowerFromGrid = useGardenStore(s => s.removeFlowerFromGrid);
  const moveFlower         = useGardenStore(s => s.moveFlower);
  const setMode            = useGardenStore(s => s.setMode);
  const clearGarden        = useGardenStore(s => s.clearGarden);
  const getUnplacedByType  = useGardenStore(s => s.getUnplacedByType);

  // Available-by-type counts for palette — current season only
  const placedFlowerIds = useMemo(
    () => new Set(placedFlowers.map(p => p.flowerId)),
    [placedFlowers]
  );
  const activeSeason = getCurrentSeason();
  // Seeds = shop-bought (challengeId null); Blooms = challenge-earned (challengeId set)
  const seedsByType = useMemo(() => {
    const counts: Partial<Record<FlowerType, number>> = {};
    flowers.forEach(f => {
      if (!placedFlowerIds.has(f.id) && f.challengeId === null && FLOWER_CATALOG[f.type].season === activeSeason)
        counts[f.type] = (counts[f.type] || 0) + 1;
    });
    return counts;
  }, [flowers, placedFlowerIds, activeSeason]);
  const bloomsByType = useMemo(() => {
    const counts: Partial<Record<FlowerType, number>> = {};
    flowers.forEach(f => {
      if (!placedFlowerIds.has(f.id) && f.challengeId !== null && FLOWER_CATALOG[f.type].season === activeSeason)
        counts[f.type] = (counts[f.type] || 0) + 1;
    });
    return counts;
  }, [flowers, placedFlowerIds, activeSeason]);
  const availableByType = useMemo(() => {
    const counts: Partial<Record<FlowerType, number>> = { ...seedsByType };
    (Object.entries(bloomsByType) as [FlowerType, number][]).forEach(([type, count]) => {
      counts[type] = (counts[type] || 0) + count;
    });
    return counts;
  }, [seedsByType, bloomsByType]);
  const totalAvailable = useMemo(
    () => Object.values(availableByType).reduce((a, b) => a + b, 0),
    [availableByType]
  );
  // IDs of shop-bought flowers — shown as seeds in the grid
  const seedFlowerIds = useMemo(
    () => new Set(flowers.filter(f => f.challengeId === null).map(f => f.id)),
    [flowers]
  );

  const activeChallenges = useChallengeStore(s => s.activeChallenges);
  const growing = activeChallenges.filter(
    c => c.status === 'growing' || c.status === 'wilted' || c.id === justBloomedId
  );

  const witherModeEnabled = useSettingsStore(s => s.witherModeEnabled);
  const lastActivityDate = useSettingsStore(s => s.lastActivityDate);
  const daysMissed = witherModeEnabled && lastActivityDate
    ? Math.max(0, differenceInCalendarDays(new Date(), parseISO(lastActivityDate)))
    : 0;

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
      const src        = e.sheet ?? e.sprite;
      const frame      = Math.min(pf.growthTicks ?? 0, e.sheetBloomFrame ?? 4);

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
          opacity: isEditOpen ? 0 : 1,
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

  // ── Edit handlers ──────────────────────────────────────────────────────────
  const showEditToast = useCallback((msg: string) => {
    setEditToast(msg);
    setTimeout(() => setEditToast(null), 2000);
  }, []);

  const handleCellClick = useCallback((col: number, row: number) => {
    const key = `${col},${row}`;
    if (BLOCKED_CELLS.has(key)) return;
    const existingFlower = getFlowerAt(col, row);
    if (editMode === 'remove') {
      if (!existingFlower) { showEditToast('No flower there!'); return; }
      removeFlowerFromGrid(existingFlower.id);
      showEditToast(`${FLOWER_CATALOG[existingFlower.flowerType].label} removed`);
    } else {
      if (existingFlower) { showEditToast('Already planted there!'); return; }
      if (!selectedFlowerType) { showEditToast('Select a flower first! 🌸'); return; }
      if (getUnplacedByType(selectedFlowerType).length === 0) { showEditToast('No more of that type!'); return; }
      if (placeFlower(col, row)) showEditToast(`Planted ${FLOWER_CATALOG[selectedFlowerType].label}! 🌸`);
    }
  }, [editMode, selectedFlowerType, getFlowerAt, removeFlowerFromGrid, placeFlower, getUnplacedByType, showEditToast]);

  const handleDragOver = useCallback((e: React.DragEvent, col: number, row: number) => {
    e.preventDefault();
    const key = `${col},${row}`;
    if (!BLOCKED_CELLS.has(key)) { e.dataTransfer.dropEffect = 'copy'; setDragOverCell(key); }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, col: number, row: number) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    const key = `${col},${row}`;
    if (BLOCKED_CELLS.has(key)) { showEditToast("Can't plant there! 🏠"); setDragOverCell(null); setDraggingGridId(null); return; }
    if (data.startsWith('palette:')) {
      const flowerType = data.slice('palette:'.length) as FlowerType;
      if (getFlowerAt(col, row)) { showEditToast('Spot occupied!'); }
      else {
        useGardenStore.getState().selectFlowerType(flowerType);
        useGardenStore.getState().setMode('place');
        if (useGardenStore.getState().placeFlower(col, row))
          showEditToast(`Planted ${FLOWER_CATALOG[flowerType].label}! 🌸`);
      }
    } else {
      const existingAtDest = getFlowerAt(col, row);
      if (existingAtDest && existingAtDest.id !== data) { showEditToast('Spot occupied!'); }
      else if (moveFlower(data, col, row)) { showEditToast('Moved! ✨'); }
    }
    setDragOverCell(null);
    setDraggingGridId(null);
  }, [getFlowerAt, moveFlower, showEditToast]);

  const handleClear = useCallback(() => {
    if (placedFlowers.length === 0) { showEditToast('Garden is already empty!'); return; }
    clearGarden();
    showEditToast('Garden cleared! 🔄');
  }, [placedFlowers.length, clearGarden, showEditToast]);

  // gridCells: empty — coord overlay is now a full-scene absolute overlay below.
  const gridCells: React.ReactElement[] = [];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div ref={wrapRef} style={{ width: '100%', position: 'relative' }}>
      {/* Coin counter overlay */}
      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 20, pointerEvents: 'none' }}>
        <span className="inline-flex items-center gap-1 bg-bark/40 text-cream text-xs font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
          ◎ {coins}
        </span>
      </div>
      <div style={{ position: 'relative' }}>
      <div style={{ width: '100%', height: FULL_H * scale, overflow: 'hidden' }}>
      <div
        style={{
          width: FULL_W, height: FULL_H,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
          position: 'relative',
          overflow: 'hidden',
          cursor: 'default',
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
            {format(now, 'EEEE')}
          </p>
        </div>

        {/* ── Snow piles — tiled just above the horizon ── */}
        <canvas
          ref={snowPilesCanvasRef}
          width={FULL_W} height={GROUND_TILE_DST}
          style={{ position: 'absolute', top: HORIZON_Y - 32, left: 0, width: FULL_W, height: GROUND_TILE_DST, imageRendering: 'pixelated', zIndex: 2, pointerEvents: 'none' }}
        />

        {/* ── Winter ground (snow perimeter + dirt garden interior) ── */}
        <canvas
          ref={groundCanvasRef}
          width={FULL_W}
          height={FULL_H - HORIZON_Y}
          style={{
            position: 'absolute', top: HORIZON_Y, left: 0,
            width: FULL_W, height: FULL_H - HORIZON_Y,
            imageRendering: 'pixelated',
            zIndex: 1,
          }}
        />

        {/* ── Mailbox — 1×2 tiles at 2× CSS, overlapping bottom-left fence corner ── */}
        <canvas
          ref={mailboxRef}
          width={HOUSE_TILE} height={2 * HOUSE_TILE}
          style={{
            position: 'absolute',
            left: FENCE + 5 * CELL,
            top: COTTAGE_PAD + 4 * CELL + HOUSE_TILE * 3,
            width: CELL, height: 2 * CELL,
            imageRendering: 'pixelated',
            zIndex: 8,
            pointerEvents: 'none',
          }}
        />

        {/* ── Pine tree — 3×4 tiles at 2× CSS, center-bottom at garden cell (1,0) ── */}
        <canvas
          ref={pineTreeRef}
          width={3 * HOUSE_TILE} height={4 * HOUSE_TILE}
          style={{
            position: 'absolute',
            left: FENCE,
            top: COTTAGE_PAD - 3 * CELL - Math.round(CELL * 2 / 3),
            width: 3 * CELL, height: 4 * CELL,
            imageRendering: 'pixelated',
            zIndex: 4,
            pointerEvents: 'none',
          }}
        />

        {/* ── Right tree — 5×5 tiles at 1× scale, right of house ── */}
        <canvas
          ref={rightTreeRef}
          width={5 * HOUSE_TILE} height={5 * HOUSE_TILE}
          style={{
            position: 'absolute',
            left: FENCE + 11 * CELL + 2 * HOUSE_TILE - 3 * CELL - HOUSE_TILE,
            top: COTTAGE_PAD - 3 * CELL - 4 * HOUSE_TILE + 3 * CELL - 2 * CELL - HOUSE_TILE,
            width: 5 * CELL, height: 5 * CELL,
            imageRendering: 'pixelated',
            zIndex: 4,
            pointerEvents: 'none',
          }}
        />

        {/* ── House — 2× scale (96×96 tiles → 192×192px), left at col 5, bottom ~64px into garden ── */}
        <div style={{
          position: 'absolute', top: COTTAGE_PAD - 144, left: FENCE + 5 * CELL,
          zIndex: 4,
        }}>
          <canvas
            ref={houseCanvasRef}
            width={HOUSE_COLS * HOUSE_TILE}
            height={HOUSE_ROWS * HOUSE_TILE}
            style={{
              width: HOUSE_COLS * HOUSE_TILE * 2,
              height: HOUSE_ROWS * HOUSE_TILE * 2,
              imageRendering: 'pixelated',
              filter: 'drop-shadow(2px 3px 1px rgba(0,0,0,0.25))',
              display: 'block',
            }}
          />
        </div>

        {/* ── Fence + grid (anchored at top: COTTAGE_PAD, left: FENCE) ── */}
        <div style={{ position: 'absolute', top: COTTAGE_PAD, left: FENCE, zIndex: 3 }}>
          <div style={{ position: 'relative' }}>

            {/* Top fence */}
            <canvas ref={topFenceRef}
              width={FULL_W} height={FENCE}
              style={{ position: 'absolute', top: -FENCE, left: -FENCE, width: FULL_W, height: FENCE, imageRendering: 'pixelated', zIndex: 2, pointerEvents: 'none' }}
            />
            {/* Bottom fence rendered separately at z:7 — see below the depth layer */}
            {/* Left fence */}
            <canvas ref={leftFenceRef}
              width={FENCE} height={GRID_H}
              style={{ position: 'absolute', top: 0, left: -FENCE, width: FENCE, height: GRID_H, imageRendering: 'pixelated', zIndex: 2, pointerEvents: 'none' }}
            />
            {/* Right fence */}
            <canvas ref={rightFenceRef}
              width={FENCE} height={GRID_H}
              style={{ position: 'absolute', top: 0, left: GRID_W, width: FENCE, height: GRID_H, imageRendering: 'pixelated', zIndex: 2, pointerEvents: 'none' }}
            />

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
                // Convert click position to player-position coords (top-left of sprite canvas)
                const tx = cx - PLAYER_CHAR_CX;
                const ty = cy - PLAYER_CHAR_FEET_Y;
                // Face toward tap immediately
                const { x: px, y: py } = playerPosRef.current;
                const dx = cx - (px + PLAYER_CHAR_CX);
                const dy = cy - (py + PLAYER_CHAR_FEET_Y);
                if (Math.abs(dx) >= Math.abs(dy)) {
                  setPlayerFrame(0); setPlayerFlipped(dx < 0);
                } else {
                  setPlayerFrame(dy > 0 ? 1 : 2); setPlayerFlipped(false);
                }
                // Walk to the tapped position
                targetRef.current = { x: tx, y: ty };
              }}
            >
              {gridCells}

              {/* Snowy path — cols 6–8, 3×CELL wide */}
              <canvas ref={pathCanvasRef}
                width={3 * CELL} height={GRID_H + CELL}
                style={{ position: 'absolute', top: 0, left: 6 * CELL, width: 3 * CELL, height: GRID_H + CELL, imageRendering: 'pixelated', zIndex: 1, pointerEvents: 'none' }}
              />

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
            const animate = isBlooming ? 'bloom' : (challenge.status === 'bloomed' || challenge.status === 'wilted') ? 'none' : 'idle';
            const challengeWitherLevel = challenge.status === 'wilted' ? 3 : getChallengeWitherLevel(challenge.id, daysMissed);
            return (
              <div key={`gb-${challenge.id}`} style={{
                position: 'absolute',
                left: FENCE + col * CELL, top: COTTAGE_PAD + PLOT_ROW * CELL,
                width: CELL, height: CELL,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <GrowthSprite stage={challenge.growthStage} flowerType={template?.flowerReward}
                  sprites={template?.sprites} spriteSheet={template?.spriteSheet}
                  size="xs" animate={animate} witherLevel={challengeWitherLevel} />
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

          {/* 2b. Witch NPC — visible throughout the tutorial */}
          <WitchInScene />

          {/* 2c. Sparkle effects — on plant and on growth */}
          <SparkleOverlay />

          {/* 3. Flowers at/below character's row */}
          {frontFlowers}

          {/* 3b. Growing challenge plants at/below character's row */}
          {growing.map(challenge => {
            const col = PLOT_COLS[challenge.plotIndex];
            if (col === undefined || feetY > PLOT_ROW * CELL + DEPTH_THRESHOLD) return null;
            const template = CHALLENGE_TEMPLATES.find(t => t.id === challenge.templateId);
            const isBlooming = justBloomedId === challenge.id;
            const animate = isBlooming ? 'bloom' : (challenge.status === 'bloomed' || challenge.status === 'wilted') ? 'none' : 'idle';
            const challengeWitherLevel = challenge.status === 'wilted' ? 3 : getChallengeWitherLevel(challenge.id, daysMissed);
            return (
              <div key={`gf-${challenge.id}`} style={{
                position: 'absolute',
                left: FENCE + col * CELL, top: COTTAGE_PAD + PLOT_ROW * CELL,
                width: CELL, height: CELL,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <GrowthSprite stage={challenge.growthStage} flowerType={template?.flowerReward}
                  sprites={template?.sprites} spriteSheet={template?.spriteSheet}
                  size="xs" animate={animate} witherLevel={challengeWitherLevel} />
              </div>
            );
          })}

        </div>

        {/* Bottom fence — z:7, above the character layer so she walks behind it */}
        <canvas ref={bottomFenceRef}
          width={FULL_W} height={FENCE}
          style={{ position: 'absolute', top: COTTAGE_PAD + GRID_H, left: 0, width: FULL_W, height: FENCE, imageRendering: 'pixelated', zIndex: 7, pointerEvents: 'none' }}
        />

        {/* ── Ambient darkness overlay — night/dusk/dawn tint over all tiles ── */}
        {ambientOpacity > 0 && (
          <div style={{
            position: 'absolute', top: 0, left: 0, width: FULL_W, height: FULL_H,
            background: `rgba(5, 8, 28, ${ambientOpacity})`,
            zIndex: 9, pointerEvents: 'none',
            transition: 'opacity 0.5s ease',
          }} />
        )}

        {/* ── Day/night time scrubber (dev only) ── */}
        {DEV_OVERLAY && (() => {
          const displayMs = simProgress !== null
            ? (() => { const m = new Date(now); m.setHours(0,0,0,0); return m.getTime() + simProgress * 24 * 60 * 60 * 1000; })()
            : now.getTime();
          const displayTime = new Date(displayMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const srMs = sunriseMs - new Date(now).setHours(0,0,0,0);
          const ssMs = sunsetMs  - new Date(now).setHours(0,0,0,0);
          const srPct = (srMs / (24*60*60*1000)) * 100;
          const ssPct = (ssMs / (24*60*60*1000)) * 100;
          return (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute', bottom: 8, left: 8, right: 8, zIndex: 25,
                background: 'rgba(0,0,0,0.55)', borderRadius: 8, padding: '6px 10px',
                display: 'flex', flexDirection: 'column', gap: 4,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>
                  🌅 {format(new Date(sunriseMs), 'h:mma')} &nbsp; 🌇 {format(new Date(sunsetMs), 'h:mma')}
                </span>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'white', fontWeight: 600 }}>
                  {displayTime}
                </span>
                {simProgress !== null && (
                  <button
                    onClick={() => setSimProgress(null)}
                    style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    reset
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                {/* sunrise/sunset tick marks */}
                <div style={{ position: 'absolute', left: `${srPct}%`, top: -3, width: 1, height: 6, background: 'rgba(255,200,50,0.7)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', left: `${ssPct}%`, top: -3, width: 1, height: 6, background: 'rgba(255,130,50,0.7)', pointerEvents: 'none' }} />
                <input
                  type="range" min={0} max={1} step={0.001}
                  value={simProgress ?? (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400}
                  onChange={e => setSimProgress(parseFloat(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: '#9CAF88' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {(['spring', 'summer', 'fall', 'winter'] as Season[]).map(s => (
                  <button key={s} onClick={() => setSimSeason(simSeason === s ? null : s)}
                    style={{ fontSize: 9, fontFamily: 'monospace', cursor: 'pointer', border: 'none',
                      borderRadius: 4, padding: '2px 6px',
                      background: effectiveSeason === s ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.2)',
                      color: effectiveSeason === s ? '#333' : 'rgba(255,255,255,0.7)',
                      fontWeight: effectiveSeason === s ? 700 : 400,
                    }}
                  >{s}</button>
                ))}
                {simSeason !== null && (
                  <button onClick={() => setSimSeason(null)}
                    style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 2 }}
                  >reset</button>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Full-scene coordinate overlay (dev only) ── */}
        {SHOW_GRID_COORDS && (() => {
          const cells = [];
          // Cols -1..13: col -1 = left fence, cols 0-12 = garden, col 13 = right fence
          // Rows -4..6: rows < 0 = sky, rows 0-5 = garden, row 6 = bottom fence strip
          for (let row = -4; row <= 6; row++) {
            for (let col = -1; col <= 13; col++) {
              const inGarden = col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS;
              cells.push(
                <div key={`sg-${col}-${row}`} style={{
                  position: 'absolute',
                  left: FENCE + col * CELL,
                  top: COTTAGE_PAD + row * CELL,
                  width: CELL, height: CELL,
                  border: `1px solid ${inGarden ? 'rgba(255,255,255,0.3)' : 'rgba(160,200,255,0.2)'}`,
                  boxSizing: 'border-box',
                  pointerEvents: 'none',
                  zIndex: 20,
                }}>
                  <span style={{
                    position: 'absolute', top: 2, left: 2,
                    fontSize: 7, fontFamily: 'monospace', lineHeight: 1,
                    color: inGarden ? 'rgba(255,255,255,0.8)' : 'rgba(180,210,255,0.7)',
                  }}>
                    {col},{row}
                  </span>
                </div>
              );
            }
          }
          return cells;
        })()}

        {/* ── Tutorial: tappable plot circles ── */}
        <TutorialPlotOverlay />

        {/* ── Edit mode grid overlay ── */}
        {isEditOpen && (
          <>
            {editMode === 'remove' && (
              <div style={{ position: 'absolute', top: COTTAGE_PAD, left: FENCE, width: GRID_W, height: GRID_H, background: 'rgba(196,113,90,0.08)', zIndex: 14, pointerEvents: 'none' }} />
            )}
            <div
              style={{ position: 'absolute', top: COTTAGE_PAD, left: FENCE, width: GRID_W, height: GRID_H, display: 'grid', gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL}px)`, gridTemplateRows: `repeat(${GRID_ROWS}, ${CELL}px)`, zIndex: 15 }}
              onClick={e => e.stopPropagation()}
            >
              {Array.from({ length: GRID_ROWS * GRID_COLS }, (_, i) => {
                const col = i % GRID_COLS;
                const row = Math.floor(i / GRID_COLS);
                const key = `${col},${row}`;
                const isBlocked = BLOCKED_CELLS.has(key);
                const pf = getFlowerAt(col, row);
                const isDraggingThis = pf?.id === draggingGridId;
                const isDragTarget = dragOverCell === key && !isBlocked && !isDraggingThis;
                const canDrag = !!pf && !isBlocked && editMode !== 'remove';
                return (
                  <div
                    key={key}
                    draggable={canDrag}
                    onDragStart={canDrag ? e => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', pf!.id);
                      setDraggingGridId(pf!.id);
                    } : undefined}
                    onDragEnd={() => { setDraggingGridId(null); setDragOverCell(null); }}
                    onClick={() => !isBlocked && handleCellClick(col, row)}
                    onDragOver={e => handleDragOver(e, col, row)}
                    onDrop={e => handleDrop(e, col, row)}
                    style={{
                      cursor: isBlocked ? 'default' : pf ? (editMode === 'remove' ? 'crosshair' : 'grab') : 'cell',
                      background: isDragTarget ? 'rgba(156,175,136,0.4)' : 'transparent',
                      outline: isDragTarget ? '2px solid rgba(156,175,136,0.8)' : undefined,
                      outlineOffset: '-2px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: isDraggingThis ? 0.35 : 1,
                    }}
                  >
                    {pf && (
                      <SpriteSheet
                        src={FLOWER_CATALOG[pf.flowerType].sheet ?? FLOWER_CATALOG[pf.flowerType].sprite}
                        frame={seedFlowerIds.has(pf.flowerId) ? 1 : (FLOWER_CATALOG[pf.flowerType].sheetBloomFrame ?? 0)}
                        frameSize={16} scale={2} shadow
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {editToast && (
              <div style={{ position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: 'rgba(93,78,55,0.92)', color: '#FEF6EC', padding: '7px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', zIndex: 20, pointerEvents: 'none' }}>
                {editToast}
              </div>
            )}
          </>
        )}

      </div>
      </div>
      <TutorialOverlay />
      </div>{/* end position:relative scene wrapper */}

      {/* ── Sun times bar ── */}
      <div style={{ padding: '5px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(93,78,55,0.45)', background: 'rgba(254,246,236,0.6)' }}>
        <span>sunrise {format(sunrise, 'h:mm a')} &nbsp;·&nbsp; sunset {format(sunset, 'h:mm a')}</span>
      </div>

      {/* ── Edit garden button (overlaid, hidden when tray open) ── */}
      {!isEditOpen && (
        <button
          onClick={e => { e.stopPropagation(); setIsEditOpen(true); setMode('place'); }}
          style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 10, background: 'rgba(254,246,236,0.88)', backdropFilter: 'blur(4px)', border: 'none', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: 'rgba(93,78,55,0.65)', cursor: 'pointer', letterSpacing: '0.01em' }}
        >
          edit garden
        </button>
      )}

      {/* ── Edit tray (below scene, animates open/close) ── */}
      <div style={{ maxHeight: isEditOpen ? 260 : 0, overflow: 'hidden', transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1)' }}>
      <div style={{ background: '#FEF6EC', borderTop: '1px solid rgba(93,78,55,0.1)' }}>

        {/* Header */}
        <div style={{ padding: '12px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(93,78,55,0.08)' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#5D4E37', fontFamily: 'Georgia, serif' }}>Flower Palette</div>
            <div style={{ fontSize: 11, color: 'rgba(93,78,55,0.5)', marginTop: 2 }}>{totalAvailable} flowers to place</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setMode(editMode === 'remove' ? 'place' : 'remove')} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: editMode === 'remove' ? '#C4715A' : 'rgba(93,78,55,0.08)', transition: 'background 0.2s', flexShrink: 0 }} title="Remove mode">🗑️</button>
            <button onClick={handleClear} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(93,78,55,0.08)', flexShrink: 0 }} title="Clear all">🔄</button>
            <button onClick={() => { setIsEditOpen(false); setMode('place'); }} style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#FEF6EC', background: '#9CAF88', flexShrink: 0 }}>Done</button>
          </div>
        </div>

        {/* Mode label */}
        <div style={{ padding: '6px 16px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: editMode === 'remove' ? '#C4715A' : '#9CAF88' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: editMode === 'remove' ? '#C4715A' : '#9CAF88' }}>
            {editMode === 'remove' ? 'Tap a flower to remove it' : 'Tap a spot · Drag from palette'}
          </span>
        </div>

        {/* Flower grid — also a drop zone to return placed flowers to palette */}
        <div
          style={{ padding: '4px 16px 12px', overflowY: 'auto', maxHeight: 120 }}
          onDragOver={e => { if (draggingGridId) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; } }}
          onDrop={e => { e.preventDefault(); if (draggingGridId) { removeFlowerFromGrid(draggingGridId); showEditToast('Returned to palette!'); setDraggingGridId(null); setDragOverCell(null); } }}
        >
          {totalAvailable === 0 ? (
            <p style={{ textAlign: 'center', color: 'rgba(93,78,55,0.45)', fontSize: 13, padding: '12px 0' }}>No {activeSeason} flowers yet — visit the Shop!</p>
          ) : (
            <>
              {Object.values(seedsByType).some(c => c > 0) && (
                <>
                  <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(93,78,55,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>🌱 Seeds</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 12 }}>
                    {(Object.keys(FLOWER_CATALOG) as FlowerType[]).map(type => {
                      const count = seedsByType[type] || 0;
                      if (count === 0) return null;
                      const isSelected = selectedFlowerType === type && editMode !== 'remove';
                      return (
                        <button
                          key={`seed-${type}`}
                          draggable
                          onDragStart={e => { e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', `palette:${type}`); selectFlowerType(type); setMode('place'); }}
                          onClick={() => { selectFlowerType(type); setMode('place'); }}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: '6px 4px', border: `2px solid ${isSelected ? '#9CAF88' : 'transparent'}`, background: isSelected ? 'rgba(156,175,136,0.2)' : 'rgba(93,78,55,0.06)', cursor: 'pointer', transition: 'all 0.15s', transform: isSelected ? 'scale(1.05)' : undefined }}
                        >
                          <SpriteSheet src={FLOWER_CATALOG[type].sheet ?? FLOWER_CATALOG[type].sprite} frame={1} frameSize={16} scale={2} shadow />
                          <span style={{ fontSize: 9, color: 'rgba(93,78,55,0.6)', fontWeight: 600, marginTop: 2 }}>×{count}</span>
                          <span style={{ fontSize: 8, color: 'rgba(93,78,55,0.4)', marginTop: 1, textAlign: 'center', lineHeight: 1.2 }}>{FLOWER_CATALOG[type].label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              {Object.values(bloomsByType).some(c => c > 0) && (
                <>
                  <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(93,78,55,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>🌸 Bloomed</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                    {(Object.keys(FLOWER_CATALOG) as FlowerType[]).map(type => {
                      const count = bloomsByType[type] || 0;
                      if (count === 0) return null;
                      const isSelected = selectedFlowerType === type && editMode !== 'remove';
                      return (
                        <button
                          key={`bloom-${type}`}
                          draggable
                          onDragStart={e => { e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', `palette:${type}`); selectFlowerType(type); setMode('place'); }}
                          onClick={() => { selectFlowerType(type); setMode('place'); }}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 12, padding: '6px 4px', border: `2px solid ${isSelected ? '#9CAF88' : 'transparent'}`, background: isSelected ? 'rgba(156,175,136,0.2)' : 'rgba(93,78,55,0.06)', cursor: 'pointer', transition: 'all 0.15s', transform: isSelected ? 'scale(1.05)' : undefined }}
                        >
                          <SpriteSheet src={FLOWER_CATALOG[type].sheet ?? FLOWER_CATALOG[type].sprite} frame={FLOWER_CATALOG[type].sheetBloomFrame ?? 0} frameSize={16} scale={2} shadow />
                          <span style={{ fontSize: 9, color: 'rgba(93,78,55,0.6)', fontWeight: 600, marginTop: 2 }}>×{count}</span>
                          <span style={{ fontSize: 8, color: 'rgba(93,78,55,0.4)', marginTop: 1, textAlign: 'center', lineHeight: 1.2 }}>{FLOWER_CATALOG[type].label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>

      </div>
      </div>

    </div>
  );
}
