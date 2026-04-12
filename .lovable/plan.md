

# Stability, Editability, and UX Improvement Plan

## Problem Summary

Based on the error reports database and your priorities, there are four areas to address:

1. **Internal errors** -- runtime crashes from undefined references, React hook violations, and missing null guards
2. **Editability gaps** -- TaskManager uses local-only state (data lost on refresh), some items lack edit flows
3. **Contextual Backlinks** -- backlinks currently show only note titles without surrounding context
4. **General stability** -- defensive coding across components to prevent cascading failures

---

## What's Causing Your Errors

The error reports show these recurring issues:

| Error | Occurrences | Root Cause |
|-------|-------------|------------|
| `Cannot read properties of undefined (reading 'length')` | 8 | Missing null guards on arrays (likely `tags`, `notes`, or similar) |
| React error #185 (update on unmounted component) | 6 | Async operations completing after navigation away |
| `Rendered more hooks than previous render` | 2 | Conditional hook calls (likely in components with early returns) |
| `Should have a queue` (React internal) | 6 | State updates on unmounted components |

---

## Plan

### Step 1: Fix Runtime Errors and Add Defensive Guards

- Add null/undefined guards across components that access arrays (`tags`, `notes`, `linked_cards`) -- use `?? []` and optional chaining
- Wrap async Supabase calls in mounted-check patterns (abort controller or ref flag) to prevent updates on unmounted components
- Fix any conditional hook calls by ensuring hooks are always called in the same order

**Files**: `Notes.tsx`, `NoteViewerDialog.tsx`, `NotePropertiesPanel.tsx`, `HabitTracker.tsx`, `Calendar.tsx`, and any component flagged in error reports

### Step 2: Persist TaskManager to Supabase

The TaskManager currently stores all tasks in React state only -- they vanish on page refresh. This is a critical gap per your server-side persistence mandate.

- Create a `tasks` table in Supabase with columns: `id`, `user_id`, `title`, `notes`, `estimated_time`, `actual_time`, `is_completed`, `is_active`, `completed_at`, `list`, `created_at`, `updated_at`
- Add RLS policies for user isolation
- Refactor `TaskManager.tsx` to read/write from Supabase instead of local state
- Ensure tasks are fully editable (title, notes, estimated time, list assignment)

### Step 3: Contextual Backlinks

Currently, the backlinks panel in NoteViewerDialog and NotePropertiesPanel only shows note titles. Per your priority, add surrounding context.

- When fetching backlinks, also retrieve the `content` field
- Extract a ~100-character snippet around the `[[NoteTitle]]` wikilink occurrence
- Display the snippet below each backlink title, with the wikilink highlighted
- This applies to both `NoteViewerDialog.tsx` and `NotePropertiesPanel.tsx`

### Step 4: Ensure All Content Types Are Editable

Audit and confirm edit flows exist for:
- **Notes**: Already editable via EditNoteDialog (confirmed working)
- **Cards**: Already editable via EditCardDialog
- **Habits**: Already editable via HabitFormSheet
- **Calendar events**: Already editable inline
- **Tasks**: Will become editable after Step 2 persistence work
- **Notebooks**: Already editable

Add inline edit capability to TaskManager for task title and notes if not already present.

---

## Technical Details

**Migration SQL (Step 2)**:
```sql
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  notes TEXT DEFAULT '',
  estimated_time INTEGER DEFAULT 30,
  actual_time INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT FALSE,
  start_time BIGINT,
  completed_at TIMESTAMPTZ,
  list TEXT DEFAULT 'default',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tasks"
  ON public.tasks FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**Backlink context extraction (Step 3)**:
```typescript
// Extract ~50 chars before and after the wikilink
const regex = new RegExp(`(.{0,50})\\[\\[${noteTitle}\\]\\](.{0,50})`, 'i');
const match = content.match(regex);
const snippet = match ? `...${match[1]}[[${noteTitle}]]${match[2]}...` : '';
```

**Mounted guard pattern (Step 1)**:
```typescript
useEffect(() => {
  let cancelled = false;
  const fetch = async () => {
    const { data } = await supabase.from('notes')...;
    if (!cancelled) setBacklinks(data || []);
  };
  fetch();
  return () => { cancelled = true; };
}, [note?.id]);
```

