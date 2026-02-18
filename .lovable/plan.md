
## Root Causes Found

### 1. Mind Map — Invisible Canvas (Zero Height)

The `TabsContent value="mindmap"` in `Index.tsx` (line 733) provides no height constraint, while the sibling `whiteboard` and `graph` tabs explicitly set `h-[calc(100vh-10rem)]` on their wrapper divs. The `MindMap` component renders as a React fragment (`<>...</>`) with two siblings: a toolbar `div` (fixed height) and a canvas `div` using `flex-1`. But `flex-1` only works when the parent is `display: flex` with a bounded height. Since neither `TabsContent` nor the `Suspense` boundary establishes that, the canvas collapses to **0px height** — making the entire mind map invisible.

**Fix:** Wrap the `<MindMap />` in `Index.tsx` inside a flex-column container with an explicit height (`h-[calc(100vh-10rem)]` to match the whiteboard/graph pattern), and ensure the MindMap root fragment's toolbar + canvas structure fits inside it.

Inside `MindMap.tsx` itself, the outermost `<>` fragment needs the toolbar to be `shrink-0` (already has this) and the canvas div to use `flex-1` (already uses this). The missing piece is that the **parent in Index.tsx must be `flex flex-col`** with a defined height.

### 2. Search — Not Visible / Hard to Reach

The search tab only shows `AISearchBar` when `activeTab === "search"`. The search bar is hidden from all other tabs. When the user goes to the Search tab, the page shows the search bar at the top, but only when results exist (`searchResults !== null`) does the `UnifiedSearchResults` component render. If there are no results yet, the user just sees an empty page with only "Use the search bar above" text.

The problem is that the **search bar renders in the sticky header but only when `activeTab === "search"`** (line 375). When navigating to search from another tab, there's nothing interactive until the user types. There is no indication of what to do. The UX problem is the search bar should be immediately focused and ready when the tab is activated.

Additionally, looking at Index.tsx line 375-401: the AISearchBar is inside a sticky div that is only rendered when `activeTab === "search"`. This means when the user clicks the search icon in the app header (AppLayout.tsx line 177), it does switch to search tab correctly, but the search input does not receive focus automatically.

**Fix:** Add `autoFocus` behavior so the search input is immediately focused when the user navigates to the search tab. This is achievable by passing a focus trigger to `AISearchBar` keyed off `activeTab`.

---

## Plan

### File 1: `src/pages/Index.tsx`

**Mind Map fix** — Add a flex-column height wrapper around the `<MindMap />` in the mindmap TabsContent, matching the pattern already used by whiteboard and graph:

```
// BEFORE (line 733-746):
<TabsContent value="mindmap" className="mt-0">
  <Suspense fallback={...}>
    <MindMap ... />
  </Suspense>
</TabsContent>

// AFTER:
<TabsContent value="mindmap" className="mt-0">
  <div className="h-[calc(100vh-10rem)] flex flex-col">
    <Suspense fallback={...}>
      <MindMap ... />
    </Suspense>
  </div>
</TabsContent>
```

**Search fix** — Pass a focus key to `AISearchBar` so it auto-focuses when the user navigates to the search tab:

```
// Add a useEffect or simply pass a key prop to force remount/focus:
<AISearchBar
  key={activeTab === "search" ? "search-active" : "search-inactive"}
  autoFocus={activeTab === "search"}
  ...
/>
```

### File 2: `src/components/AISearchBar.tsx`

Accept an `autoFocus` prop and apply it to the input element so search is immediately ready when the user opens the search tab.

### File 3: `src/components/MindMap.tsx`

Confirm the root structure is correct:
- The `<>` fragment root is fine as-is.
- The toolbar div has `shrink-0` — correct.
- The canvas div has `flex-1 relative overflow-hidden` — correct.
- These both work correctly **once the parent container is `flex flex-col` with a bounded height**, which is fixed in Index.tsx.

No changes needed in MindMap.tsx itself; the JSX structure is already correct.

---

## Technical Summary

| Issue | Root Cause | Fix Location |
|---|---|---|
| Mind map blank | Parent container has no height, `flex-1` on canvas has nothing to expand against | `src/pages/Index.tsx` line 733 |
| Search not focused | `AISearchBar` input doesn't auto-focus when tab activates | `src/pages/Index.tsx` + `src/components/AISearchBar.tsx` |

---

## Files Changed

1. **`src/pages/Index.tsx`** — Wrap mindmap TabsContent in `h-[calc(100vh-10rem)] flex flex-col` div; add `autoFocus` prop and unique key to `AISearchBar` when on search tab.
2. **`src/components/AISearchBar.tsx`** — Accept and apply `autoFocus` prop to the search input.
