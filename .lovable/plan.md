# Cards & Notes Workspace Revamp

Transition Cards and Notes from grid-based browsing into a focused two-pane workspace (Evernote-style), with rich text editing, nested notebooks, and a searchable batch linker.

## Scope

Two surfaces are affected:
1. **Notes** (`src/components/NotesView.tsx` / related) — notebook hierarchy + two-pane editor
2. **Cards / ZettelCards** (`src/components/CardsView.tsx` / `CardViewer.tsx` / `EditCardDialog.tsx`) — two-pane editor + rich text + batch linker

## 1. Two-Pane Desktop Layout

```text
┌─────────────┬──────────────────────────────────────┐
│ Notebooks   │                                      │
│ ├ Work      │                                      │
│ │  └ Notes  │       Editor / Reader (75%)          │
│ ├ Personal  │                                      │
│ Notes List  │                                      │
│ • Note A    │                                      │
│ • Note B ◄  │                                      │
└─────────────┴──────────────────────────────────────┘
   ~25%                       ~75%
```

- Left column (~25%): scrollable list of items in the active notebook, with search/filter at top.
- Right column (~75%): full reader + inline editor for the selected item.
- On mobile: collapse to single pane with back-button navigation between list ↔ editor (reuse existing `useIsMobile` pattern).

## 2. Notebook Hierarchy (Notes)

- Add `parent_id` (nullable, FK → notebooks.id) to the `notebooks` table to support sub-notebooks.
- New `NotebookTree` sidebar component: collapsible tree, drag-to-reparent later (out of scope for v1).
- Selecting a notebook filters the middle list; selecting "All Notes" shows everything.

Schema change (migration):
```sql
ALTER TABLE notebooks ADD COLUMN parent_id uuid REFERENCES notebooks(id) ON DELETE SET NULL;
CREATE INDEX idx_notebooks_parent ON notebooks(parent_id);
```

## 3. Rich Text Editor

Use **TipTap** (already React-friendly, lightweight, headless). Install:
- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`, `@tiptap/extension-underline`

Toolbar supports: **bold**, *italic*, underline, ~~strikethrough~~, bullet list, ordered list, task list (checkboxes), and a "radio group" custom node (rendered via task-item variant with single-select styling).

Persist as HTML in existing `content` fields (notes.content already supports HTML based on `NotesBoard` stripping).

## 4. Searchable Batch Linker

New component `LinkPicker.tsx`:
- Dialog with search input + virtualized checkbox list of all user's cards/notes.
- Filters by title/number/tags as you type.
- Checked items batch-link to the current item on Save.
- For cards: writes to `card.linkedCards` (existing array). For notes: writes to `note.linked_notes` (new column if needed) or a junction table.

## 5. Files

**Create:**
- `src/components/workspace/TwoPaneLayout.tsx` — reusable shell
- `src/components/workspace/NotebookTree.tsx`
- `src/components/workspace/RichTextEditor.tsx` (TipTap wrapper + toolbar)
- `src/components/workspace/LinkPicker.tsx`
- `src/components/NotesWorkspace.tsx` — new two-pane Notes screen
- `src/components/CardsWorkspace.tsx` — new two-pane Cards screen

**Edit:**
- `src/components/EditCardDialog.tsx` — swap textarea → RichTextEditor; replace manual link UI with LinkPicker
- `src/components/CardViewer.tsx` — render HTML content (sanitized)
- Wherever Cards / Notes are currently mounted in `src/pages/Index.tsx`, swap to new Workspace components
- `src/components/NotesView.tsx` (if present) — replaced by NotesWorkspace

**Migration:** add `notebooks.parent_id`.

## Technical Notes

- HTML sanitization: use DOMPurify on render to prevent XSS from stored content.
- Keep existing `NotesBoard` (spatial view) as an alternate view toggle — don't delete.
- Mobile: respect existing 44px touch targets and 100dvh layouts from memory.
- Design tokens only (per Flat-Minimal aesthetic in memory) — no hardcoded colors.

## Out of Scope (v1)

- Drag-and-drop reparenting of notebooks
- Real-time collaborative editing
- Version history for rich content
- Backlinks display changes (existing contextual backlinks remain)

## Open Questions

1. Should the rich-text format also apply to the existing **Catalyst** writer, or stay isolated to Cards/Notes? (Default: isolated.)
2. For sub-notebooks: max nesting depth? (Default: unlimited, but UI indents cap at 4 levels.)
3. Keep the spatial `NotesBoard` as a toggleable view alongside the new two-pane? (Default: yes.)
