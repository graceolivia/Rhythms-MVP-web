# Sprite Sheet A — Spec

- Frame size: 80×64px
- Frames per variant: 2 (each variant block = 160px wide: 2 × 80px)
- 12 rows × 64px = 768px tall

## Rows (0-indexed)
- 0-2: Idle Still (front, side, back)
- 3-5: Idle Bounce (front, side, back) — 2 animation frames used
- 6-8: Idle Blink (front, side, back) — 2 animation frames used
- 9-11: Sleep — 2 animation frames used

## Body / Arms (480×768) — 3 skin tone variants
- Variant 0: Peach
- Variant 1: Tan
- Variant 2: Deep

## Clothes (1280×768) — 8 outfit color variants
- 0: Red, 1: Orange, 2: Yellow, 3: Green, 4: Teal, 5: Blue, 6: Lavender, 7: Pink

## Hair files (1280×768 each) — 8 color variants per file
- hair-braids.png, hair-buns.png, hair-ponytails.png
- 0: Auburn, 1: Red, 2: Pink, 3: Lilac, 4: Brown, 5: Black, 6: Blonde, 7: Silver

## Frame position formula
sx = (variantIndex * 2 + animFrame) * 80
sy = rowIndex * 64
