/**
 * Sprite data for farm_winter.png
 * Each tile is 16×16px. Usage:
 *   tiles.forEach(t => ctx.drawImage(sheet, t.sx, t.sy, 16, 16, destX, destY, 16, 16));
 */

// ── Ground tiles ──────────────────────────────────────────────────────────────

export const winterGroundDark = {
  solidSnow:    { sx: 448, sy: 208 },  // col 28, row 13
  topLeft:      { sx: 432, sy: 336 },  // col 27, row 21
  topCenter:    { sx: 448, sy: 336 },  // col 28, row 21
  topRight:     { sx: 464, sy: 336 },  // col 29, row 21
  midLeft:      { sx: 432, sy: 352 },  // col 27, row 22
  dirt:         { sx: 448, sy: 352 },  // col 28, row 22
  midRight:     { sx: 464, sy: 352 },  // col 29, row 22
  bottomLeft:   { sx: 432, sy: 368 },  // col 27, row 23
  bottomCenter: { sx: 448, sy: 368 },  // col 28, row 23
  bottomRight:  { sx: 464, sy: 368 },  // col 29, row 23
};

export const winterGroundLight = {
  solidSnow:    { sx: 400, sy: 208 },
  topLeft:      { sx: 384, sy: 240 },
  topCenter:    { sx: 400, sy: 240 },
  topRight:     { sx: 416, sy: 240 },
  midLeft:      { sx: 384, sy: 256 },
  dirt:         { sx: 400, sy: 256 },
  midRight:     { sx: 416, sy: 256 },
  bottomLeft:   { sx: 384, sy: 272 },
  bottomCenter: { sx: 400, sy: 272 },
  bottomRight:  { sx: 416, sy: 272 },
};

// ── House ─────────────────────────────────────────────────────────────────────

export const house_small = [
  { col: 46, row: 28, sx: 736, sy: 448 },
  { col: 45, row: 28, sx: 720, sy: 448 },
  { col: 44, row: 28, sx: 704, sy: 448 },
  { col: 44, row: 27, sx: 704, sy: 432 },
  { col: 45, row: 27, sx: 720, sy: 432 },
  { col: 46, row: 27, sx: 736, sy: 432 },
  { col: 47, row: 27, sx: 752, sy: 432 },
  { col: 48, row: 27, sx: 768, sy: 432 },
  { col: 48, row: 28, sx: 768, sy: 448 },
  { col: 49, row: 28, sx: 784, sy: 448 },
  { col: 49, row: 27, sx: 784, sy: 432 },
  { col: 49, row: 26, sx: 784, sy: 416 },
  { col: 48, row: 26, sx: 768, sy: 416 },
  { col: 47, row: 26, sx: 752, sy: 416 },
  { col: 45, row: 26, sx: 720, sy: 416 },
  { col: 44, row: 26, sx: 704, sy: 416 },
  { col: 49, row: 25, sx: 784, sy: 400 },
  { col: 48, row: 25, sx: 768, sy: 400 },
  { col: 47, row: 25, sx: 752, sy: 400 },
  { col: 46, row: 25, sx: 736, sy: 400 },
  { col: 46, row: 26, sx: 736, sy: 416 },
  { col: 45, row: 25, sx: 720, sy: 400 },
  { col: 44, row: 25, sx: 704, sy: 400 },
  { col: 44, row: 24, sx: 704, sy: 384 },
  { col: 45, row: 24, sx: 720, sy: 384 },
  { col: 46, row: 24, sx: 736, sy: 384 },
  { col: 48, row: 24, sx: 768, sy: 384 },
  { col: 47, row: 24, sx: 752, sy: 384 },
  { col: 47, row: 23, sx: 752, sy: 368 },
  { col: 46, row: 23, sx: 736, sy: 368 },
  { col: 45, row: 23, sx: 720, sy: 368 },
  { col: 44, row: 23, sx: 704, sy: 368 },
  { col: 49, row: 24, sx: 784, sy: 384 },
  { col: 49, row: 23, sx: 784, sy: 368 },
  { col: 48, row: 23, sx: 768, sy: 368 },
  { col: 47, row: 28, sx: 752, sy: 448 },
];

// ── Decorations (to be placed later) ─────────────────────────────────────────

