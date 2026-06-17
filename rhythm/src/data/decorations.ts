import gnomeSprite from '../assets/misc garden decor/garden_gnome.png';
import fountainSheet from '../assets/misc garden decor/fountain sprite sheet.png';
import lanternSprite from '../assets/misc garden decor/lantern.png';
import birdFeederSprite from '../assets/misc garden decor/striped bird feeder.png';
import benchSprite from '../assets/misc garden decor/heart bench.png';
import reflectingBallSprite from '../assets/misc garden decor/reflecting ball.png';
import gothyBenchSprite from '../assets/misc garden decor/gothybench.png';

export interface DecorItem {
  // —— art ——
  id: string;
  label: string;
  src: string;                    // imported asset module ref
  frameSize: number;              // sprite frame height in px
  frameWidth?: number;            // defaults to frameSize (square)
  frames?: number;                // defaults to 1 (static sprite)

  // —— shop ——
  price?: number;                 // absent = not purchasable
  purchasable?: boolean;          // explicit override; defaults to price != null
  shopScale: number;

  // —— world ——
  gridCols: number;               // visual bounding box width in cells
  gridRows: number;               // visual bounding box height in cells
  gardenScale: number;
  // Tile offsets (relative to placement col/row) that are physically occupied.
  // Used for placement validation and character walkability — NOT sprite bounds.
  footprint: { dcol: number; drow: number }[];
  anchor?: { col: number; row: number }; // y-sort anchor cell; defaults to deepest footprint row
}

export const DECOR_CATALOG: readonly DecorItem[] = [
  {
    id: 'gnome',
    label: 'Garden Gnome',
    price: 20,
    src: gnomeSprite,
    frameSize: 16,
    shopScale: 2,
    frames: 1,
    gridCols: 1,
    gridRows: 1,
    gardenScale: 2,
    footprint: [{ dcol: 0, drow: 0 }],
  },
  {
    id: 'fountain',
    label: 'Fountain',
    price: 60,
    src: fountainSheet,
    frameSize: 32,
    shopScale: 2,
    frames: 4,
    gridCols: 2,
    gridRows: 2,
    gardenScale: 2,
    // Only the front row is physically occupied; back row is plantable (same as gothy-bench).
    footprint: [
      { dcol: 0, drow: 1 }, { dcol: 1, drow: 1 },
    ],
  },
  {
    id: 'lantern',
    label: 'Lantern',
    price: 10,
    src: lanternSprite,
    frameSize: 16,
    shopScale: 2,
    frames: 1,
    gridCols: 1,
    gridRows: 1,
    gardenScale: 2,
    footprint: [{ dcol: 0, drow: 0 }],
  },
  {
    id: 'bird-feeder',
    label: 'Bird Feeder',
    price: 25,
    src: birdFeederSprite,
    frameSize: 16,
    shopScale: 4,
    frames: 1,
    gridCols: 1,
    gridRows: 2,
    gardenScale: 4,
    // Sprite extends one tile above the footprint; only the bottom tile is occupied.
    footprint: [{ dcol: 0, drow: 1 }],
  },
  {
    id: 'bench',
    label: 'Bench',
    price: 40,
    src: benchSprite,
    frameSize: 16,
    frameWidth: 32,
    shopScale: 2,
    frames: 1,
    gridCols: 2,
    gridRows: 1,
    gardenScale: 2,
    footprint: [{ dcol: 0, drow: 0 }, { dcol: 1, drow: 0 }],
  },
  {
    id: 'reflecting-ball',
    label: 'Reflecting Ball',
    price: 20,
    src: reflectingBallSprite,
    frameSize: 16,
    shopScale: 2,
    frames: 1,
    gridCols: 1,
    gridRows: 1,
    gardenScale: 2,
    footprint: [{ dcol: 0, drow: 0 }],
  },
  {
    id: 'gothy-bench',
    label: 'Gothy Bench',
    price: 70,
    src: gothyBenchSprite,
    frameSize: 25,
    frameWidth: 31,
    shopScale: 2,
    frames: 1,
    gridCols: 2,
    gridRows: 2,
    gardenScale: 2,
    footprint: [{ dcol: 0, drow: 1 }, { dcol: 1, drow: 1 }],
  },
];
