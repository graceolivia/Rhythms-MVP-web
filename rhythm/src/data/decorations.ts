import gnomeSprite from '../assets/misc garden decor/garden_gnome.png';
import fountainSheet from '../assets/misc garden decor/fountain sprite sheet.png';
import lanternSprite from '../assets/misc garden decor/lantern.png';
import birdFeederSprite from '../assets/misc garden decor/striped bird feeder.png';
import benchSprite from '../assets/misc garden decor/heart bench.png';

export interface DecorItem {
  id: string;
  label: string;
  price: number;
  src: string;
  frameSize: number;    // source frame height in px
  frameWidth?: number;  // source frame width in px when not square (landscape sprites)
  shopScale: number;    // scale factor in shop display
  frames: number;       // animation frame count
  gridCols: number;     // garden grid width in cells
  gridRows: number;     // garden grid height in cells
  gardenScale: number;  // scale factor when rendered in garden
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
  },
];
