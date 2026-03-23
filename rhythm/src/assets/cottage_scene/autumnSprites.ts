/**
 * Sprite data for farm_autumn.png
 * Anchors (top-left of each element in the autumn sheet):
 *   house_small: 960, 208  (winter: 704, 368 → offset +256, -160)
 *   all others:  same offsets as springSprites.ts
 */
import { pine_tree, house_small, mailbox, fenceDoorOpening } from './winterSprites';

export const autumn_pine_tree = pine_tree.map(t => ({ ...t, sx: t.sx - 64, sy: t.sy - 16 }));
export const autumn_house     = house_small.map(t => ({ ...t, sx: t.sx + 256, sy: t.sy - 160 }));
export const autumn_mailbox   = mailbox.map(t => ({ ...t, sx: t.sx - 144, sy: t.sy + 32 }));

export const autumn_fencePieces = {
  topLeft:      { sx: 176, sy: 192 },
  topCenter:    { sx: 192, sy: 192 },
  topRight:     { sx: 208, sy: 192 },
  midLeft:      { sx: 176, sy: 208 },
  midRight:     { sx: 208, sy: 208 },
  bottomLeft:   { sx: 176, sy: 224 },
  bottomCenter: { sx: 192, sy: 224 },
  bottomRight:  { sx: 208, sy: 224 },
};

export const autumn_fenceDoorOpening = fenceDoorOpening.map(t => ({ ...t, sy: t.sy + 32 }));

export const autumn_path = {
  topLeft:      { sx: 272, sy: 192 },
  topCenter:    { sx: 288, sy: 192 },
  topRight:     { sx: 304, sy: 192 },
  midLeft:      { sx: 272, sy: 208 },
  midCenter:    { sx: 288, sy: 208 },
  midRight:     { sx: 304, sy: 208 },
  bottomLeft:   { sx: 272, sy: 224 },
  bottomCenter: { sx: 288, sy: 224 },
  bottomRight:  { sx: 304, sy: 224 },
};
