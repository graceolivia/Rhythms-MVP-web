# Rhythms App — Product Backlog

Items tagged with the date they were added. 🔨 quick code change · 🏗️ bigger feature · 🎨 design/content work

---

## Quick Fixes / Polish
- 🔨 Onboarding Back button should restore scroll position *(Feb 2026)*
- 🔨 Custom task input should fuzzy-suggest from chore library as you type *(Feb 2026)*
- 🔨 "Not today" gesture — defer a task to tomorrow without completing or deleting it (currently deferred goes to seed tray, not tomorrow) *(Feb 2026)*
- 🔨 Nap prediction should surface more proactively on Today ("Tommy usually naps around now") *(Feb 2026)*

---

## Medium Features

### Views Rethink (Todoist-style) *(Feb 2026)*
- Today screen has competing sections (YourWindow vs task list) — rethink as distinct switchable views
- Proposed modes: "Right Now" (window + immediate context), "Full Day" (everything laid out), "Plan" (edit/manage)
- Keeps each view purposeful instead of one long scroll

### Weekly Review *(Feb 2026)*
- Gentle Sunday prompt: "Here's how your week looked. What do you want to keep, drop, or adjust?"
- Makes the data feel meaningful and reflective

### Good Enough Day — Tiered System (replace removed popup) *(Feb 2026)*
- Reimagine as: Good Enough Day → Great Day → Epic Day
- Each tier has progressively harder criteria (meals+basics → chores+routines → exercise+kids+self-care)
- Corresponding rewards/flowers for each tier

### Challenges Page Overhaul 🎨 *(Feb 2026)*
- Needs more of Grace's personal creative voice — opinionated, curated
- Add **Weekly Challenge** (rotating, shorter-term)
- Add **Seasonal Challenge** (bigger, more meaningful)
- Signature challenges with rare flower rewards (e.g. "Night Rose" for 5-day exercise streak)
- Goal: game-like, worth sharing achievements

---

## Big Features

### Habit Stacks *(Feb 2026)*
- Named expandable groups of tasks (e.g. "Close the House", "Morning Prep")
- Each step is its own task with context metadata (bestWhen, napContext, etc.)
- Completing the full stack shows satisfying progress (e.g. "4/5 done")
- Completing a stack N days in a row unlocks a rare flower challenge
- This is the bridge between the task system and Challenges
- Needs a gentle intro/onboarding moment (currently loads silently with no explanation)

### Meal Planning *(Feb 2026)*
- Weekly meal view where you slot in meals
- Auto-generates grocery list from planned meals
- Cooking tasks flow from what you planned into your day
- Not just a category of todos — its own mini-system

### Nap Tracking Mode *(Feb 2026)*
- Two modes: **Guessing** (current — predicts based on typical schedule) vs **Tracking** (log actual times)
- In tracking mode: app uses real wake time to recalculate downstream nap/bedtime predictions
- e.g. if Tommy woke at 11am instead of 9am, next nap and bedtime shift accordingly

### Timeline Tab Rethink *(Feb 2026)*
- Current state: text overview + visual blocks — unfocused, underused
- Potential direction: Huckleberry-style nap tracker, one-off appointments, maybe GCal import
- Needs a purpose audit before building — what job is it actually doing?

### Cloud Sync *(Feb 2026)*
- Everything currently in localStorage — doesn't follow you across devices
- Worth exploring Supabase or Firebase for automatic sync
- Bigger infrastructure decision — flag for when app is more stable

### Partner Mode (Future) *(Feb 2026)*
- Second account sees the same family's rhythm
- Two caregivers stay in sync without texting "did Tommy nap?"
- Possible premium unlock — parked for now

---

## Design / Asset Work
- 🎨 Pixel art style guide: define base pixel unit (e.g. 2px or 3px per "pixel unit"), canvas sizes for garden/cottage/sky assets so everything composes consistently in CSS *(Feb 2026)*

---

## Completed

### May 2026
- ✅ Edit garden: flowers showed as sprouts instead of grown form (fixed frame calculation in GardenPreview edit overlay)
- ✅ Tasks screen: completed to-dos move to "Done today" section instead of staying in active list

### Feb 2026 (Phase 7 UX session)
- ✅ YourWindow label is now dynamic when kids are in mixed sleep states
- ✅ Morning routines auto-complete after noon
- ✅ Bedtime/wake-up tasks render as soft markers (🌙/☀️), not checkboxes
- ✅ Good enough day popup removed
- ✅ Tasks tab reordered: To-dos → Routines → Fixed Schedule (Fixed Schedule sorted chronologically)
- ✅ Garden drag-and-drop from palette to grid
- ✅ Only one nap transition prompt shown at a time (older ones auto-dismissed)
- ✅ Long task titles truncated to 2 lines
