

# Dashboard Overhaul — Premium Execution Environment

## What's Changing

The current dashboard is functional but violates several core dashboard design principles: weak visual hierarchy, no contextual data (numbers without meaning), redundant widgets competing for attention, and inconsistent information density. This overhaul transforms it into a purpose-driven command center for knowledge workers.

## Design Philosophy

The dashboard answers one question: **"What should I work on right now?"** Every pixel earns its place. We apply Tufte's data-ink ratio, top-left hierarchy placement, contextual numbers, and consistent visualization patterns — all within the existing Halcyon aesthetic.

---

## Plan

### 1. Redesign the Header + Stats Row (Hero Zone)

**Current**: Generic greeting + sparkle icon + separate stat pills below.
**New**: Merge greeting, date, and stats into a single compact hero strip. Stats become the greeting's right-hand companion — not a separate widget row.

- Greeting (left): `Good morning, Name` with date below
- Stats (right): Inline pill cluster showing Cards / Notes / Tasks / Events counts
- Each stat pill shows a **delta indicator** (e.g., `+3 today` or a subtle up/down arrow) for context
- Quick Capture stays integrated but collapsed by default — single-line input that expands on focus
- Remove the decorative Sparkles icon and `::before` radial gradient (data-ink ratio)

### 2. Introduce a "Today" Focus Strip

A new horizontal strip below the hero that surfaces **actionable items due today**:
- Tasks due today (count + top 3 names)
- Events happening today (count + next event time)
- Streak data if habit tracker is enabled

This replaces scanning multiple widgets to answer "what's happening today?" — one glance, one row.

### 3. Redesign Widget Cards for Consistency

Apply a uniform card anatomy across all widgets:
- **Header**: Icon + Title (left) + Action link (right, e.g., "View all →")
- **Body**: Content list (max 4-5 items, no scrollable overflow on dashboard)
- **Footer**: Contextual summary line (e.g., "3 more notes" or "Updated 2h ago")
- Remove left-border accent colors (visual noise that doesn't encode useful data)
- Use subtle top-border or icon tinting instead for type differentiation

### 4. Improve Data Context on Every Number

- **StatsWidget**: Add comparison context — show `12 Cards (+2 this week)` instead of just `12 Cards`
- **TaskTrackerWidget**: Show completion rate as a micro progress bar (e.g., `7/12 done`) instead of just "5 pending"
- **CalendarEventsWidget**: Add "Next in 2h" proximity label for the soonest event
- **RecentCardsWidget / RecentNotesWidget**: Show "Updated 3m ago" relative times consistently

### 5. Optimize Layout Grid

**Current**: CSS columns masonry — works but creates uneven visual weight.
**New**: CSS Grid with explicit row tracks for predictable hierarchy:

```text
┌──────────────────────────────────────┐
│  Hero: Greeting + Stats + Capture    │  ← Full width
├──────────────────────────────────────┤
│  Today Strip: Tasks · Events · Streak│  ← Full width, compact
├──────────────┬───────────────────────┤
│ Recent Cards │ Recent Notes          │  ← 2-col, equal
├──────────────┼───────────────────────┤
│ Tasks        │ Calendar              │  ← 2-col, equal
├──────────────┼───────────────────────┤
│ Notebooks    │ Favorites             │  ← 2-col, equal
├──────────────┴───────────────────────┤
│  Extra widgets (auto-flow 2-col)     │
└──────────────────────────────────────┘
```

On mobile (current 448px viewport): everything stacks single-column, hero compresses, Today strip scrolls horizontally.

### 6. Polish Labels and Micro-Copy

- Use short labels: "7d" not "Last 7 Days", "3h ago" not "3 hours ago"
- Round numbers where appropriate (e.g., streak percentages)
- Consistent date formatting across all widgets (relative for < 7d, absolute after)
- Remove redundant "No X yet" empty states — use a single-line hint instead of icon + paragraph

### 7. Subtle Interaction Upgrades

- Widget headers become clickable navigation links (already partially done — make consistent)
- Add keyboard shortcut hints in the Widgets sidebar sheet
- Skeleton loaders use consistent height across all widgets (currently inconsistent)

---

## Technical Details

### Files to Edit
| File | Changes |
|------|---------|
| `src/components/CustomizableDashboard.tsx` | New layout structure: hero strip, today strip, grid sections |
| `src/components/widgets/WelcomeWidget.tsx` | Merge stats inline, remove decorative elements, compact capture |
| `src/components/widgets/StatsWidget.tsx` | Add delta/context indicators, fetch weekly comparison data |
| `src/components/widgets/RecentCardsWidget.tsx` | Uniform card anatomy, max 4 items, footer summary |
| `src/components/widgets/RecentNotesWidget.tsx` | Same uniform treatment |
| `src/components/widgets/TaskTrackerWidget.tsx` | Add completion progress bar, simplify to dashboard-appropriate density |
| `src/components/widgets/CalendarEventsWidget.tsx` | Add "next in X" proximity, compact layout |
| `src/components/widgets/NotebookListWidget.tsx` | Uniform card anatomy |
| `src/components/widgets/FavoritesWidget.tsx` | Uniform card anatomy |
| `src/styles/grid-layout.css` | Replace masonry columns with CSS Grid, update widget-card to remove accent borders, add today-strip styles |

### New Component
| File | Purpose |
|------|---------|
| `src/components/widgets/TodayStripWidget.tsx` | Horizontal "today at a glance" strip — tasks due, next event, streak |

### No Changes Needed
- `useDashboardLayout.ts` — widget toggle system stays the same
- `DashboardWidgetSidebar.tsx` — widget management sidebar stays functional
- Database schema — no new tables required (all data already queryable)

