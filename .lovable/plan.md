

# Fix Notebooks Button Routing and Add Notebook Directory View

## Problem
1. The `NotebookListWidget` is defined but **never rendered** on the dashboard — it's listed in `CORE_WIDGET_TYPES` but has no rendering case
2. Clicking "View all →" dispatches `onNavigate('notebooks')` but `notebooks` is not a recognized tab in `handleTabChange` (AppLayout) or Index.tsx
3. Notes component has notebook filtering built in, but there's no way to navigate to it from the dashboard with a specific notebook pre-selected

## Plan

### 1. Render NotebookListWidget on the Dashboard
- Import `NotebookListWidget` into `CustomizableDashboard.tsx`
- Add it to the core widget rendering section (alongside TaskTracker, CalendarEvents, etc.)
- Pass `onNavigate` so the "View all →" link works

### 2. Register `notebooks` as a Valid Tab
- Add `"notebooks"` to the `handleTabChange` switch in `AppLayout.tsx`
- In `Index.tsx`, listen for the `notebooks` tab and route it to the Notes component with an event/state that triggers the notebook directory view

### 3. Add a Notebook Directory View to Notes
- Add a new `initialView` prop to `Notes` component: when set to `'notebooks'`, show a directory-style landing page instead of the default notes list
- The directory view displays notebooks as **physical notebook cards** — each styled with the notebook's color as a spine/accent, showing the notebook name, description, note count, and a cover-like visual treatment
- Clicking a notebook card switches to the existing filtered notes view (`selectedNotebook = nb.id`)
- A "← Back to Notebooks" button returns to the directory view
- Empty state shows a prompt to create a first notebook

### 4. Make Individual Notebooks Clickable from Widget
- Each notebook row in `NotebookListWidget` will dispatch `onNavigate('notebooks')` plus a custom event carrying the notebook ID
- Notes component listens for this event and auto-selects the notebook, showing its contents directly

## Technical Details

**Files to modify:**
- `src/components/CustomizableDashboard.tsx` — import and render `NotebookListWidget`
- `src/components/AppLayout.tsx` — add `"notebooks"` to switch cases
- `src/pages/Index.tsx` — handle `notebooks` tab, pass prop to Notes
- `src/components/Notes.tsx` — add `initialView` prop, notebook directory UI with themed notebook cards
- `src/components/widgets/NotebookListWidget.tsx` — make individual rows clickable to navigate to specific notebooks

**Notebook card design:**
- Card with a colored left border (4px) acting as the notebook "spine"
- Notebook color as a subtle gradient background accent
- BookOpen icon, name, description snippet, and note count badge
- Hover state with slight scale and shadow lift
- Uses existing theme tokens (`bg-card`, `border`, `text-foreground`) for WCAG compliance across all themes

