

# Dashboard Action Hub Revamp

## Philosophy

The dashboard shifts from a **passive information display** to an **active execution center**. Every element answers: "What do I need to do next?" Passive widgets (Recent Cards, Recent Notes, Notebooks, Favorites) get demoted or removed from the default view. Action-oriented content (tasks, events, deadlines, overdue items, quick actions) takes center stage.

## Layout

```text
┌──────────────────────────────────────┐
│  Hero: Greeting + Quick Actions Bar  │  Capture · New Task · New Event
├──────────────────────────────────────┤
│  Action Agenda (full width)          │  Unified timeline: overdue → today → tomorrow → this week
├──────────────┬───────────────────────┤
│  Tasks       │  Upcoming Events      │  Interactive, checkable, inline-addable
├──────────────┼───────────────────────┤
│  Recent Work │  Favorites            │  Compact, secondary priority
└──────────────┴───────────────────────┘
```

## Changes

### 1. Hero Zone — Quick Actions Bar
**File**: `WelcomeWidget.tsx`

Replace the Quick Capture textarea with a **Quick Actions Bar** — a row of action buttons:
- **Capture** (opens inline text input on click, same as current but collapsed to a button)
- **New Task** (inline single-field task creation, saved directly to `project_tasks`)
- **New Event** (inline fields for title + date, saved to `calendar_events`)

Stats pills move into a subtle secondary line below the greeting. Remove the hero-banner decorative styling — use a clean, flat card.

### 2. New: Action Agenda Widget (Full Width)
**New file**: `src/components/widgets/ActionAgendaWidget.tsx`

A **unified timeline** that merges tasks and events into a single chronological feed, grouped by urgency:
- **Overdue** (red accent): Past-due tasks and missed events
- **Today**: Tasks due today + events happening today, sorted by time
- **Tomorrow**: Same pattern
- **This Week**: Remaining items

Each item is interactive:
- Tasks have inline checkboxes to mark done
- Events show time and clickable title to navigate to calendar
- Overdue items show "X days late" badge
- Max 3 items per section, with "Show more" expanding inline

Data source: Single query joining `project_tasks` (due_date) and `calendar_events` (event_date, event_time), sorted chronologically.

### 3. Slim Down Today Strip
**File**: `TodayStripWidget.tsx`

Remove this widget entirely — its purpose is absorbed by the Action Agenda which provides richer, more actionable today data.

### 4. Task Widget — Keep but Streamline
**File**: `TaskTrackerWidget.tsx`

- Remove the priority selector buttons (clutters the dashboard; priority is set in the edit sheet)
- Keep inline add (single input + enter)
- Keep progress bar
- Add **overdue count** badge next to the title: "Tasks · 2 overdue"

### 5. Calendar Widget — Add Quick-Add
**File**: `CalendarEventsWidget.tsx`

- Add an inline "Add event" input at the top (title + today's date by default)
- Keep the proximity labels ("in 2h")

### 6. Demote Passive Widgets
**File**: `CustomizableDashboard.tsx`

- Move Recent Cards + Recent Notes into a **single "Recent Work" widget** that interleaves both, sorted by last updated. This halves the passive widget real estate.
- Notebooks widget removed from default layout (still toggleable via widget sidebar)
- Favorites stays but moves to the bottom row

### 7. New: Recent Work Widget (Combined)
**New file**: `src/components/widgets/RecentWorkWidget.tsx`

Merges Recent Cards and Recent Notes into one widget:
- Each item shows an icon (Brain for cards, FileText for notes), title, and relative time
- Max 5 items, sorted by most recently updated
- Clicking navigates to the item
- Footer: "X more items"

### 8. Dashboard Layout Update
**File**: `CustomizableDashboard.tsx`

New ordering:
1. Hero (greeting + quick actions)
2. Action Agenda (full width)
3. Tasks + Calendar Events (2-col)
4. Recent Work + Favorites (2-col)
5. Extra widgets (2-col auto-flow)

---

## Technical Details

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/widgets/ActionAgendaWidget.tsx` | Unified overdue → today → tomorrow → week timeline |
| `src/components/widgets/RecentWorkWidget.tsx` | Combined cards + notes recent activity |

### Files to Edit
| File | Changes |
|------|---------|
| `src/components/widgets/WelcomeWidget.tsx` | Replace textarea with Quick Actions bar (Capture, New Task, New Event buttons with inline expansion) |
| `src/components/widgets/TaskTrackerWidget.tsx` | Remove priority buttons from add form, add overdue badge |
| `src/components/widgets/CalendarEventsWidget.tsx` | Add inline quick-add event input |
| `src/components/CustomizableDashboard.tsx` | New layout order, replace Recent Cards/Notes with RecentWork, add ActionAgenda, remove TodayStrip, remove Notebooks from default |

### Files to Remove from Dashboard (keep components, just not imported)
- `TodayStripWidget` (absorbed by ActionAgenda)
- `RecentCardsWidget` / `RecentNotesWidget` (replaced by RecentWorkWidget)
- `NotebookListWidget` (demoted, still in widget sidebar)

### No Database Changes
All data already exists in `project_tasks` and `calendar_events`. The Action Agenda just queries both tables with date range filters.

