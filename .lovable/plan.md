
## Summary of Issues

There are 5 problems to fix and 1 new feature to add:

1. **Dashboard items not opening when clicked** — `TaskTrackerWidget` still uses localStorage and has no click-to-open handler. `RecentNotesWidget` already works via `onOpenNote` prop, but the prop is not being passed down correctly in some cases.
2. **Habits not showing on Calendar** — `Calendar.tsx` was never updated to read from localStorage habits. The calendar only queries `calendar_events`.
3. **Task repeat button missing** — The database migration was never run (`project_tasks` still lacks `notes`, `repeat_type`, `repeat_until`). The `TaskTrackerWidget` was never migrated from localStorage to Supabase.
4. **Mind map node notes panel** — Currently notes are set via a crude `prompt()` dialog. The user wants a proper expandable side panel (like cards) when clicking a node.
5. **Replace all AI with Gemini** — Two edge functions (`ai-edit-card` and `ai-categorize-card`) still call OpenAI directly using `OPENAI_API_KEY`. They need to be rewritten to use the Lovable AI Gateway with `google/gemini-3-flash-preview`.

Note: `transcribe-audio` uses OpenAI Whisper for actual audio processing — this is audio-specific and Gemini does not offer a Whisper equivalent. This function will be left as-is (it already has its own gateway fallback in `transcribe-audio-ai`).

---

## Database Migration Required

The `project_tasks` table needs 3 new columns before the TaskTrackerWidget can be migrated:

```sql
ALTER TABLE project_tasks
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS repeat_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS repeat_until date;
```

---

## File Changes

### 1. `supabase/functions/ai-edit-card/index.ts`
Replace OpenAI call with Lovable AI Gateway:
- Change endpoint to `https://ai.gateway.lovable.dev/v1/chat/completions`
- Change auth header to `Bearer ${LOVABLE_API_KEY}`
- Use model `google/gemini-3-flash-preview`
- Remove `OPENAI_API_KEY` dependency
- Keep same input/output shape and the Zod validation
- Keep the retry logic but simplify since Gateway handles rate limits uniformly
- Add 429/402 specific error responses

### 2. `supabase/functions/ai-categorize-card/index.ts`
Same swap:
- Change endpoint, auth, and model to Lovable AI Gateway + Gemini
- Remove `OPENAI_API_KEY` dependency
- Keep Zod validation and response parsing intact

### 3. `src/components/widgets/TaskTrackerWidget.tsx` (Major rewrite)
Migrate from localStorage to Supabase `project_tasks`, and add:

**Supabase integration:**
- On mount: `supabase.from('project_tasks').select('*').eq('user_id', user.id).order('created_at', {ascending: false})`
- Add task: `insert({ name, priority, due_date: today, status: 'todo', user_id, notes: '', repeat_type: 'none' })`
- Toggle complete: `update({ status: 'done' })` — if `repeat_type !== 'none'`, auto-insert next occurrence
- Delete: `delete().eq('id', id)`

**Edit Sheet per task** (opens on task row click):
- Sheet with fields: title (Input), priority (button group), notes (Textarea), due date (date Input), repeat type (Select: None / Daily / Weekly / Monthly)
- Save button calls `update()`

**Repeat logic when completing:**
```ts
if (task.repeat_type !== 'none' && task.due_date) {
  const nextDue = repeat_type === 'daily' ? addDays(dueDate, 1)
               : repeat_type === 'weekly' ? addWeeks(dueDate, 1)
               : addMonths(dueDate, 1);
  if (!task.repeat_until || nextDue <= parseISO(task.repeat_until)) {
    supabase.from('project_tasks').insert({ ...task, id: undefined, status: 'todo', due_date: nextDue });
  }
}
```

**Click-to-open:** The widget header has an "Open Task Manager →" button that calls `onNavigate?.('tasks')` if available, otherwise opens a Sheet containing the full TaskManager.

**Repeat badge:** Show a small `↻` icon on tasks that have `repeat_type !== 'none'`.

### 4. `src/components/CustomizableDashboard.tsx`
Pass `onNavigate` down to `TaskTrackerWidget`:
```tsx
{isVisible('task-tracker') && <TaskTrackerWidget onNavigate={onNavigate} />}
```

### 5. `src/components/Calendar.tsx`
Add tasks and habits to the unified calendar display:

