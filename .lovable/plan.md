
## Overview

Five separate issues to address in one sweep:

1. **Tasks + habits on the calendar** — Show `project_tasks` (with due dates) and habit completions alongside existing calendar events
2. **Repeat button on tasks + edit priority/notes** — The `project_tasks` table needs a `repeat_type` column; the `TaskTrackerWidget` needs edit/repeat UI
3. **Duplicate key on zettel card auto-generate** — The number generation is not atomic; fix with a retry loop and unique suffix fallback
4. **Dashboard items not opening when clicked** — The `TaskTrackerWidget` on the dashboard has no click-to-open handler; needs a modal/sheet to open the full task manager

---

## Issue 1 — Tasks & Habits on the Calendar

### Root Cause
`Calendar.tsx` only fetches from the `calendar_events` table. `project_tasks` (with a `due_date` column) and habits (stored in `localStorage`) are never surfaced there.

### Database Change
`project_tasks` is missing `notes` (free-text notes on a task) and `repeat_type`. We need to add both columns so we can support inline editing and repeats from the same table.

```sql
ALTER TABLE project_tasks
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS repeat_type text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS repeat_until date;
```

### Calendar.tsx changes
- Add a second Supabase query to fetch `project_tasks` for the current month:
  ```ts
  const { data: taskData } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('user_id', user.id)
    .gte('due_date', startOfMonthISO)
    .lte('due_date', endOfMonthISO);
  ```
- Convert tasks to a unified `CalendarItem` type that merges with events, adding:
  - `source_type: 'task'` for incomplete tasks
  - `source_type: 'task_done'` for completed tasks
- Load habits from `localStorage` (same format as `HabitTracker`) and surface today's habit completions as `source_type: 'habit'`
- Add new dot colors and labels:
  ```ts
  task: 'bg-rose-500'        // pending task
  task_done: 'bg-green-500'  // completed task  
  habit: 'bg-teal-500'       // habit
  ```
- In the day detail panel, render tasks with a checkbox toggle (calls Supabase UPDATE to flip `status`) and habits as read-only badges

---

## Issue 2 — Repeat Button + Edit Priority/Notes on Tasks

### `project_tasks` already stores `priority`; `notes` and `repeat_type` are added by the migration above.

### TaskTrackerWidget.tsx changes
Currently the widget reads from `localStorage`. We need to **migrate it to use `project_tasks` from Supabase** (the table already exists with RLS). This gives persistence and allows the calendar to read tasks.

Key changes:
- Replace `localStorage` with Supabase CRUD (`select`, `insert`, `update`, `delete`)
- Add an **Edit sheet/dialog** per task with fields: title, priority, notes, due date, repeat type
- Add a **Repeat button** per task that shows a popover with options: None, Daily, Weekly, Monthly — stored as `repeat_type` on the task row
- When completing a task that has `repeat_type !== 'none'`, automatically create the next occurrence by inserting a new row with `due_date` advanced by the repeat interval

### Repeat logic (frontend)
```ts
async function completeRepeatingTask(task) {
  await supabase.from('project_tasks').update({ status: 'done' }).eq('id', task.id);
  if (task.repeat_type !== 'none') {
    const nextDue = addDays/addWeeks/addMonths(task.due_date, 1);
    if (!task.repeat_until || nextDue <= task.repeat_until) {
      await supabase.from('project_tasks').insert({
        ...task, id: undefined, status: 'todo', due_date: nextDue
      });
    }
  }
}
```

---

## Issue 3 — Duplicate Key on Zettel Card Auto-Generate

### Root Cause
In `useZettelCards.ts` lines 196–200, the `generateNumberForMethod` function reads `cards` (the cached query result) to find the max number and picks `max + 1`. When two creates happen near-simultaneously, or when the local `cards` cache is stale (e.g., browsing another user's profile), both can get the same number, violating the `zettel_cards_user_id_number_key` unique constraint.

### Fix
Add a **collision retry loop** in the `createCardMutation`. If the insert fails with Postgres error code `23505` (unique violation), regenerate the number by appending a timestamp suffix and retry once:

```ts
let cardNumber = generateNumberForMethod(...);
let insertResult = await supabase.from('zettel_cards').insert({ ..., number: cardNumber }).select().single();

if (insertResult.error?.code === '23505') {
  // Collision — append timestamp to make unique
  cardNumber = `${cardNumber}-${Date.now().toString(36)}`;
  insertResult = await supabase.from('zettel_cards').insert({ ..., number: cardNumber }).select().single();
}
if (insertResult.error) throw insertResult.error;
```

This is a purely client-side fix; no migration needed. The `generateNumberForMethod` function already accounts for existing numbers in the cache, so the collision is an edge case that only needs a single retry.

---

## Issue 4 — Dashboard Task Widget Not Opening When Clicked

### Root Cause
`TaskTrackerWidget` is a self-contained inline widget with no "expand" / click-to-open behavior. The dashboard widgets for `RecentCardsWidget` and `RecentNotesWidget` receive `onEdit`/`onOpenNote` props and open full dialogs when clicked. `TaskTrackerWidget` has no such handler.

### Fix
Add a "View All" / click-to-open behavior to `TaskTrackerWidget`:
- Wrap the widget card in a `Dialog` (or `Sheet`) that contains the full `TaskManager` content
- Add a clickable header or an "Open full task manager" link button that opens the dialog
- Alternatively (simpler): make each task row in the widget open an edit sheet when clicked (reusing the edit sheet from Issue 2 above)
- The overall widget should have a header button "Open Task Manager →" that navigates to the Tasks tab or opens a full-screen dialog

Since `Index.tsx` passes `onNavigate` to the dashboard, the cleanest approach is: clicking the widget header calls `onNavigate?.('tasks')` if a tasks tab exists, otherwise opens a full-screen `Sheet` with `TaskManager` inside.

---

## Files to Change

| File | Change |
|---|---|
| **Database migration** | Add `notes`, `repeat_type`, `repeat_until` to `project_tasks` |
| `src/components/Calendar.tsx` | Fetch tasks + habits; merge into unified display; show task checkboxes in day panel |
| `src/components/widgets/TaskTrackerWidget.tsx` | Migrate to Supabase, add edit sheet, repeat UI, click-to-open |
| `src/hooks/useZettelCards.ts` | Add collision retry for `23505` unique constraint errors |
| `src/components/CustomizableDashboard.tsx` | Pass `onNavigate` through to TaskTrackerWidget |

---

## Technical Notes

- The `project_tasks` table has RLS policies already in place (users can only CRUD their own tasks) — no new policies needed
- `due_date` is `NOT NULL` in `project_tasks`; we'll default it to `today` when creating tasks from the widget
- Habits live in `localStorage` under key `'habits'` (from `HabitTracker.tsx`) — the calendar will read from there without needing a DB change; this is a read-only display
- The `repeat_type` column uses values: `'none'`, `'daily'`, `'weekly'`, `'monthly'`
- The duplicate-key fix is backward-compatible — existing cards are unaffected
