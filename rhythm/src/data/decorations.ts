import gnomeSprite from '../assets/misc garden decor/garden_gnome.png';
import fountainSheet from '../assets/misc garden decor/fountain sprite sheet.png';

export interface DecorItem {
  id: string;
  label: string;
  price: number;
  src: string;
  frameSize: number;   // source frame px (square)
  shopScale: number;   // scale factor in shop display
  frames: number;      // animation frame count
  gridCols: number;    // garden grid width in cells
  gridRows: number;    // garden grid height in cells
  gardenScale: number; // scale factor when rendered in garden
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
];
