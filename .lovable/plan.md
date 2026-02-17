

# Mobile UI and Touch Usability Overhaul

## Overview

Improve mobile usability, touch interactions, and visual consistency across the entire application. The changes focus on three pillars: consistent touch-friendly spacing and tap targets, unified toolbar/action bar patterns across all tabs, and polished bottom navigation with swipe support. All changes are CSS/component-level -- no new dependencies, no heavy libraries.

## Current Problems

- **Dual bottom navigation**: Both `MobileNavigation` and `MobileBottomNav` exist but serve overlapping roles. `MobileNavigation` is rendered by `AppLayout` (only Home/Admin/Settings), while `MobileBottomNav` is defined but not used in the main layout. This creates confusion about which nav is active.
- **Logo bar in bottom nav takes vertical space**: `MobileBottomNav` has a logo/status row above the nav items -- redundant since the header already shows the logo.
- **Inconsistent action bar patterns**: Cards tab has a sticky toolbar, but Notes, Calendar, Files, StickyNotes, ScratchPad, and RecycleBin each implement their own ad-hoc header patterns with different spacing, heights, and button sizes.
- **Touch targets too small in some areas**: Many interactive elements (dropdown triggers, filter buttons, sort toggles) use `h-8 w-8` (32px) which is below the 44px WCAG recommendation on mobile.
- **No swipe navigation between tabs**: Users must tap the hamburger menu, find the section, and tap again. No gesture-based tab switching.
- **Cards grid not optimized for one-handed use**: Card action menus (edit, delete, link) require precise taps on small icons.
- **Sticky bars stack poorly**: On cards tab, the AppLayout header (44px) + cards toolbar stack to ~88px of fixed UI, leaving less content space on small screens.
- **Main content padding inconsistent**: `px-1.5 sm:px-2 md:px-3` varies across tabs vs the outer `main` tag.
- **Footer renders on mobile**: The `Footer` component at the bottom of Index.tsx adds unnecessary content below the bottom nav.

## Architecture Changes

### 1. Unify Bottom Navigation

Replace the current `MobileNavigation` (rendered in `AppLayout`) with an improved version that includes 5 core tabs (Home, Cards, Notes, Calendar, More) where "More" opens a sheet with remaining sections. Remove the unused `MobileBottomNav` logo bar. The bottom nav becomes the primary mobile navigation, replacing the hamburger menu for the most common actions.

Changes:
- **`MobileNavigation.tsx`**: Expand from 3 items (Home/Admin/Settings) to 5 items (Home, Cards, Notes, Calendar, More). The "More" button opens a sheet drawer listing all other sections. Remove the `MobileBottomNav` logo/status row pattern. Ensure all touch targets are 48px minimum. Use `active:scale-95` for tactile feedback.
- **`AppLayout.tsx`**: Pass `activeTab` and `handleTabChange` down to `MobileNavigation` so it can switch tabs within `/app`.

### 2. Consistent Mobile Action Bars

Create a shared `MobileActionBar` component that standardizes the sticky toolbar pattern used across tabs. Every tab gets a consistent header strip with: title (left), action buttons (right), all at 44px min height.

Changes:
- **New `src/components/MobileActionBar.tsx`** (~35 lines): A thin sticky bar with consistent height (`h-12`), padding, background (`bg-background/95 backdrop-blur-sm`), and border. Accepts `title`, `actions` (ReactNode slot), and optional `subtitle`.
- **Cards tab**: Already has a toolbar -- standardize its height and button sizes to use `MobileActionBar`.
- **Notes tab**: Add `MobileActionBar` with create/search/sort actions.
- **Calendar tab**: Add `MobileActionBar` with month navigation and create event button.
- **StickyNotes tab**: Add `MobileActionBar` with create/sort/view-toggle.
- **ScratchPad tab**: Add `MobileActionBar` with save/sync actions.
- **FileManager tab**: Add `MobileActionBar` with upload/search.
- **RecycleBin tab**: Add `MobileActionBar` with filter/restore-all.

### 3. Touch Target Improvements

Audit and fix all interactive elements on mobile to meet 44px minimum:

- All icon-only buttons on mobile: change from `h-8 w-8` to `h-10 w-10` (or use responsive classes `h-8 w-8 md:h-8 md:w-8` keeping desktop compact while mobile gets `h-10 w-10`).
- Card action menus: increase the "more" trigger area.
- Dropdown menu items: ensure `min-h-[44px]` on mobile via global CSS rule.
- Dialog close buttons: ensure 44px touch targets.

Changes:
- **`src/index.css`**: Add a mobile-specific rule for dropdown/menu items: `.mobile button, .mobile [role="menuitem"] { min-height: 44px; }`. Leverage the existing `.mobile` class applied by `MobileDetector`.
- **`ZettelCard.tsx`**: On mobile, make the entire card tappable (onClick opens viewer) instead of requiring the small edit button. Keep the "more" menu but enlarge its trigger.

