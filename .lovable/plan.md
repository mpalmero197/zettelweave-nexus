

# Heptabase & Milanote-Inspired Notes Enhancement

## What Changes

### 1. Canvas/Board View — Spatial Note Arrangement
Add a third view mode (`grid | list | board`) where notes appear as draggable cards on a 2D canvas. Users can spatially arrange notes, draw visual clusters, and think visually — the core Heptabase experience.

- New `NotesBoard.tsx` component: infinite-scroll canvas with draggable note cards
- Notes get `position_x` and `position_y` columns (via migration) for persisting spatial positions
- Cards show title + preview; click to open; drag to reposition
- Auto-layout for notes without saved positions (masonry-like initial placement)
- Minimap indicator in corner for navigation

### 2. Wikilink System — `[[Note Title]]` Linking
Enable `[[wikilinks]]` in note content to link notes together, the backbone of both Heptabase and networked note-taking.

- Parse `[[...]]` syntax in note content and render as clickable internal links
- Clicking a wikilink opens that note (or creates it if it doesn't exist)
- **Backlinks panel** in the note viewer: shows all notes that link *to* the current note via `[[...]]`
- Query backlinks by searching note content for `[[Current Note Title]]`

### 3. Split View — Side-by-Side Notes
Add a split-pane mode so users can view/edit two notes simultaneously (Heptabase-style).

- Button in note viewer to "Open in split"
- Uses `ResizablePanelGroup` (already in project) for a left/right pane layout
- Each pane is an independent note editor/viewer
- Only on desktop (≥768px)

### 4. Daily Journal Quick Entry
A "Today" button that auto-creates or opens today's daily note (named `YYYY-MM-DD`), inspired by Heptabase's Journal feature.

- Adds a journal icon button to the toolbar
- Creates a note titled with today's date in a "Journal" notebook (auto-created if needed)
- If today's note exists, opens it directly for appending

### 5. Note Properties Sidebar
A collapsible metadata panel in the note viewer showing:
- Word count, character count, reading time
- Created/modified timestamps
- Tags (editable inline)
- Backlinks list
- Notebook assignment

### 6. Visual Enhancements (Milanote-inspired)
- **Cover color/gradient** strip at top of note cards (user-selectable, stored as `cover_color`)
- **Note icon/emoji** selector for visual differentiation
- **Column sections** in board view — optional vertical dividers to group spatial notes

---

## Files Modified

| File | Change |
|------|--------|
| `supabase/migrations/` | New migration: add `position_x`, `position_y`, `cover_color`, `icon` columns to `notes` table |
| `src/components/Notes.tsx` | Add board view toggle, daily journal button, split view trigger |
| `src/components/NotesBoard.tsx` | **New** — Canvas/board view with draggable note cards and minimap |
| `src/components/NotesSplitView.tsx` | **New** — Resizable split-pane for side-by-side note editing |
| `src/components/NotePropertiesPanel.tsx` | **New** — Metadata sidebar with backlinks, word count, properties |
| `src/components/NoteViewerDialog.tsx` | Add wikilink rendering, backlinks section, properties panel toggle |
| `src/components/EditNoteDialog.tsx` | Add wikilink autocomplete, cover color picker, icon selector |
| `src/types/zettel.ts` or Note interface | Extend Note type with new fields |

## Technical Details

**Board view drag**: Use pointer events with `onPointerDown/Move/Up` for drag (no new dependency). Store positions via debounced Supabase update on drag end.

**Wikilinks**: Regex `/\[\[([^\]]+)\]\]/g` to detect links. Render as `<button>` elements styled as inline links. On click, find note by title match and open it.

**Backlinks query**: `supabase.from('notes').select('id, title').ilike('content', '%[[' + noteTitle + ']]%')` — simple content search.

**Split view**: Wrap the main notes area in a conditional `ResizablePanelGroup` when split mode is active. Second pane renders an independent `NoteViewerDialog`-style inline view.

**Daily journal**: On click, query for a note titled `YYYY-MM-DD` in the Journal notebook. If not found, insert one and open the editor.

