

# Habit Tracker -- Premium Overhaul

## Vision

Replace the current basic checklist-style Habit Tracker with a **Habit Studio** -- a visually rich, magazine-style experience featuring a GitHub-style contribution heatmap, radial progress rings, and an integrated Pomodoro timer, all in a cohesive two-panel layout. Pure CSS-driven, no new dependencies.

## Current Problems

- **Generic checklist UI**: Habits are plain cards with checkboxes -- no visual identity or delight
- **No visual history**: No heatmap or calendar view showing completion patterns over time
- **Disconnected Pomodoro**: Timer lives on a separate tab, not integrated with habit flow
- **Bulky create form**: Full card with 6 fields shown inline, pushes content down
- **Flat stats**: 4 stat cards with centered icons feel like a template, not a premium tool
- **No quick-add**: Creating a habit requires navigating to a form with multiple required fields
- **Tab-based navigation**: 4 button tabs feel dated compared to the rest of the app's premium modules

## New Architecture

A single-view layout with contextual panels:

```text
+--------------------------------------------------+
|  Habit Studio Header (compact)                    |
|  [Date] [+ Quick Add] [Pomodoro toggle]           |
+--------------------------------------------------+
|  Stats Strip (4 metrics in a slim horizontal bar) |
+--------------------------------------------------+
|                                                   |
|  Contribution Heatmap (52 weeks, GitHub-style)    |
|  Color intensity = completion percentage           |
|                                                   |
+--------------------------------------------------+
|  Today's Habits                                   |
|  +------+ +------+ +------+ +------+              |
|  | Ring | | Ring | | Ring | | Ring |              |
|  | Name | | Name | | Name | | Name |              |
|  +------+ +------+ +------+ +------+              |
|                                                   |
|  [Inline Pomodoro - collapsible]                  |
+--------------------------------------------------+
```

### Key Design Elements

- **Radial progress rings** per habit instead of checkboxes -- tap to complete, ring fills with habit color
- **Contribution heatmap** -- pure CSS grid, 52 columns x 7 rows, each cell colored by daily completion rate
- **Stats strip** -- single row of 4 metrics with colored accent borders, not separate cards
- **Inline Pomodoro** -- collapsible section at bottom, not a separate tab
- **Sheet-based create/edit** -- habits created via a slide-up sheet, not an inline form
- **Streak flames** -- animated CSS gradient on active streaks

## File Changes

### 1. Rewrite: `src/components/HabitTracker.tsx`

Complete overhaul with the following structure:

- **Header**: Compact row with title, date selector, quick-add button, Pomodoro toggle
- **StatsStrip component** (inline): Horizontal bar with Total Habits, Active Streaks, Completion Rate, Best Streak -- each as a slim pill with a colored left border
- **ContributionHeatmap component** (inline): CSS Grid of 52x7 cells. Each cell represents a day, colored from `bg-muted` (0%) to the user's primary color (100%) based on how many habits were completed that day. Hover shows date + completion count via title attribute. Last 365 days.
- **HabitGrid component** (inline): CSS Grid of habit cards, each featuring:
  - A circular SVG ring (simple `stroke-dasharray` / `stroke-dashoffset`) showing completion progress
  - Habit name below the ring
  - Streak badge with flame icon
  - Click toggles completion (ring animates fill)
  - Long-press or context button opens edit/delete actions
- **Inline Pomodoro**: Collapsible section using Collapsible component, contains the existing PomodoroTimer but styled to match
- **Create/Edit Sheet**: Uses the existing Sheet component for creating and editing habits -- cleaner than an inline form

### 2. Modify: `src/components/PomodoroTimer.tsx`

Minor styling updates only:
- Remove the wrapping Card (parent will provide context)
- Make the timer display slightly more compact
- No logic changes

### 3. Update: `src/components/widgets/HabitTrackerWidget.tsx`

Update the dashboard widget to match the new visual language:
- Show mini radial rings instead of checkbox circles
- Keep it compact for dashboard use

### 4. Minimal CSS additions in `src/index.css`

- Heatmap cell sizing and hover states
- Ring animation keyframes for completion
- Streak flame gradient animation

## Technical Details

- **SVG Rings**: Simple `<circle>` with `stroke-dasharray` and `stroke-dashoffset` calculated from completion percentage. ~10 lines of SVG per ring, very lightweight.
- **Heatmap**: CSS Grid with `grid-template-columns: repeat(52, 1fr)` and `grid-template-rows: repeat(7, 1fr)`. Each cell is a 12x12px div with `border-radius: 2px`. Color computed inline from completion data.
- **No new dependencies**: Everything built with existing shadcn components (Sheet, Collapsible, Badge, Button, Progress) plus inline SVG.
- **localStorage sync**: Same `habit-tracker-data` key, same data shape -- fully backward compatible.
- **BulletJournal integration**: `window.__addHabitFromTask` preserved.

