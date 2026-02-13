

# Sticky Notes Complete Overhaul

## Current Problems

- **Bland card design**: Generic Card/CardContent wrappers with flat background colors -- doesn't feel like actual sticky notes
- **No search or filtering**: Can't find anything if you have many notes
- **No sorting options**: Only pinned-first sorting, no date/alphabetical control
- **No quick-add**: Must click "Add Note" then type into a tiny card
- **Fixed small height (h-36)**: Notes are cramped with barely any writing space
- **Color cycling is clunky**: Must click the palette button repeatedly to cycle through colors
- **No categories or grouping**: All notes in one flat grid
- **Ugly empty state**: Just a Plus icon with plain text
- **No character/word count**: No sense of note size
- **Timestamp is absolute**: Shows full locale date string instead of relative time ("2d ago")

## The New Design

A premium sticky notes wall with glassmorphic cards that actually look and feel like sticky notes -- with a folded corner effect, subtle shadows, and smooth interactions.

### Key Features
1. **Quick-add bar** at the top with color picker chips -- type and press Enter to instantly create
2. **Search + Sort toolbar** -- filter by text, sort by Recent/Oldest/Alphabetical/Color
3. **View toggle** -- Grid (default, masonry-like) vs Compact List
4. **Redesigned note cards** with:
   - Glassmorphic styling (`bg-card/80 backdrop-blur-sm`) overlaid with the note color at low opacity
   - CSS folded corner effect (pseudo-element triangle in bottom-right)
   - 3px colored top border matching the note color
   - Auto-expanding textarea (no fixed height constraint)
   - Relative timestamps ("2d ago")
   - Inline color picker (row of small dots) on hover/focus
   - Pin indicator as a subtle badge, not a button cluttering the header
   - Single "..." menu for delete action (with confirmation)
   - Word count shown subtly in footer
5. **Beautiful empty state** with a large StickyNote icon and call-to-action
6. **Smooth animations** -- fade-in on create, scale on hover

## Technical Plan

### File: `src/components/StickyNotesSimple.tsx` (complete rewrite)

**State:**
- `notes: StickyNote[]` -- persisted to localStorage key `stickyNotes` (same key for backward compatibility)
- `searchQuery: string`
- `sortBy: 'recent' | 'oldest' | 'alpha' | 'color'`
- `viewMode: 'grid' | 'list'`
- `quickAddContent: string`
- `quickAddColor: string`
- `deleteConfirmId: string | null`

**StickyNote interface** (backward compatible):
- `id`, `content`, `color`, `timestamp` (keep existing)
- `alwaysOnTop` (keep existing)

**Layout:**
```text
+--------------------------------------------------+
| Sticky Notes                    [count] [+ Add]  |
+--------------------------------------------------+
| [Quick add input...] [color dots] [Enter to add] |
+--------------------------------------------------+
| [Search...] [Sort v] [Grid|List]                  |
+--------------------------------------------------+
| +--------+ +--------+ +--------+ +--------+      |
| | Note 1 | | Note 2 | | Note 3 | | Note 4 |      |
| |        | |        | |        | |        |      |
| | 2d ago | | 5h ago | | just   | | 1w ago |      |
| +--------+ +--------+ +--------+ +--------+      |
+--------------------------------------------------+
```

**Note card structure:**
- Colored top border (3px)
- Pin badge (top-left, only shown when pinned)
- "..." dropdown (top-right, visible on hover)
- Textarea (transparent, auto-height in list mode)
- Footer: relative date + word count + color dots on hover

**Dependencies:** Only existing packages -- `date-fns` for `formatDistanceToNowStrict`, `lucide-react` icons, existing UI components.

### File: `src/pages/Index.tsx`

No changes needed -- it already renders `<StickyNotesSimple />` in the stickynotes tab.

## Files Changed

| File | Action |
|------|--------|
| `src/components/StickyNotesSimple.tsx` | Complete rewrite with new design |