export const snowyPath = {
  topLeft:      { sx: 304, sy: 144 },  // col 19, row 9
  topCenter:    { sx: 320, sy: 144 },  // col 20, row 9
  topRight:     { sx: 336, sy: 144 },  // col 21, row 9
  midLeft:      { sx: 304, sy: 160 },  // col 19, row 10
  midCenter:    { sx: 320, sy: 160 },  // col 20, row 10
  midRight:     { sx: 336, sy: 160 },  // col 21, row 10
  bottomLeft:   { sx: 304, sy: 176 },  // col 19, row 11
  bottomCenter: { sx: 320, sy: 176 },  // col 20, row 11
  bottomRight:  { sx: 336, sy: 176 },  // col 21, row 11
};

export const snowPiles = [
  { col: 13, row: 18, sx: 208, sy: 288 },
  { col: 14, row: 18, sx: 224, sy: 288 },
];

export const pine_tree = [
  { col: 13, row: 5, sx: 208, sy: 80 },
  { col: 14, row: 5, sx: 224, sy: 80 },
  { col: 15, row: 5, sx: 240, sy: 80 },
  { col: 15, row: 6, sx: 240, sy: 96 },
  { col: 14, row: 6, sx: 224, sy: 96 },
  { col: 13, row: 7, sx: 208, sy: 112 },
  { col: 14, row: 7, sx: 224, sy: 112 },
  { col: 15, row: 7, sx: 240, sy: 112 },
  { col: 13, row: 6, sx: 208, sy: 96 },
  { col: 13, row: 8, sx: 208, sy: 128 },
  { col: 14, row: 8, sx: 224, sy: 128 },
  { col: 15, row: 8, sx: 240, sy: 128 },
];

export const right_tree = [
  { col: 4, row: 11, sx: 64, sy: 176 },
  { col: 4, row: 10, sx: 64, sy: 160 },
  { col: 4, row: 12, sx: 64, sy: 192 },
  { col: 3, row: 13, sx: 48, sy: 208 },
  { col: 3, row: 12, sx: 48, sy: 192 },
  { col: 3, row: 11, sx: 48, sy: 176 },
  { col: 3, row: 10, sx: 48, sy: 160 },
  { col: 3, row: 9, sx: 48, sy: 144 },
  { col: 4, row: 9, sx: 64, sy: 144 },
  { col: 2, row: 9, sx: 32, sy: 144 },
  { col: 1, row: 9, sx: 16, sy: 144 },
  { col: 0, row: 9, sx: 0, sy: 144 },
  { col: 0, row: 10, sx: 0, sy: 160 },
  { col: 1, row: 10, sx: 16, sy: 160 },
  { col: 2, row: 10, sx: 32, sy: 160 },
  { col: 2, row: 11, sx: 32, sy: 176 },
  { col: 1, row: 11, sx: 16, sy: 176 },
  { col: 0, row: 11, sx: 0, sy: 176 },
  { col: 0, row: 12, sx: 0, sy: 192 },
  { col: 1, row: 12, sx: 16, sy: 192 },
  { col: 2, row: 12, sx: 32, sy: 192 },
  { col: 2, row: 13, sx: 32, sy: 208 },
  { col: 1, row: 13, sx: 16, sy: 208 },
  { col: 0, row: 13, sx: 0, sy: 208 },
];

export const mailbox = [
  { col: 17, row: 14, sx: 272, sy: 224 },
  { col: 17, row: 13, sx: 272, sy: 208 },
];

// Named pieces for programmatic drawing (derived from the fence array below)
export const fencePieces = {
  topLeft:      { sx: 208, sy: 176 },
  topCenter:    { sx: 224, sy: 176 },
  topRight:     { sx: 240, sy: 176 },
  midLeft:      { sx: 208, sy: 192 },
  midRight:     { sx: 240, sy: 192 },
  bottomLeft:   { sx: 208, sy: 208 },
  bottomCenter: { sx: 224, sy: 208 },
  bottomRight:  { sx: 240, sy: 208 },
};

export const fence = [
  { col: 15, row: 13, sx: 240, sy: 208 },
  { col: 15, row: 12, sx: 240, sy: 192 },
  { col: 15, row: 11, sx: 240, sy: 176 },
  { col: 14, row: 11, sx: 224, sy: 176 },
  { col: 13, row: 11, sx: 208, sy: 176 },
  { col: 13, row: 12, sx: 208, sy: 192 },
  { col: 13, row: 13, sx: 208, sy: 208 },
  { col: 14, row: 13, sx: 224, sy: 208 },
];

export const fenceDoorOpening = [
  { col: 13, row: 9, sx: 208, sy: 144 },
  { col: 14, row: 9, sx: 224, sy: 144 },
  { col: 16, row: 9, sx: 256, sy: 144 },
  { col: 15, row: 9, sx: 240, sy: 144 },
];
