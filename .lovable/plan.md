

# Notes and Notebooks Complete Overhaul

## Current Problems

### Notes Component
- **Button clutter on each card**: 4 action buttons (Favorite, Edit, Similar, Delete) shown on hover, crowding the card header
- **Generic Card wrappers**: Heavy `Card > CardContent` nesting with excessive padding
- **No sorting options**: Can only filter by notebook and favorites, no way to sort by date, title, or alphabetically
- **Full dialog for creation**: Must open a heavyweight dialog just to create a simple note -- no quick-add option
- **No view toggle**: Grid-only view, no list/compact option
- **Disconnected from Notebooks**: Notebook filter is a dropdown buried in the toolbar -- no visual connection to the notebook concept

### Notebooks Component
- **N+1 query problem**: Fires separate queries for notes AND cards for EVERY notebook on load -- extremely slow with many notebooks
- **Oversized notebook icons**: 48x48 rounded squares with BookOpen icons waste space
- **Collapsible content is awkward**: Expanding a notebook inside a grid card stretches the layout and pushes other cards around
- **Actions hidden behind hover**: Favorite, Edit, Delete all invisible until hover -- unusable on mobile
- **No way to open/browse a notebook**: Clicking a notebook doesn't navigate to its contents -- you can only expand to see 5 items

### EditNoteDialog
- Already solid with markdown toolbar and preview -- keep mostly as-is

## The New Vision

Merge Notes and Notebooks into a unified, cohesive experience. Notebooks become a sidebar/filter panel, and notes are the main content area. One view, not two separate tabs.

## Technical Plan

### 1. Unify Notes and Notebooks into a Single Component
**File: `src/components/Notes.tsx`** (rewrite)

Instead of two separate tabs, create a single "Notes" view with:
- **Left sidebar (desktop) / Top chips (mobile)**: Notebook list as compact clickable items with color dots and note counts. "All Notes" at the top, then each notebook, then "Uncategorized"
- **Main area**: Note cards grid/list with the selected notebook's notes
- **This eliminates the need for the separate Notebooks tab** -- notebook management (create, edit, delete) happens via a small "+" button and context menu in the sidebar

### 2. Redesign the Notebook Sidebar
Built into the Notes component:
- Compact list of notebooks: color dot, name, count -- one line each
- Selected notebook highlighted with subtle background
- "All Notes" shows everything, clicking a notebook filters to it
- Small "+" icon to create a new notebook inline (just name + color picker, no dialog)
- Right-click or "..." menu on each notebook for Edit, Delete, Favorite
- On mobile: horizontal scrollable chip bar at the top instead of a sidebar

### 3. Slim Down Note Cards
Replace heavy Card wrappers with lightweight `widget-card` glassmorphic tiles:
- Thin colored left border (3px) matching the notebook color instead of a colored dot
- `text-sm font-medium` title (not `text-lg font-semibold`)
- 2-3 lines of content preview with `line-clamp-3`
- Tags as tiny inline pills (max 2 shown)
- Footer: relative date ("2d ago") only
- Single "..." dropdown on hover for all actions (Favorite, Edit, Find Similar, Delete)
- Favorited star shown inline when active

### 4. Add Quick-Add Note
- Persistent slim input bar at the top of the notes area: "Quick note..." text field
- Press Enter to create a note with just a title (assigned to currently selected notebook)
- Small expand icon to open the full creation dialog for content/tags

### 5. Add Sort and View Controls
- Sort dropdown: Recently Modified (default), Recently Created, Alphabetical, Favorites First
- View toggle: Grid (default) vs Compact List
- Note count indicator: "24 notes"

### 6. Optimize Data Fetching
- Fetch all notes in one query (already done in Notes)
- Fetch all notebooks in one query with note counts using a single aggregated query instead of N+1
- Filter client-side by notebook selection

### 7. Update Index.tsx
- Remove the separate "notebooks" tab
- The "notes" tab now contains the unified Notes + Notebooks experience
- Update any navigation references

### 8. Keep EditNoteDialog
- No changes needed -- it's already well-built with markdown support

## Files Changed

| File | Action |
|------|--------|
| `src/components/Notes.tsx` | Rewrite -- unified notebook sidebar + notes grid, quick-add, sort, view toggle, slim cards |
| `src/components/Notebooks.tsx` | Keep file but it will no longer be used as a standalone tab (remove from Index.tsx tab) |
| `src/pages/Index.tsx` | Remove "notebooks" tab, keep "notes" tab with unified component |

## What This Achieves

- **One cohesive view** instead of two disconnected tabs
- **Notebooks as navigation** instead of a separate management screen
- **Slimmer, faster note cards** with less DOM and cleaner design
- **Quick-add** for rapid note capture without opening dialogs
- **Sort and view controls** for flexible browsing
- **Better performance** by eliminating N+1 notebook queries
- **Mobile-friendly** notebook chips instead of a hidden sidebar
- **Visual consistency** with the Cards and Calendar overhauls using the same glassmorphic widget style

