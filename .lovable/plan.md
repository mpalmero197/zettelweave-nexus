

# Dashboard Actionability Revamp

## Current Problems
1. **Hero zone wastes space** — greeting + stats pills + 3 tiny action buttons don't drive action. The quick actions (Capture, Task, Event) are hidden behind a click and feel like afterthoughts.
2. **Action Agenda is passive** — it shows what's due but you can't act on items inline (no snooze, no reschedule, no start focus session).
3. **Tasks and Calendar widgets duplicate** the Action Agenda content — the user sees the same tasks/events in 3 places.
4. **Recent Work and Favorites are read-only** — they show titles but offer no quick actions (edit, continue writing, move to project).
5. **No writing-centric focus** — for a writer-focused app, there's no "Continue Writing" or "Writing Streak" prompt.

## Redesign Philosophy
Merge redundant widgets, add inline actions everywhere, and introduce a **Command Row** that puts the 3 most impactful next actions front and center. Every widget earns its space by enabling *doing*, not just *viewing*.

---

## Changes

### 1. Replace Hero with Command Row
**File**: `src/components/widgets/WelcomeWidget.tsx` (rewrite)

The greeting shrinks to a single line. Below it, a **Command Row** shows 3 auto-generated "smart action" cards based on real data:
- **"Continue Writing"** — links to the most recently edited note/card (fetched from Supabase, sorted by `updated_at`). One click navigates to it.
- **"Next Task"** — shows the highest-priority pending task with a checkbox to complete it inline and a "Start Focus" button that opens the Pomodoro sheet.
- **"Upcoming"** — next event with time, or "No events today" with a quick "Add Event" button.

Below the command row: the existing Capture/Task/Event inline forms stay but move into a collapsible "+" row (single icon button that expands).

```text
┌──────────────────────────────────────────────────┐
│ Good morning, Alex · Friday, March 28            │
│                                                  │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│ │ ✏ Resume  │ │ ☑ Review │ │ 📅 2:00pm │          │
│ │ Ch. 3    │ │ outline  │ │ Team call│          │
│ │ [Open]   │ │ [✓] [⏱] │ │ [Open]   │          │
│ └──────────┘ └──────────┘ └──────────┘          │
│                                    [+ Capture]   │
└──────────────────────────────────────────────────┘
```

### 2. Upgrade Action Agenda with Inline Actions
**File**: `src/components/widgets/ActionAgendaWidget.tsx` (edit)

Each item gets contextual action buttons on hover/tap:
- **Tasks**: checkbox (existing) + "Snooze to tomorrow" button (updates `due_date` to tomorrow) + "Start Focus" (opens Pomodoro with task pre-selected)
- **Events**: "Reschedule" button (opens a date picker popover)
- Swipe-right on mobile = complete task; swipe-left = snooze

### 3. Remove Redundant Task/Calendar Widgets from Default
**File**: `src/hooks/useDashboardLayout.ts` (edit)

Set `task-tracker` and `calendar-events` to `isVisible: false` in DEFAULT_WIDGETS since Action Agenda now covers their role with more context. They remain available in the widget sidebar for users who want them.

### 4. Upgrade Recent Work to "Continue Working"
**File**: `src/components/widgets/RecentWorkWidget.tsx` (edit)

- Rename header to "Continue Working"
- Add inline action buttons per item: "Open", "Add to Focus" (links item to current Pomodoro task)
- The most recent item gets a highlighted "Resume" treatment (slightly larger, accent border-left)
- Show word count delta for notes ("+342 words today") if available

### 5. Add Writing Streak Indicator to Stats
**File**: `src/components/widgets/StatsWidget.tsx` (edit)

Add a "streak" pill that shows consecutive days with edits (calculated from `updated_at` timestamps on cards/notes). Shows like: `🔥 5-day streak`. Motivates daily writing habit.

### 6. Update Dashboard Layout
**File**: `src/components/CustomizableDashboard.tsx` (edit)

New layout order:
1. **Command Row** (WelcomeWidget, rewritten)
2. **Action Agenda** (enhanced with inline actions)
3. **Continue Working + Favorites** (2-col)
4. **Extra widgets** (user-added)

Remove the separate Tasks + Calendar section from the default grid.

---

## Technical Details

### Smart Action Cards (WelcomeWidget)
```typescript
// Fetch data for command row
const [latestWork, nextTask, nextEvent] = await Promise.all([
  supabase.from('notes').select('id,title').eq('user_id', uid)
    .is('deleted_at', null).order('updated_at', { ascending: false }).limit(1).single(),
  supabase.from('project_tasks').select('id,name,priority').eq('user_id', uid)
    .neq('status', 'done').is('parent_task_id', null)
    .order('due_date').order('priority', { ascending: false }).limit(1).single(),
  supabase.from('calendar_events').select('id,title,event_time').eq('user_id', uid)
    .gte('event_date', today).order('event_date').order('event_time').limit(1).single(),
]);
```

### Snooze Action (ActionAgendaWidget)
```typescript
const snoozeToTomorrow = async (taskId: string) => {
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  await supabase.from('project_tasks').update({ due_date: tomorrow }).eq('id', taskId);
  toast.success('Snoozed to tomorrow');
  fetchAgenda();
};
```

### Writing Streak (StatsWidget)
Query distinct dates from recent card/note edits and count consecutive days backward from today.

### Files Changed
| File | Change |
|------|--------|
| `src/components/widgets/WelcomeWidget.tsx` | Rewrite: Command Row with smart action cards |
| `src/components/widgets/ActionAgendaWidget.tsx` | Add snooze/focus inline actions per item |
| `src/components/widgets/RecentWorkWidget.tsx` | Rename, add "Resume" highlight + action buttons |
| `src/components/widgets/StatsWidget.tsx` | Add writing streak pill |
| `src/components/CustomizableDashboard.tsx` | Remove Tasks+Calendar section from default grid |
| `src/hooks/useDashboardLayout.ts` | Set task-tracker/calendar-events `isVisible: false` |

### No Database Changes
All queries use existing tables (`notes`, `zettel_cards`, `project_tasks`, `calendar_events`).

