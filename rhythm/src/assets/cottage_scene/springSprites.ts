/**
 * Sprite data for farm_spring_summer.png
 * Each element has its own offset relative to winterSprites.
 *
 * Anchors (top-left of each element in the spring sheet):
 *   pine_tree:        144,  64   (winter: 208,  80  → offset -64, -16)
 *   house_small:      816, 384   (winter: 704, 368  → offset +112, +16)
 *   mailbox:          128, 240   (winter: 272, 208  → offset -144, +32)
 *   fencePieces:      176, 192   (winter: 208, 176  → offset  -32, +16)
 *   fenceDoorOpening: 208, 176   (winter: 208, 144  → offset    0, +32)
 *   path (cobblestone): 272, 192 (winter: 304, 144  → offset  -32, +48)
 */
import { pine_tree, house_small, mailbox, fenceDoorOpening } from './winterSprites';

export const spring_pine_tree = pine_tree.map(t => ({ ...t, sx: t.sx - 64,  sy: t.sy - 16 }));
export const spring_house     = house_small.map(t => ({ ...t, sx: t.sx + 112, sy: t.sy + 16 }));
export const spring_mailbox   = mailbox.map(t => ({ ...t, sx: t.sx - 144, sy: t.sy + 32 }));

export const spring_fencePieces = {
  topLeft:      { sx: 176, sy: 192 },
  topCenter:    { sx: 192, sy: 192 },
  topRight:     { sx: 208, sy: 192 },
  midLeft:      { sx: 176, sy: 208 },
  midRight:     { sx: 208, sy: 208 },
  bottomLeft:   { sx: 176, sy: 224 },
  bottomCenter: { sx: 192, sy: 224 },
  bottomRight:  { sx: 208, sy: 224 },
};

export const spring_fenceDoorOpening = fenceDoorOpening.map(t => ({ ...t, sy: t.sy + 32 }));

export const spring_path = {
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
