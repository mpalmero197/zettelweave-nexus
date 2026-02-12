

# Cards Section Complete Overhaul

## Current Problems

### ZettelCard Component
- **Button overload**: Each card shows 5-6 buttons in the header (Favorite, Edit, Link, Color Palette, Actions Menu) creating visual clutter
- **Oversized titles**: `text-xl md:text-2xl` titles dominate the card, wasting space
- **Dictionary word-hover wrapping**: Every word gets wrapped in a span with hover handlers -- heavy DOM and unnecessary by default
- **"New" badge with animate-pulse**: Distracting perpetual animation
- **Color system via full background fills**: Colored cards (blue, green, etc.) override the entire card background making text hard to read
- **Redundant metadata**: Category badge, Dewey number badge, detailed classification text, date, and link count all compete for attention

### Cards Tab Layout (Index.tsx)
- **Cluttered toolbar**: 10+ buttons crammed into a sticky bar (Create, Import, Vault Import, PDF, Print, Organization Method, New Filter, AI, Smart Links, Delete All)
- **Favorites duplicated**: Favorite cards shown in a separate section AND in the main grid -- redundant
- **No sorting or view options**: Only a grid view with no way to sort by date, title, category, or switch to list/compact view
- **No inline search**: Must use the global AI search bar on a different tab to filter cards

### CardViewer (Detail View)
- Already decent but disconnected from the card list experience

### EditCardDialog
- Functional but visually plain -- standard form layout with no visual hierarchy

## The New Vision

A clean, modern card collection with a streamlined toolbar, compact but beautiful card tiles, inline search/sort, and a refined card design that puts content first.

## Technical Plan

### 1. Redesign ZettelCard Component
**File: `src/components/ZettelCard.tsx`** (rewrite)

- **Slim card design**: Remove the oversized title (`text-xl md:text-2xl` -> `text-sm font-semibold`), tighten padding
- **Category color as a subtle top border**: Replace full-background color fills with a thin `border-top: 3px solid` using the category color. Keep the card background neutral (`bg-card`)
- **Hide buttons by default**: Only show a single "..." menu button on hover (or always on mobile). Move Favorite, Edit, Link, Color into the dropdown. Star icon shown inline only when favorited
- **Remove word-hover wrapping**: Drop the `renderContentWithHoverWords` function entirely -- it wraps every word in a span, bloating the DOM. Dictionary can be triggered via selection or right-click instead
- **Content preview**: Show 2-3 lines of content with `line-clamp-3` in smaller text
- **Compact metadata footer**: Single line with category dot, number, and relative date ("2d ago")
- **Tags inline**: Show max 2 tags as tiny pills, "+N more" for overflow
- **Remove "New" badge animation**: Show a small dot indicator instead of a pulsing badge

### 2. Streamline the Cards Toolbar
**File: `src/pages/Index.tsx`** (cards tab section)

- **Primary actions only**: Keep Create (+) button prominent. Group Import, Export, Print, Organization Method, Delete All into a single "More" dropdown
- **Add inline search**: Add a compact search input directly in the cards toolbar that filters cards by title/content/tags in real-time (no need for the global AI search tab)
- **Add sort control**: Dropdown to sort by: Recently Modified (default), Recently Created, Alphabetical, Category
- **Add view toggle**: Grid (default) vs Compact List view
- **Remove separate Favorites section**: Instead, allow sorting by "Favorites first" or show a small star filter toggle

### 3. Add Compact List View
**File: `src/components/ZettelCard.tsx`** (add variant prop)

- Add a `variant="compact"` mode that renders the card as a single-row list item:
  - Category color dot | Title | Tags (max 2) | Date | Star icon | "..." menu
  - No content preview, no description -- just the essentials
- Controlled by the view toggle in the toolbar

### 4. Polish the Card Grid
**File: `src/pages/Index.tsx`** (cards tab)

- **Consistent card heights**: Use `grid-auto-rows: minmax(0, auto)` so cards don't stretch unevenly in the masonry
- **Better empty state**: Warmer empty state with a subtle illustration prompt and clear CTA
- **Smooth transitions**: `animate-fade-in` on cards appearing, no jarring layout shifts
- **Card count indicator**: Show "42 cards" in the toolbar area

### 5. Visual Polish
- Cards use `widget-card` glassmorphic style from `grid-layout.css` for consistency with Calendar/Dashboard
- Hover state: subtle shadow lift (`hover:shadow-md`) without the current aggressive `-translate-y-1`
- Category colors shown as small colored dots or thin top borders, not full card backgrounds
- Responsive: 1 column on mobile, 2 on tablet, 3 on desktop, 4 on wide screens (same as current but with better card sizing)

## Files Changed

| File | Action |
|------|--------|
| `src/components/ZettelCard.tsx` | Rewrite -- slim design, hidden actions, no word-hover wrapping, compact variant |
| `src/pages/Index.tsx` | Update cards tab -- streamlined toolbar, inline search, sort, view toggle, remove favorites duplication |

## What This Achieves

- **Cleaner cards** that put content first instead of buttons and badges
- **Streamlined toolbar** with only essential actions visible
- **Inline search and sort** so users can find cards without switching tabs
- **Grid and list views** for different browsing preferences
- **Better performance** by removing per-word DOM wrapping and reducing button count per card
- **Visual consistency** with the Calendar and Dashboard overhauls using the same glassmorphic widget style

