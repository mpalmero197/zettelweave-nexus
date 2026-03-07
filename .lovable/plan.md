

## Notes Scrollable Window & Mobile Optimization

### Current Issues
1. The main content area (`div.flex-1`) has `overflow-y-auto` but no fixed height constraint — it relies on `min-h-[calc(100vh-8rem)]` on the parent, which doesn't create a proper scroll container.
2. On mobile, the notebook chips, toolbar, quick-add bar, and note grid all compete for vertical space with no dedicated scroll region for just the notes.
3. The desktop notebook sidebar also lacks a height constraint for proper scrolling.

### Plan

**1. Create a proper scrollable layout**
- Set the outer flex container to a fixed height: `h-[calc(100dvh-<header offset>)]` instead of `min-h-[calc(100vh-8rem)]`, so it becomes a scroll boundary.
- The desktop sidebar already has `overflow-y-auto` — just needs the parent height constraint.
- The main content column: pin the toolbar/quick-add at the top, make only the notes grid/list area scroll via `overflow-y-auto` on a `flex-1 min-h-0` wrapper.

**2. Mobile optimizations**
- Reduce toolbar padding and gaps for tighter mobile layout.
- Stack the search bar full-width on mobile, move action buttons (sort, view, import, new) into a compact row below.
- Make notebook chips row sticky so it stays visible while scrolling notes.
- Increase touch targets on note cards (min 44px tap areas on action buttons).
- Use `grid-cols-1` for mobile note cards (already done) but reduce card padding slightly.
- On mobile, default to list view for better density and faster scanning.
- Ensure the notes scroll area accounts for the bottom navigation bar (add `pb-20` on mobile).

**3. Files to modify**
- `src/components/Notes.tsx` — All changes are in this single file:
  - Restructure the outer container to use fixed height with flex column layout
  - Wrap the notes grid/list in a dedicated scroll container with `flex-1 min-h-0 overflow-y-auto`
  - Add responsive classes for mobile toolbar layout
  - Add sticky positioning to notebook chips on mobile
  - Add bottom padding for mobile nav clearance