### 4. Swipe Gesture Support

Add horizontal swipe to navigate between adjacent tabs on mobile using `react-swipeable` (already installed).

Changes:
- **`src/pages/Index.tsx`**: Wrap the `TabsContent` area with `useSwipeable` handlers. Define a tab order array. On swipe left -> next tab, swipe right -> previous tab. Only active on mobile (check `useIsMobile`). Add a subtle transition animation.

### 5. Reduce Vertical Space Waste on Mobile

- **AppLayout header**: Reduce from `h-11` to `h-10` on mobile for 4px savings.
- **Cards sticky toolbar**: Reduce top offset to account for thinner header.
- **Hide Footer on mobile**: The `Footer` component is unnecessary on mobile where the bottom nav occupies that space.
- **Bottom nav padding**: Ensure `pb-safe` accounts for the nav height precisely.

Changes:
- **`AppLayout.tsx`**: Change header to `h-10 md:h-11`.
- **`Index.tsx`**: Conditionally hide `<Footer />` on mobile, or add `hidden md:block` class.
- **`Index.tsx` main tag**: Standardize padding to `px-2 md:px-3` consistently.

### 6. Visual Consistency Polish

Apply uniform styling patterns across all tab content areas:

- **Section empty states**: Standardize the "no items" empty state pattern (icon + message + CTA) across Cards, Notes, Files, Calendar, StickyNotes, ScratchPad, RecycleBin.
- **Card/list item styling**: Ensure all list items (notes, files, events, sticky notes) use the same border-radius (`rounded-lg`), padding (`p-3`), and hover state (`hover:bg-accent/50`).
- **Loading skeletons**: Standardize skeleton patterns across tabs.

Changes are minor CSS class adjustments in each component -- no structural rewrites.

## File Changes

### New Files

1. **`src/components/MobileActionBar.tsx`** (~35 lines)
   Shared sticky action bar for mobile with consistent styling.

### Modified Files

2. **`src/components/MobileNavigation.tsx`** (moderate rewrite)
   - Expand to 5 tabs: Home, Cards, Notes, Calendar, More
   - "More" opens a Sheet with remaining sections
   - Accept `activeTab` and `onTabChange` props
   - Enlarge touch targets to 48px
   - Remove redundant logo/status (already in AppLayout header)

3. **`src/components/AppLayout.tsx`** (minor edit)
   - Pass `activeTab` and `handleTabChange` to `MobileNavigation`
   - Reduce header height on mobile: `h-10 md:h-11`

4. **`src/pages/Index.tsx`** (moderate edit)
   - Wrap tab content area with `useSwipeable` for gesture navigation
   - Hide `<Footer />` on mobile with `hidden md:block`
   - Standardize main padding
   - Add MobileActionBar to tabs that lack toolbars

5. **`src/components/ZettelCard.tsx`** (minor edit)
   - Make entire card tappable on mobile (calls `onEdit`)
   - Enlarge action menu trigger on mobile

6. **`src/components/Notes.tsx`** (minor edit)
   - Integrate MobileActionBar for consistent mobile header

7. **`src/components/Calendar.tsx`** (minor edit)
   - Integrate MobileActionBar for month navigation on mobile

8. **`src/components/StickyNotesSimple.tsx`** (minor edit)
   - Integrate MobileActionBar

9. **`src/components/ScratchPad.tsx`** (minor edit)
   - Integrate MobileActionBar

10. **`src/components/FileManager.tsx`** (minor edit)
    - Integrate MobileActionBar

11. **`src/components/RecycleBin.tsx`** (minor edit)
    - Integrate MobileActionBar

12. **`src/index.css`** (minor edit)
    - Add mobile-specific touch target rules using `.mobile` body class
    - Add dropdown/menu item minimum heights for mobile
    - Add swipe transition animation keyframe

13. **`src/components/MobileBottomNav.tsx`** (delete or deprecate)
    - No longer used -- functionality merged into `MobileNavigation`

## Technical Details

- **No new dependencies**: Uses existing `react-swipeable`, `@radix-ui/react-sheet`, `lucide-react`
- **Performance**: All changes are CSS-driven. No additional JS bundles. Swipe detection uses existing `react-swipeable` with minimal overhead.
- **Touch targets**: Follow WCAG 2.2 Target Size (Level AA) -- 44px minimum on mobile
- **Tab order for swipe**: `['dashboard', 'cards', 'notes', 'calendar', 'stickynotes', 'scratchpad', 'files', 'journal', 'habits', 'recorder', 'recycle']`
- **Swipe threshold**: 50px minimum delta, 200ms maximum time, to avoid accidental triggers during scrolling
- **Bottom nav height**: 56px + safe area inset, matching iOS/Android native patterns
- **Existing mobile class**: `MobileDetector` already adds `.mobile` to `body`, so CSS rules targeting `.mobile` work without JS changes

