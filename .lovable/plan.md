

# Calendar Complete Overhaul

## Problems With the Current Calendar

### Layout Issues
- **Cramped grid layout**: Calendar takes 2/3 and events take 1/3 on desktop, but the DayPicker calendar is tiny and doesn't scale well. Wasted space everywhere.
- **Three separate sections** (calendar grid, selected day events, all upcoming events) feel disconnected and repetitive.
- **No month/week/agenda view toggle** -- stuck with a single small month view.

### Design Issues
- **Generic Card wrappers** add unnecessary borders and padding around everything, making it feel like a settings page, not a calendar.
- **Event indicators** are just colored blobs on the day -- no sense of how many events or what type.
- **Empty states** are boring and unhelpful.
- **The "All Upcoming Events" section** at the bottom is just a flat list with no visual hierarchy or grouping.

### UX Issues
- **No inline event creation** -- must open a dialog to add anything, even a quick event.
- **No way to edit events** -- only delete (and only manual ones).
- **No drag or quick-click to create** on a date.
- **Event source badges** take up space but aren't actionable.

## The New Calendar Vision

A clean, modern calendar with a prominent month grid showing event dots, an elegant slide-in day detail panel, grouped upcoming events, and quick inline event creation.

## Technical Plan

### 1. Redesign the Main Layout
**File: `src/components/Calendar.tsx`** (rewrite)

Replace the 3-card grid with a single cohesive layout:
- Top: Slim header with month/year title, prev/next navigation arrows, and "Today" quick-jump button, plus the Add Event button
- Center: Full-width custom month grid (not using the tiny DayPicker) with proper day cells that show small colored event dots (max 3 dots per day)
- Right panel (desktop) / Bottom sheet (mobile): Selected day detail panel showing that day's events in a timeline-style layout

### 2. Build a Custom Month Grid
Replace the default `DayPicker` with a custom CSS grid calendar:
- 7-column grid for days of the week
- Each day cell is a clickable square with the date number and up to 3 small colored dots indicating events
- Selected day gets a ring highlight, today gets a subtle filled background
- Days with events show a small count badge if more than 3 events
- Smooth transitions when changing months with prev/next buttons
- Outside-month days shown at reduced opacity

### 3. Redesign the Day Detail Panel
Replace the separate Card with an integrated side panel:
- Shows the selected date prominently at the top with day name
- Events displayed as a clean timeline with colored left-border strips (by source type)
- Time shown inline, description expandable on click
- Quick "Add event" input at the bottom of the panel (just a text field + Enter to create, no dialog needed for simple events)
- Full dialog still available via a "More options" link for description and time

### 4. Group Upcoming Events by Date
Replace the flat "All Upcoming Events" list:
- Group events by date with sticky date headers ("Today", "Tomorrow", "Wednesday", "Feb 18", etc.)
- Show as a compact agenda view below the calendar grid
- Limit to next 7 days, with a "Show more" to expand

### 5. Inline Quick-Add
- Clicking a day in the grid selects it AND shows a subtle text input in the detail panel
- Typing and pressing Enter creates a quick event (title only, on that date)
- For full details (time, description), a small "+" icon opens the dialog pre-filled with the selected date

### 6. Edit Support
- Clicking an event in the detail panel opens an inline edit mode (title becomes an input, time/description editable)
- Save on blur or Enter, cancel on Escape
- Delete via a small trash icon that appears on hover

### 7. Visual Polish
- Day cells use subtle hover states (`bg-accent/30`) and smooth selection ring (`ring-2 ring-primary`)
- Event dots use source-type colors: primary (zettel), blue (note), purple (scratch pad), yellow (sticky), orange (manual)
- Glassmorphic detail panel matching the app's existing `widget-card` style (`bg-card/80 backdrop-blur`)
- Warm, spacious typography -- month title in semibold, day numbers in tabular-nums for alignment
- Mobile: Calendar grid cells are smaller but still tappable (min 44px), detail panel slides up from bottom

### 8. CalendarEventsWidget Polish
**File: `src/components/widgets/CalendarEventsWidget.tsx`** (minor update)
- Keep as-is since it's already clean, just ensure it matches the new source-type color scheme

## Files Changed

| File | Action |
|------|--------|
| `src/components/Calendar.tsx` | Rewrite (custom month grid, integrated detail panel, inline quick-add, edit support, grouped agenda, visual overhaul) |
| `src/components/widgets/CalendarEventsWidget.tsx` | Minor color consistency update |

## What This Achieves

- **Beautiful month grid** with event dot indicators instead of a tiny DayPicker
- **Integrated day panel** instead of disconnected cards
- **Quick inline event creation** without opening dialogs for simple events
- **Edit support** for existing events
- **Grouped agenda view** for upcoming events with date headers
- **Responsive design** that works well on both desktop and mobile
- **Consistent visual language** with glassmorphic styling matching the rest of the app

