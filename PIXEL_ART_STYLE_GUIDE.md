# Rhythms — Pixel Art Style Guide

A reference for creating new pixel art that fits consistently with existing assets.

---

## The Core Rule

> **1 art pixel = 2 CSS pixels** at standard display size.

Everything in the app is rendered at integer multiples of this base unit. Never scale to a non-integer or fractional multiplier — it breaks the crispness.

---

## Canvas Sizes

| Asset type | Canvas (px) | Displayed at | Scale |
|---|---|---|---|
| Flower sprite | **16 × 16** | 32 × 32 CSS px | 2× |
| Flower sprite (large/growing plot) | **16 × 16** | 64 × 64 CSS px | 4× |
| Sun / Moon | **32 × 32** | 32–40 CSS px | 1–1.25× |
| Sky panel (tileable) | **180 × 80** | full width, tiled | flexible |
| Medium sprite (character, item) | **32 × 32** | 64 × 64 CSS px | 2× |
| Large scene / card art | **64 × 64** | 128 × 128 CSS px | 2× |

**Always draw at native resolution and let CSS scale up.** Never enlarge your source in Aseprite/Photoshop before exporting — let `imageRendering: pixelated` do it.

---

## Garden Grid Reference

- Cell size: **40 × 40 CSS px**
- Flower sprite sits inside cell at **32 × 32 CSS px** (centered, 4px breathing room)
- Grid: 7 columns × 8 rows = 280 × 320 CSS px total
- Cottage occupies the top-center 3 × 3 cells (120 × 120 CSS px)
- Available cells for planting: 46 of 56

When drawing something that sits *in a cell*, design it on a **16 × 16 canvas** — it will display at 32px with 4px of air around it.

---

## Rendering Rules (always apply these in code)

```css
image-rendering: pixelated;   /* CSS */
imageRendering: 'pixelated'   /* React inline style */
```

Add a subtle drop shadow on sprites that sit on the garden grid:
```css
filter: drop-shadow(2px 3px 1px rgba(0,0,0,0.25));
```

No shadows on background/sky tiles.

---

## Color Palette

Match pixel art colors to the app's design system. These are the core colors to pull from when choosing your pixel palette:

| App token | Role | Suggested hex |
|---|---|---|
| `cream` | Background, lightest tone | `#FEF6EC` |
| `parchment` | Cards, mid-light | `#F5E6D3` |
| `linen` | Subtle warmth | `#EDE0CC` |
| `bark` | Dark brown, outlines | `#5D4E37` |
| `sage` | Green, routines | `#7A9E7E` |
| `terracotta` | Orange-red, fixed schedule | `#C67B5C` |
| `lavender` | Purple, to-dos | `#9B8EC4` |
| `skyblue` | Blue, sky/water | `#A5C4D4` |
| `dustyrose` | Pink, challenges | `#D4A5A5` |
| `clay` | Warm mid-brown | `#A0785A` |

**Pixel art palette tips:**
- Use `bark` for outlines — never pure black (`#000000`)
- Use `cream` or `parchment` for highlights — never pure white
- Pick 4–6 colors max per sprite; less is more at 16×16
- For flowers: a dark outline shade, a shadow shade, a base shade, a highlight shade, and optionally a stem/leaf green
- Dithering is welcome for subtle gradients (especially sky)

---

## Asset Types & Conventions

### Flowers (16 × 16)
- All existing flowers live in `src/assets/flowers/001.png` → `100.png`
- Name new ones sequentially: next available number
- Must have transparent background (PNG with alpha)
- Anatomy: stem at bottom-center, petals filling upper half, center dot or highlight
- Leaf or two is fine; keep it readable at 32px display size
- After creating, add to `FLOWER_CATALOG` in `useGardenStore.ts` with a `FlowerType` key, emoji, label, and sprite import

### Sky Panels (180 × 80)
- Tileable horizontally — left and right edges must match seamlessly
- Existing: `daysky001.png` (day), `nightsky.png` (night)
- Future additions: dawn, dusk, stormy, seasonal
- Dithering encouraged for cloud textures and horizon gradients
- Keep horizon line at roughly **y = 50** (bottom third is "ground" bleed)

### Sun & Moon (32 × 32)
- Transparent background
- Sun: warm yellows/oranges, simple round shape with optional rays
- Moon: cool whites/blues, crescent or full, some crater texture
- Both animate with opacity/position in Today.tsx — keep them simple enough to read at small sizes

### Cottage (CSS, not a sprite)
- The cottage in the garden is currently built from CSS `div`s, not a sprite
- If you want to replace it with pixel art: design on a **48 × 64** canvas (3 cells wide, ~1.5 cells tall at 2×)
- Export at 48 × 64, display at 96 × 128 CSS px, positioned `absolute` over the garden grid

### Seasonal / Special Items
- Use **16 × 16** for garden-placeable items (snowflakes, pumpkins, hearts, stars)
- Use **32 × 32** for larger decorative elements (a tree, a birdbath, a bench)
- Keep the same outline-and-shadow approach as flowers

### Characters / Avatars (future)
- Use **16 × 16** or **32 × 32** depending on detail needed
- Display at 2× or 4× — decide at design time and document it

---

## Growth Stages

Sprites used in challenges and the GrowingPlot follow a 4-stage arc:

| Stage | Name | Suggestion |
|---|---|---|
| 0 | Seed | A small round seed shape, mostly bark-toned |
| 1 | Sprout | Tiny stem with one or two leaves, very small |
| 2 | Budding | Taller stem, visible bud at top, not yet open |
| 3 | Bloom | Full flower, brightest colors, most detail |

Each stage is a separate 16 × 16 sprite. They're passed as an array `[seed, sprout, budding, bloom]` to the `GrowthSprite` component.

---

## Recommended Tools

- **[Aseprite](https://www.aseprite.org/)** — the gold standard for pixel art, handles animation and palettes
- **[Libresprite](https://libresprite.github.io/)** — free Aseprite fork
- **[Piskel](https://www.piskelapp.com/)** — free, browser-based, good for quick flowers
- Export as **PNG** always. No JPEG (lossy artifacts destroy pixel edges).

---

## Checklist Before Adding a New Sprite

- [ ] Canvas is the right size for its type (see table above)
- [ ] Transparent background (PNG with alpha)
- [ ] Outline uses `bark` (#5D4E37), not black
- [ ] Colors match the app palette
- [ ] Readable at the smallest display size it will be shown at
- [ ] `imageRendering: pixelated` applied in the component
- [ ] Added to the relevant catalog/import in code (e.g. `FLOWER_CATALOG`)
- [ ] Filename follows the sequential convention (flowers) or is descriptive (sky, special items)
