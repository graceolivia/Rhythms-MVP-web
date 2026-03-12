# Character Builder Feature — Claude Code Prompt

## Context

I'm building a Stardew Valley-inspired pixel art todo app for moms called Rhythms. It's a React + Canvas app where a character walks around a garden. The game is already working — tile map renders, character walks around, flowers bloom from task completion, UI overlay works.

## Current Character System

The character currently renders from a single pre-made sprite sheet. I need to move to a **paper doll layered system** where the character is composited from separate transparent sprite sheet layers drawn on top of each other.

### Layer order (bottom to top):
1. **Body** — head shape, skin, face, legs (no arms, no hair, no clothes)
2. **Clothes** — outfit only, transparent everywhere else
3. **Hair** — hairstyle only, transparent everywhere else  
4. **Arms** — arms/hands only, drawn last so they overlap hair and clothes

### Sprite sheet structure:
- Each layer is a separate PNG sprite sheet
- All sheets share the **same grid layout** — same rows, columns, frame sizes
- To render a frame: draw all 4 layers at the same position using the same frame coordinates
- Rows 1-3: Idle Still, Rows 4-6: Idle Bounce, Rows 7-9: Idle Blink, Rows 10-12: Sleep

### Asset location:
[FILL IN: path to your sprite sheet assets, e.g. `/public/assets/sprites/`]

### Current sprite rendering:
[FILL IN: point Claude Code to the file/component that currently draws the character, e.g. "Character rendering happens in `src/components/GameCanvas.tsx` around line 120"]

## What I Need Built

### 1. Layered Character Renderer

Refactor the current single-sprite-sheet character rendering to composite 4 layers. The renderer should:
- Accept a character config object like:
```js
{
  body: "body-porcelain.png",
  clothes: "clothes-overalls.png", 
  hair: "hair-pigtails-golden.png",
  arms: "arms-porcelain.png"
}
```
- Draw all 4 layers at the same position, same frame, in the correct order
- Work with the existing animation/game loop — same frame timing, same movement logic
- The arms sheet needs to match the skin tone of the body sheet (they're paired)

### 2. Character Creator Screen

A new screen that appears before the garden. It should:
- Show a **live preview** of the composited character (ideally animated with the idle bounce)
- Let the user pick:
  - **Skin tone** (swaps both body + arms sheets together)
  - **Hair style** (swaps hair sheet)
  - **Hair color** (variant within a hairstyle — these are palette-swapped versions of the same hairstyle sheet)
  - **Outfit** (swaps clothes sheet)
- Have a "Start" or "Let's go!" button that saves the selection and loads the garden
- Store the selection in state/localStorage so it persists between sessions
- Visual style: keep it simple, pixel-art-friendly. A preview of the character in the center, selection options as clickable thumbnails or swatches below. Use the app's existing color palette (warm creams, muted tones).

### 3. Available Assets

I'm currently working on creating the recolored variants. For now, scaffold the system so it works with whatever sheets exist in the assets folder. Use this naming convention:

- `body-{skintone}.png` (e.g. body-porcelain, body-peach, body-sand, body-amber, body-umber, body-espresso)
- `arms-{skintone}.png` (arms match skin tone names)
- `hair-{style}-{color}.png` (e.g. hair-pigtails-golden, hair-pigtails-platinum, hair-bob-chestnut)
- `clothes-{name}.png` (e.g. clothes-overalls, clothes-sundress)

The system should automatically detect available options by scanning what files exist, or use a simple config/manifest file that I can update as I add assets.

### 4. Routing

- If no character has been created yet → show character creator
- If character exists in storage → go straight to garden
- Add a way to re-open the character creator from the game (a small button or menu option)

## Tech Notes
- This is a React app
- Character rendering happens on Canvas
- Please don't add heavy dependencies — keep it lean
- Sprite sheets use transparent backgrounds (PNG)
- All sprite sheets for a given character use identical grid dimensions

## What NOT to Change
- Don't modify the tile map, garden, flower, or task systems
- Don't change the game loop timing
- Don't restructure the project — add to what's there
