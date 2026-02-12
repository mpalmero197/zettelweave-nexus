
# Dashboard Overhaul: A Clean, Cohesive Redesign

## What's Wrong Now
The current dashboard relies on `react-grid-layout`, which is a heavy dependency that introduces forced reflows, complex lock/unlock mechanics, and a clunky editing experience. The widgets themselves are visually monotonous -- every single one is a `Card` with the same structure, same spacing, same grey icon header. There's no visual hierarchy, no personality, and no reason to enjoy looking at it.

## The New Dashboard Vision

Replace the heavy grid-layout system with a **lightweight, CSS-only layout** using CSS Grid. This eliminates the `react-grid-layout` dependency entirely, removing forced reflows and improving performance. The design shifts to a **magazine-style layout** with clear visual hierarchy.

### Design Principles
- **Hero zone** at the top: a greeting + quick capture merged into one elegant banner
- **Stat pills** instead of boxed stat cards: inline, glanceable counters
- **Content sections** with clean dividers instead of identical card boxes
- **Subtle depth** via `backdrop-blur` and gradient borders on key widgets
- **No drag-to-rearrange complexity** for the default view; widget visibility still controlled via the sidebar

---

## Technical Plan

### 1. Replace ResizableGrid with a CSS Grid Layout Component
**File: `src/components/DashboardGrid.tsx`** (new)

A simple component that uses CSS Grid with named template areas. No third-party grid library. Layout adapts responsively via `grid-template-columns: repeat(auto-fit, minmax(320px, 1fr))` and explicit area assignments for the hero section.

### 2. Redesign the Welcome + Quick Capture as a Hero Banner
**File: `src/components/widgets/WelcomeWidget.tsx`** (rewrite)

Merge the welcome message and quick capture into a single hero banner:
- Time-aware greeting ("Good morning", "Good afternoon", "Good evening")
- Inline quick capture textarea that expands on focus
- Stats displayed as compact pill badges within the banner
- Subtle gradient border using CSS `border-image`

### 3. Redesign StatsWidget as Inline Stat Pills
**File: `src/components/widgets/StatsWidget.tsx`** (rewrite)

Instead of a 2x2 grid in a card, render stats as a horizontal row of minimal pill-shaped counters. Each pill shows the number and label. Clickable to navigate.

### 4. Modernize List Widgets with Unified Styling
**Files: RecentCardsWidget, RecentNotesWidget, TaskTrackerWidget, CalendarEventsWidget, FavoritesWidget, NotebookListWidget** (update each)

Apply consistent styling updates:
- Remove the uppercase tracking-wide header style; use a simpler `text-sm font-medium` with left-aligned icon
- Add a subtle left-border accent color per widget type for visual differentiation
- Improve empty states with more helpful messaging and a call-to-action button
- Use consistent `rounded-xl` corners and `bg-card/80 backdrop-blur-sm` for glassmorphism effect

### 5. Rewrite CustomizableDashboard.tsx
**File: `src/components/CustomizableDashboard.tsx`** (rewrite)

- Remove `ResizableGrid` usage
- Use the new `DashboardGrid` CSS grid component
- Layout structure:
  ```text
  +------------------------------------------+
  |          Hero (Welcome + Capture)         |
  +------------------------------------------+
  |  Stat Pills (inline horizontal row)      |
  +--------------------+---------------------+
  |   Recent Cards     |   Recent Notes      |
  +--------------------+---------------------+
  |   Quick Tasks      |   Upcoming Events   |
  +--------------------+---------------------+
  |   Notebooks        |   Favorites         |
  +--------------------+---------------------+
  ```
- Widgets that are toggled on via the sidebar appear below in auto-flow grid cells
- Remove lock/unlock and optimize buttons (no longer needed without drag-and-drop)

### 6. Update grid-layout.css
**File: `src/styles/grid-layout.css`** (rewrite)

Replace react-grid-layout styles with simple CSS grid utility classes for the new dashboard layout.

### 7. Simplify DashboardWidgetSidebar
**File: `src/components/DashboardWidgetSidebar.tsx`** (update)

Keep the toggle-visibility functionality but simplify the UI. Remove size badges (no longer relevant without grid resizing).

### 8. Update useDashboardLayout Hook
**File: `src/hooks/useDashboardLayout.ts`** (update)

Remove position coordinates from the default widget definitions since layout is now CSS-driven. Keep `isVisible` toggle and persistence. Simplify the `saveLayout` to only track visibility order.

---

## What This Achieves
- **Removes `react-grid-layout`** dependency -- eliminates forced reflows entirely
- **Faster rendering** -- CSS Grid is GPU-accelerated, no JS layout calculations
- **Cohesive design** -- every widget shares a visual language with subtle differentiators
- **Better hierarchy** -- the hero banner draws focus, stats are glanceable, content lists are scannable
- **Accessible** -- proper heading levels, ARIA landmarks, keyboard navigation preserved
- **Mobile-first** -- CSS Grid collapses to single column naturally

## Files Changed
| File | Action |
|------|--------|
| `src/components/DashboardGrid.tsx` | Create (new CSS grid layout) |
| `src/components/CustomizableDashboard.tsx` | Rewrite (use new grid, hero layout) |
| `src/components/widgets/WelcomeWidget.tsx` | Rewrite (hero banner with capture + stats) |
| `src/components/widgets/StatsWidget.tsx` | Rewrite (inline stat pills) |
| `src/components/widgets/RecentCardsWidget.tsx` | Update (modern styling) |
| `src/components/widgets/RecentNotesWidget.tsx` | Update (modern styling) |
| `src/components/widgets/TaskTrackerWidget.tsx` | Update (modern styling) |
| `src/components/widgets/CalendarEventsWidget.tsx` | Update (modern styling) |
| `src/components/widgets/FavoritesWidget.tsx` | Update (modern styling) |
| `src/components/widgets/NotebookListWidget.tsx` | Update (modern styling) |
| `src/components/widgets/ActivityFeedWidget.tsx` | Update (modern styling) |
| `src/components/widgets/QuickCaptureWidget.tsx` | Update (integrate into hero or restyle) |
| `src/components/DashboardWidgetSidebar.tsx` | Simplify |
| `src/hooks/useDashboardLayout.ts` | Simplify (remove position data) |
| `src/styles/grid-layout.css` | Rewrite for CSS grid |
| `src/components/ResizableGrid.tsx` | Keep file but no longer imported by dashboard |
