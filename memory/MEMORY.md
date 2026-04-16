# Rhythms App - Key Learnings

## Architecture
- **Stack**: React + TypeScript + Zustand (persist middleware) + Tailwind + Vite
- **State**: 8+ Zustand stores with localStorage persistence (rhythm_tasks, rhythm_naps, rhythm_away, etc.)
- **Cross-store calls**: Stores reference each other via `.getState()` (e.g., NapStore → TaskStore)
- **Task system**: Templates (Task) + daily instances (TaskInstance), 3 tiers (fixed-schedule/routine/todo)
- **Migrations**: Task store has version-based migration system (currently v6)

## Key Patterns
- `tsc -b` is used for the build step (project references) - `npx tsc --noEmit` for type-checking only
- Build command: `npm run build` runs `tsc -b && vite build`
- date-fns for all temporal operations, HH:mm strings for times, ISO dates for dates
- Child care tracked across 3 dimensions: sleep (NapLogs), away (AwayLogs), care status

## File Organization
- `rhythm/src/` is the source root
- Stores in `stores/`, hooks in `hooks/`, screens in `screens/`, components organized by feature
- Types all in `types/index.ts`

## Design System
- Colors: bark, cream, parchment, sage, terracotta, lavender, linen, skyblue, dustyrose, clay
- Font classes: font-display (headings), font-body (text)
- Rounded corners: rounded-xl for cards, rounded-lg for buttons
- All screens use `max-w-lg mx-auto` to maintain mobile-first aspect ratio

## Product Backlog
- Saved in `memory/backlog.md` — quick fixes, medium features, and big features with notes
- Last updated: Feb 2026 after Phase 7 UX session

## Recent Changes (Mar 2026)
- Phase 1: ChildStatusBar replaces NapControls + AwayControls
- Phase 2: Transition system (useTransitionStore, TransitionPrompts, useTransitionCheck)
- Phase 3: Event system (useEventStore) + triggeredBy on tasks + task store v4
- Phase 4: Nap prediction (useNapPrediction hook)
- Phase 5: Today screen restructured with DayTimeline, YourWindow, ComingUp, extracted TaskCard
- Phase 6: Onboarding overhaul + terminology rename
  - TaskTier: 'fixed-schedule' | 'routine' | 'todo' (was anchor/rhythm/tending)
  - Task store v6 migration renames old tier values automatically
  - New onboarding: welcome→children→only-child→childcare→task-intro→fixed-schedule→routines→todos→complete
  - Removed 'season' step; new TaskIntroStep explains the 3 layers; TodosStep uses chips
  - hooks/useAutoComplete.ts auto-completes past fixed-schedule tasks on Today screen
- Phase 8: Garden editing moved to Today page
  - GardenPreview has an "edit garden" button → slides open a tray below the scene
  - Edit tray: Flower Palette (select type to place), mode label, 🗑️/🔄/Done controls
  - In edit mode, depth-layer flowers fade out; interactive overlay renders them draggable
  - Drag flower on scene → move it; drag onto palette → return to inventory
  - Garden tab replaced with Collections tab (/collections)
  - Collections: scrapbook postage-stamp cards per flower type, CSS mask perforations,
    count earned + first earned date, unearned stamps shown faded
  - Flowers in FLOWER_CATALOG now have a `season: Season` field; Collections groups by season
- Phase 9: Seasonal garden scenes
  - Three sprite sheets: farm_winter_recolor.png, farm_spring_summer.png, farm_autumn.png
  - Sprite coords in assets/cottage_scene/winterSprites.ts, springSprites.ts, autumnSprites.ts
  - springSprites/autumnSprites use offset maps from winter anchors (house, mailbox, fence, path, pine tree)
  - Season determined by equinox dates in getCurrentSeason() (useGardenStore.ts)
  - Dev overlay has season toggle buttons (spring/summer/fall/winter) via simSeason state in GardenPreview
  - Snow piles canvas only rendered in winter; all other canvases re-draw on seasonSheet change
  - Sunrise/sunset shown as plain text below the garden scene (no emoji)
