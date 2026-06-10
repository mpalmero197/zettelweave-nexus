# Two-Pane Polish + Rich-Text Upgrade

Refine the existing Notes, ZettelCards, and Catalyst split layouts (keep the Gemini dark aesthetic — just tighter, cleaner, more legible) and upgrade the shared note editor with a proper rich-text toolset including highlights, colors, links, images, tables, and a slash command menu.

## 1. Shared two-pane shell

Create `src/components/workspace/TwoPaneShell.tsx` so Notes, Cards, and Catalyst share one consistent frame:

- Outer container: `rounded-xl border border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden shadow-[0_1px_0_hsl(var(--border)/0.4),0_20px_60px_-30px_hsl(var(--primary)/0.25)]`
- Sticky pane headers with `h-11` height, uppercase tracking-wider 11px labels, divider line below
- Resizable divider styled as a 1px hairline with a subtle 3-dot grab handle that fades in on hover
- Standard pane paddings: list pane `px-2 py-2`, detail pane `px-6 py-5` (responsive: `md:px-8 md:py-6`)
- Empty-state slot and loading skeleton baked in

Refactor `NotesWorkspace.tsx`, `CardsWorkspace.tsx`, and `CatalystSplitEditor.tsx` to render through this shell.

## 2. List pane polish (Notes + Cards)

- Replace dense buttons with airy 12px-radius rows: title (14px medium), 2-line preview (12px muted), bottom meta row with notebook chip + relative date ("2d ago")
- Active row: left 2px primary accent bar + `bg-primary/8` (not the full pastel wash that's there now)
- Hover: `bg-foreground/4` only — no full-bleed selection look
- Favorite star moves to a hover-revealed right-edge action with quick-actions (star, share, delete) instead of inline icons
- Search input: pill style, `h-9 rounded-full bg-muted/40` with leading icon, focus ring in primary
- Sticky section dividers when grouped by notebook/date

## 3. Reader pane polish

- Title: 28px (`text-2xl md:text-3xl`) Google Sans Text, tight tracking, generous 24px bottom margin
- Meta strip: small-caps notebook chip + relative date + tag pills, separated by a hairline below
- Content max-width `max-w-[68ch]` centered, line-height 1.7, paragraph spacing 1em
- Prose tokens: tuned dark prose (h2/h3 with subtle primary underline accent, blockquote with left primary bar, inline code in `bg-muted/60`)
- Mark/highlight rendered with `bg-yellow-400/25 text-foreground rounded px-0.5`
- Floating "Edit" button replaces the header button — bottom-right pill with backdrop blur
- Reading progress bar across top of reader pane (1px primary)

## 4. Card detail pane

- Magazine-style: category color as 4px top border + matching small-caps eyebrow label
- Title, then summary, then body, then linked-cards strip at bottom
- Same prose tokens as Notes

## 5. Rich-text editor upgrade (`RichTextEditor.tsx`)

Add TipTap extensions:
- `@tiptap/extension-highlight` (multicolor) → highlighter button with 6 swatches (yellow/green/blue/pink/purple/orange) + clear
- `@tiptap/extension-color` + `@tiptap/extension-text-style` → text color picker (same swatches + default)
- `@tiptap/extension-link` → link button with inline URL popover, auto-linkify on paste
- `@tiptap/extension-image` → image insert (URL or paste/drag upload to Supabase storage `note-images` bucket)
- `@tiptap/extension-table` + `Row`/`Cell`/`Header` → insert table button (3x3 default) with row/col context menu
- `@tiptap/extension-code-block-lowlight` with `lowlight` for syntax-highlighted code blocks
- `@tiptap/extension-horizontal-rule`, `@tiptap/extension-typography` (smart quotes/dashes)

### Toolbar redesign
Grouped, scrollable on mobile:
1. Undo/Redo
2. Headings dropdown (H1/H2/H3/Paragraph)
3. Bold, Italic, Underline, Strike, Inline code
4. **Highlight popover** (6 colors + remove)
5. **Text color popover** (6 colors + default)
6. Bulleted, Numbered, Task list
7. Quote, Code block, Horizontal rule
8. Link, Image, Table

Dividers between groups, all buttons `h-8 w-8`, active state uses `bg-primary/15 text-primary`.

### Slash command menu
New `SlashCommand.tsx` extension using TipTap Suggestion API. Typing `/` on empty line opens a floating command palette (`Popover` + `Command` from shadcn) with: Heading 1/2/3, Bulleted/Numbered/Task list, Quote, Code, Divider, Image, Table, Link. Arrow keys + Enter to insert.

### Bubble menu
`@tiptap/extension-bubble-menu` on text selection: Bold / Italic / Underline / Highlight / Link — quick formatting without traveling to the toolbar.

## 6. Image upload backend

Add Supabase storage bucket `note-images` (public read, authenticated write) and a tiny `uploadNoteImage(file)` helper in `src/utils/imageUpload.ts` that returns the public URL for the Image extension's drop/paste handler.

## 7. Catalyst split editor

- Apply shared TwoPaneShell with new headers
- Reference pane gains a small toolbar: "Sync with editor" toggle (live mirror vs. frozen snapshot) + zoom in/out for font size
- Same prose tokens used in Notes reader

## Files to add
- `src/components/workspace/TwoPaneShell.tsx`
- `src/components/workspace/editor/SlashCommand.tsx`
- `src/components/workspace/editor/HighlightPopover.tsx`
- `src/components/workspace/editor/ColorPopover.tsx`
- `src/components/workspace/editor/LinkPopover.tsx`
- `src/components/workspace/editor/TablePopover.tsx`
- `src/utils/imageUpload.ts`
- Supabase migration: `note-images` storage bucket + RLS

## Files to modify
- `src/components/workspace/RichTextEditor.tsx` (toolbar + extensions + bubble menu + slash)
- `src/components/workspaces/NotesWorkspace.tsx` (use shell, new row/reader styling)
- `src/components/workspaces/CardsWorkspace.tsx` (use shell, new card detail)
- `src/components/NotesSplitView.tsx` (use shell + new prose tokens)
- `src/components/catalyst/CatalystSplitEditor.tsx` (use shell, reference toolbar)
- `src/index.css` (tuned `.prose` dark tokens, highlight mark styling)

## Dependencies
```
@tiptap/extension-highlight @tiptap/extension-color @tiptap/extension-text-style
@tiptap/extension-link @tiptap/extension-image @tiptap/extension-table
@tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header
@tiptap/extension-code-block-lowlight @tiptap/extension-horizontal-rule
@tiptap/extension-typography @tiptap/extension-bubble-menu @tiptap/suggestion
lowlight
```

## Out of scope
- Real-time collaborative cursors
- Comments / suggestions mode
- Versioning UI changes
