
## Problem

The mobile bottom navigation bar (fixed, ~64px + safe-area inset) overlaps content at the bottom of every window. Two categories of windows need fixing:

**Category A — Scrollable content (most tabs)**
The `<main>` tag in `Index.tsx` has `pb-20` (80px) on mobile. But there is also a conflicting CSS rule in `index.css` that applies `padding-bottom: calc(env(safe-area-inset-bottom) + 72px)` to `[role="main"]`. These two rules fight each other — whichever CSS specificity wins leaves a gap that either clips content or shows empty space. The fix is to remove the conflicting CSS rule and set a single, reliable bottom padding on the `<main>` tag itself using a CSS variable for the nav height.

**Category B — Fixed-height canvas tabs (graph, whiteboard, mind map)**
These tabs use `h-[calc(100vh-10rem)]` which does not account for the mobile bottom nav. On mobile, the bottom of the canvas is hidden under the nav bar. The fix is to use a mobile-specific height that subtracts the nav height: `h-[calc(100vh-10rem)] md:h-[calc(100vh-10rem)]` becomes `h-[calc(100vh-10rem-4rem)] md:h-[calc(100vh-10rem)]` (4rem = 64px nav).

**Category C — Other fixed-height components**
- `CollabStudio` (`h-[calc(100vh-8rem)]`) clips under the nav on mobile.
- `RightSidebar` (`h-[calc(100vh-4rem)] top-16 fixed`) overlaps the nav.
- `Notes` (`min-h-[calc(100vh-8rem)]`) — less critical as it scrolls, but the minimum height is too tall.

---

## The Correct Approach

Rather than patching every pixel value individually, the cleanest solution is to define a CSS custom property `--bottom-nav-height` on the `body` (set to `0px` on desktop, `64px` on mobile) and use it in `calc()` expressions everywhere. This is a single source of truth.

However, since the bottom nav is `md:hidden`, the simpler and more maintainable approach is to use **Tailwind responsive prefixes** directly in each affected spot.

---

## Files to Change

### 1. `src/index.css`

**Remove the conflicting `padding-bottom` rule** on `main, .main-content, [role="main"]` inside the `@media (max-width: 767px)` block (lines 379-381). This rule conflicts with the Tailwind `pb-20` class on `<main>` in `Index.tsx` and causes unpredictable behavior.

**Add a CSS custom property** for the bottom nav height so full-height canvas components can reference it:

```css
:root {
  --bottom-nav-h: 0px;
}

@media (max-width: 767px) {
  :root {
    --bottom-nav-h: 4rem; /* 64px — matches button min-h-[48px] + padding */
  }
}
```

### 2. `src/pages/Index.tsx`

**Main tag padding** — The current `pb-20` (80px) on mobile is slightly over-compensating. Replace it with `pb-[calc(4rem+env(safe-area-inset-bottom,0px))]` on mobile so it exactly tracks the nav height plus any device safe-area:

```tsx
// BEFORE:
<main ... className="pb-20 md:pb-2 ...">

// AFTER:
<main ... className="pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-2 ...">
```

**Graph tab** (line 698) — Add mobile adjustment:
```tsx
// BEFORE:
<div className="h-[calc(100vh-10rem)]">

// AFTER:
<div className="h-[calc(100vh-10rem-4rem)] md:h-[calc(100vh-10rem)]">
```

**Whiteboard tab** (line 719) — Same fix:
```tsx
// BEFORE:
<div className="h-[calc(100vh-10rem)]">

// AFTER:
<div className="h-[calc(100vh-10rem-4rem)] md:h-[calc(100vh-10rem)]">
```

**Mind map tab** (line 736) — Same fix:
```tsx
// BEFORE:
<div className="h-[calc(100vh-10rem)] flex flex-col">

// AFTER:
<div className="h-[calc(100vh-10rem-4rem)] md:h-[calc(100vh-10rem)] flex flex-col">
```

### 3. `src/components/friends/CollabStudio.tsx`

**CollabStudio** uses `h-[calc(100vh-8rem)]`. On mobile this runs behind the nav:

```tsx
// BEFORE:
'h-[calc(100vh-8rem)] overflow-hidden rounded-lg border border-border/50'

// AFTER:
'h-[calc(100vh-8rem-4rem)] md:h-[calc(100vh-8rem)] overflow-hidden rounded-lg border border-border/50'
```

### 4. `src/components/MobileNavigation.tsx`

The nav already uses `pb-safe` for the iOS safe-area inset at the bottom. No changes needed here. The nav's rendered height is:
- Buttons: `min-h-[48px]` + `py-1.5` (6px top + 6px bottom) = ~60px
- Plus `pb-safe` for notched phones

The `4rem` (64px) chosen for all `calc()` expressions safely covers the nav without `pb-safe`, which adds on top for notched phones (the `env(safe-area-inset-bottom,0px)` fallback handles this).

---

## Summary Table

| File | Change | Reason |
|---|---|---|
| `src/index.css` | Remove conflicting `padding-bottom` on `[role="main"]`; add `--bottom-nav-h` var | Single source of truth for nav height |
| `src/pages/Index.tsx` — `<main>` | `pb-20` → `pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-2` | Precise clearance |
| `src/pages/Index.tsx` — graph div | Add `md:` prefix to restore desktop height | Nav overlap on mobile |
| `src/pages/Index.tsx` — whiteboard div | Add `md:` prefix to restore desktop height | Nav overlap on mobile |
| `src/pages/Index.tsx` — mindmap div | Add `md:` prefix to restore desktop height | Nav overlap on mobile |
| `src/components/friends/CollabStudio.tsx` | Same responsive height pattern | Nav overlap on mobile |
