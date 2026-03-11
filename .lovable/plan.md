

## Improve FAB Search Bar to Use Full Search Features

### Problem
The search bar in the FAB menu is a plain text input that only navigates to the `search` tab on Enter — it doesn't pass the typed query to the search page, so the user has to retype it. It also lacks AI search capabilities.

### Changes

**1. `src/components/MobileNavigation.tsx` — Pass query to search tab**
- Add an `onSearchWithQuery` callback prop (alongside existing `onTabChange`)
- Track the search input value in state
- On submit, call `onSearchWithQuery(query)` which will set the query AND switch to search tab
- Add the AI sparkle button next to the input for visual consistency with the main search bar

**2. `src/components/AppLayout.tsx` — Wire up the query passthrough**
- Add state for `pendingSearchQuery`
- Pass `onSearchWithQuery` to `MobileNavigation` that sets `pendingSearchQuery` and navigates to search tab
- Pass `pendingSearchQuery` down via outlet context so Index.tsx can consume it

**3. `src/pages/Index.tsx` — Consume the pending query**
- Read `pendingSearchQuery` from outlet context
- When it changes, set `currentQuery` to the pending value and auto-trigger the AI search
- Clear the pending query after consuming it

**4. `src/components/UnifiedSearchPage.tsx` — Auto-execute on mount with query**
- Add an `autoSearch` prop or detect when `currentQuery` changes from empty to non-empty
- When the component mounts with a pre-filled query on the Knowledge tab, automatically trigger the AI search

### Technical Details

```text
FAB Search Input → onSearchWithQuery(query) 
  → AppLayout sets pendingSearchQuery + navigates to "search" tab
    → Index.tsx reads pendingSearchQuery from context
      → Sets currentQuery → AISearchBar auto-executes
```

- The `MobileNavigation` input will also support quick-tap topic chips (e.g., recent searches) for faster re-searches
- The AISearchBar already has `autoFocus` and `key` re-mount logic; we'll extend it with an `initialQuery` prop that auto-triggers search on mount

### Files to edit
1. `src/components/MobileNavigation.tsx` — add query state, pass it on submit
2. `src/components/AppLayout.tsx` — add pendingSearchQuery state, wire to MobileNavigation + outlet context
3. `src/pages/Index.tsx` — consume pendingSearchQuery, auto-set currentQuery
4. `src/components/AISearchBar.tsx` — add `initialQuery` prop that auto-triggers search on mount

