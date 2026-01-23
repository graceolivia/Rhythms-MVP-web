# Progress

## 2026-01-23

### Meal Task Type (Discriminated Union)
- Refactored `Task` into a discriminated union: `StandardTask` (type: 'standard') and `MealTask` (type: 'meal')
- `MealTask` adds `mealType` (breakfast/lunch/dinner/snack) and `plannedMeals` (date-keyed record of what's planned)
- Added `updateMealPlan` and `getMealPlan` actions to the task store
- Added persist migration (v0→v2) to convert existing `category: 'meals'` tasks to the meal type
- Added meal plan text inputs on meal tasks in the Today screen (saves on blur, optional for completion)

### Task Completion UX
- Added 3-second grace period before completed tasks move to "done" — user can undo during this window
- Added fade-out animation (opacity + height collapse) for smooth transitions when tasks leave the list
- Replaced global "Done today" section with per-tier collapsible "done" sub-sections at the bottom of each Anchor/Rhythm/Tending group

### Nap-Context Suggestions
- Added `isTaskSuggestedForNapState` logic matching task `napContext` to the live nap state
- Suggested tasks get a "Suggested Now" badge and a sage-green border highlight
- Suggested tasks sort to the top of their section
- Suggestions respond reactively to nap state changes (start/end a nap and suggestions update)

### Chronological "By Time" View
- Added `TimeBlock` type (morning/midday/afternoon/evening) and `preferredTimeBlock` field on tasks
- Added inference function for tasks without an explicit time block (uses `scheduledTime` or `category`)
- Added "By Priority" / "By Time" toggle on the Today screen
- Chronological view groups tasks by time block, sorts anchors by scheduled time, then suggested tasks first

### Build Fixes
- Fixed `tsc -b` (build mode) errors caused by `Omit<Task, 'id'>` not distributing across the union
- Added `TaskInput` type as a properly distributive alternative
- Used `any` typing in persist migration since it handles pre-schema data
- Full `npm run build` passes clean