**Tasks from Supabase:**
- After fetching `calendar_events`, also fetch `project_tasks` for the current month range filtered by `due_date`
- Convert each task to a display item with `source_type: 'task'` (pending) or `'task_done'` (status = 'done')
- In the day detail panel, render tasks with a `Checkbox` that calls Supabase UPDATE to toggle status

**Habits from localStorage:**
- Read `localStorage.getItem('habit-tracker-data')` and parse the `Habit[]` array
- For each habit's `completions`, find entries where `completed === true` and surface them as `source_type: 'habit'` items on their respective dates

**New dot colors and legend entries:**
```ts
SOURCE_DOT_COLORS['task'] = 'bg-rose-500';
SOURCE_DOT_COLORS['task_done'] = 'bg-green-500';
SOURCE_DOT_COLORS['habit'] = 'bg-teal-500';
SOURCE_LABELS['task'] = 'Task';
SOURCE_LABELS['task_done'] = 'Done';
SOURCE_LABELS['habit'] = 'Habit';
```

**Calendar items type:** Introduce a merged `CalendarItem` union type (either a `CalendarEvent` from the DB, a task row, or a habit entry) so everything can render in the same list.

### 6. `src/components/MindMap.tsx`
Replace the `prompt()` dialog for notes with a proper **Node Detail Panel**:

**State additions:**
```ts
const [nodeDetailOpen, setNodeDetailOpen] = useState(false);
const [nodeDetailId, setNodeDetailId] = useState<string | null>(null);
const [nodeDetailNote, setNodeDetailNote] = useState('');
```

**Single-click behavior change:** Currently single-click sets `selectedId`. Change it so a single click selects the node AND opens the detail panel:
```tsx
onClick={(e) => {
  e.stopPropagation();
  setSelectedId(node.id);
  setNodeDetailId(node.id);
  setNodeDetailNote(node.note || '');
  setNodeDetailOpen(true);
}}
```

**Remove the `prompt()` call** from the context menu "Add Note" item — replace it with:
```tsx
<ContextMenuItem onClick={() => {
  setNodeDetailId(node.id);
  setNodeDetailNote(node.note || '');
  setNodeDetailOpen(true);
}}>
  <StickyNote className="h-3.5 w-3.5 mr-2" />Edit Note
</ContextMenuItem>
```

**Node Detail Panel** — a `Sheet` (from shadcn) that slides in from the right:
- Header: node emoji + node text, priority badge
- Tabs (like a card): "Note" and "Info"
- **Note tab**: Full `Textarea` (no char limit, auto-grow) for the node's note. Auto-saves on blur with `setNote(nodeDetailId, text)`. Character count display.
- **Info tab**: Shows node color, priority selector (buttons), emoji picker (grid), linked card info (badge + open button if linked), children count, breadcrumb path from root
- Close button saves the note automatically
- Width: `w-80 sm:w-96` so it doesn't cover the entire canvas

**Action ring** — add a `StickyNote` button to the hover action ring alongside the existing `+` and `Trash` buttons for quick access.

### 7. `src/hooks/useZettelCards.ts`
Fix the duplicate key collision (already planned, implementing now):
```ts
// After line 230 (the insert call):
if (error?.code === '23505') {
  // Collision — append timestamp suffix and retry once
  const fallbackNumber = `${cardNumber}-${Date.now().toString(36)}`;
  const retry = await supabase.from('zettel_cards').insert({
    ...insertPayload, number: fallbackNumber
  }).select().single();
  if (retry.error) throw retry.error;
  return { data: retry.data, merged: false };
}
if (error) throw error;
```

---

## Technical Notes

- The database migration must run first before the TaskTrackerWidget can insert rows (the `notes` and `repeat_type` columns need to exist).
- `project_tasks.due_date` is `NOT NULL` — when creating tasks from the widget, default to today's date.
- Habits are read-only on the calendar (no editing from calendar view); editing still happens in the HabitTracker component.
- The Mind Map node detail panel does NOT require any database changes — `node.note` is already part of the `MindMapNode` schema and is serialized into `map_data` JSONB.
- The `transcribe-audio` function intentionally keeps OpenAI Whisper as it requires audio transcription which Gemini does not support natively.
- The Lovable AI Gateway (`LOVABLE_API_KEY`) is auto-provisioned — no secret configuration needed for the edge function migration.
