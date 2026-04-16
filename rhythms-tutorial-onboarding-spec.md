# Rhythms App: Tutorial & Onboarding Spec

## Overview

Replace the existing onboarding flow (childcare schedule input, nap tracking setup) with a character-driven, in-garden tutorial that teaches the core loop in ~90 seconds. The tutorial takes place inside the actual garden scene — no separate tutorial screens.

**Core loop the player must understand by end of onboarding:**
1. You have tasks → completing tasks earns coins
2. Coins buy seeds from the shop
3. Seeds grow in your garden as you keep completing tasks
4. Your garden is a living reflection of your productivity

---

## Characters

### PC (Player Character)
- Already exists in the app
- Stands in the garden during tutorial as usual
- No new art needed

### Sage (Tutorial NPC)
- **Source:** Straw hat farmer girl from the NPC sprite sheet (top row, 3rd character)
- **Presentation:** Portrait-in-dialogue-box only — she never appears as a sprite in the garden scene
- **Portrait:** Crop a static frame from the existing sprite sheet, approx 48x48 or 64x64, displayed in the dialogue box at 2-3x scale
- **Personality:** Warm, slightly playful, encouraging. Talks like a friendly neighbor, not a tutorial robot.

---

## Dialogue Box Component

### Visual Design
- **Position:** Bottom of screen, overlaying the garden view (like a visual novel / RPG dialogue box)
- **Layout:** Portrait on the left (Sage's face), text area on the right, name label above text
- **Style:** Semi-transparent background with a pixel-art-style border that matches the garden aesthetic (use the existing brown/wood tones from the fence tileset if possible)
- **Tap/click to advance** to next dialogue line
- **Text reveal:** Typewriter effect, ~30 characters/second. Tapping during reveal instantly shows full text. Tapping again advances to next line.
- **Size:** ~25-30% of viewport height so the garden is still visible above

### Technical Notes
- This component should be reusable — it will be used for tutorial now, but could be used for future NPC interactions, achievement celebrations, hints, etc.
- Props: `portrait` (image src), `speakerName` (string), `lines` (array of dialogue entries), `onComplete` (callback)
- Each dialogue entry can optionally include an `action` callback that fires when that line is reached (for triggering state changes, animations, etc.)

---

## Tutorial State Machine

Store tutorial progress in Zustand. The tutorial should survive app refresh (persist to localStorage).

```
tutorialState: {
  phase: 'not_started' | 'intro' | 'name_input' | 'receive_seeds' | 'plant_prompt' | 'planting' | 'add_task_prompt' | 'adding_task' | 'complete',
  playerName: string | null,
  hasReceivedStarterSeeds: boolean,
  hasPlantedFirstSeed: boolean,
  hasAddedFirstTask: boolean,
  tutorialComplete: boolean,
}
```

---

## Full Dialogue Script & Sequence

### Phase 1: INTRO
**Trigger:** App first launch (no existing user data)
**Garden state:** Empty — no plants, no placed items. Just dirt plots, the house, the path, the fence. PC is standing in the garden.

```
Sage: "Hey there, the new neighbor! I'm Sage, the gardening witch."
Sage: "What's your name?"
```

→ **Transition to Phase 2: NAME_INPUT**

### Phase 2: NAME_INPUT
- Dialogue box adapts: text input field appears where the dialogue text normally is
- Simple text input with a "Done" / "That's me!" button
- Input is stored in `tutorialState.playerName` and also in the main user profile state
- Minimum 1 character, max ~20 characters

```
Sage: "Welcome, {playerName}! I'm so glad you moved in. But if you don't mind me saying, your garden looks a little bare. Do you like gardening?"
```

→ **Transition to Phase 3: RECEIVE_SEEDS**

### Phase 3: RECEIVE_SEEDS
```
Sage: "Here — I brought you a few seeds to get started."
```

**Action on this line:** 
- Award 3 starter seeds to player inventory
- Play a small animation/particle effect — seeds dropping into an inventory indicator
- Briefly flash/highlight the seed count in the UI so the player notices it

```
Sage: "You can plant these anywhere in your garden. Want to try? Tap an empty spot to plant one!"
```

→ **Transition to Phase 4: PLANT_PROMPT**

### Phase 4: PLANT_PROMPT
- Dialogue box minimizes or becomes a small hint banner at top/bottom: "🌱 Tap an empty garden spot to plant a seed!"
- Garden plots become tappable/highlighted (subtle pulse or glow on available plots)
- Player taps a plot → seed is planted → appears as Stage 1 (sprout)
- `hasPlantedFirstSeed` → true

→ **Transition to Phase 5: FIRST_PLANT_RESPONSE**

### Phase 5: FIRST_PLANT_RESPONSE
```
Sage: "Look at that little sprout! It'll grow bigger every time you get things done."
Sage: "Speaking of which — what's one thing on your plate today? Laundry, dishes, a phone call... anything counts."
```

→ **Transition to Phase 6: ADD_TASK_PROMPT**

### Phase 6: ADD_TASK_PROMPT
- Task panel slides up or becomes active
- Single task input field is highlighted/focused
- Player types a task and submits it
- `hasAddedFirstTask` → true

→ **Transition to Phase 7: WRAP_UP**

### Phase 7: WRAP_UP
```
Sage: "Perfect! Check it off when you're done and your garden will thank you."
Sage: "I'll be around if you need me. Happy growing, {playerName}!"
```

**Action:** 
- `tutorialComplete` → true  
- Sage's dialogue box dismisses with a gentle fade
- Full app UI becomes available (all tabs, shop, settings, etc.)
- During tutorial, non-essential UI elements should be hidden or dimmed to reduce overwhelm

---

## Post-Tutorial: First Task Completion Moment

This isn't part of the tutorial dialogue per se, but it's critical for the emotional payoff:

**When the player completes their first-ever task:**
1. Coins animate into the coin counter (make this feel rewarding — sparkle, bounce, sound if we ever add audio)
2. The planted sprout advances to Stage 2 (small plant) with a growth animation
3. **Optional:** Sage appears one final time in a brief popup: "See? Growing already! 🌿" — then never appears uninvited again

---

## Seed Growth Mechanic (for reference — may be separate implementation story)

This is the mechanic the tutorial is teaching. Suggested model:

- Seeds have **4 growth stages:** Seed → Sprout → Young Plant → Blooming/Mature
- Each time the player completes a task, **all planted seeds advance by 1 growth tick**
- It takes N ticks to advance each stage (tunable — suggest 1, 3, 5 for stages 1→2, 2→3, 3→4)
- So completing ~9 tasks takes a seed from planted to fully bloomed
- Different seed types (purchased in shop) produce different flowers/plants at maturity
- Mature plants stay in the garden permanently as a visual record of sustained effort

---

## What to Remove from Current Onboarding

- ❌ Children name/age input
- ❌ Nap schedule configuration  
- ❌ Childcare schedule setup
- ❌ Any multi-screen onboarding wizard/stepper
- ❌ "Switch to suggested" (if this is tied to schedule-based suggestions)

## What to Keep / Integrate

- ✅ Name input (now happens via Sage's dialogue)
- ✅ The existing garden scene (tutorial happens inside it)
- ✅ The existing task panel (player adds their first task as part of tutorial)
- ✅ Seed/coin inventory system (tutorial gives starter seeds)
- ✅ Edit garden functionality (unlocked after tutorial)

---

## Component Summary

| Component | New or Existing | Notes |
|-----------|----------------|-------|
| DialogueBox | **NEW** | Reusable. Portrait + typewriter text + tap to advance. |
| TutorialOverlay | **NEW** | Manages tutorial state machine, renders DialogueBox, handles phase transitions |
| Sage portrait | **NEW (asset crop)** | Static crop from existing NPC sprite sheet |
| Garden scene | Existing | No changes needed — just needs to render in "empty" state for new users |
| Task panel | Existing | Needs to accept focus/activation from tutorial flow |
| Seed inventory | Existing | Needs method to programmatically add starter seeds |
| Plant/growth system | Existing/Modified | Needs to support tapping a plot to plant during tutorial |

---

## Implementation Notes

- **Persistence:** Tutorial state should be saved to localStorage via Zustand persist so a refresh mid-tutorial doesn't restart it
- **Skip option:** Add a small "Skip tutorial" link (maybe in settings or as a tiny text link during tutorial) for returning users or testers. This should set all tutorial flags to complete and award the 3 starter seeds.
- **Re-trigger:** For testing, add a way to reset tutorial state (dev tools or settings menu)
- **Mobile-first:** All tap targets should be comfortably large. Dialogue box text should be readable on small screens. Portrait should be crisp at phone resolution.
- **Accessibility:** Typewriter effect should be skippable. All text should be readable. Tap targets should meet minimum size guidelines.
