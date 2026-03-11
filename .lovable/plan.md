

## Unified Search Entry Point

### What changes
The search button (header on desktop, FAB menu on mobile) opens a single search page with sub-tabs for each search domain. Each tab keeps its own search logic but shares the query typed at the top.

### Changes

**`src/pages/Index.tsx`**
- In the `search` tab content, replace the current layout with a tabbed interface containing:
  - **Knowledge** tab — existing AI search (cards, notes, sticky notes, web results) using `AISearchBar` + `UnifiedSearchResults`
  - **Courses** tab — Class Central redirect (reuse `openClassCentral` logic from `LearningCourses`)
  - **Videos** tab — Firecrawl video search (reuse `search-videos` edge function logic from `LearningVideos`)
  - **Books** tab — Open Library search (reuse logic from `LearningBooks`)
- A single search input at the top that populates the query for the active sub-tab
- When the user switches sub-tabs, the current query carries over
- The search bar + sub-tab strip is sticky below the header

**`src/components/LearningHub.tsx`**
- Remove the search bars from the Courses, Videos, and Books tabs (keep only the saved/library views and topic maps)
- Add a note/link in each Learning Hub tab saying "Use the main Search to find courses/videos/books"
- Keep Topic Maps tab as-is (it's AI-generated, not a search feature)

**`src/components/learning/LearningCourses.tsx`**
- Remove the search UI (search bar, popular topics for search). Keep only the "My Courses" saved library view.

**`src/components/learning/LearningVideos.tsx`**
- Extract the video search + results rendering into a new exportable component `VideoSearchResults` that accepts a `query` prop
- Keep the standalone component working for the Learning Hub but remove its own search bar
- OR: simpler approach — just import and reuse the search logic in Index.tsx's search tab

**`src/components/learning/LearningBooks.tsx`**
- Same pattern: extract or make the search callable from outside, remove the standalone search bar from Learning Hub

### Simpler approach (recommended)
Rather than heavy refactoring of Learning components, create a new **`src/components/UnifiedSearchPage.tsx`** that:
1. Has a single search input at top
2. Has sub-tabs: Knowledge | Courses | Videos | Books
3. **Knowledge**: passes query to existing `AISearchBar` logic
4. **Courses**: shows popular topics + search button that opens Class Central in new tab
5. **Videos**: calls `search-videos` edge function inline and displays video cards (copy the rendering logic from `LearningVideos`)
6. **Books**: calls Open Library API inline and displays book cards (copy the rendering logic from `LearningBooks`)
7. All tabs share the same query state

Then in `Index.tsx`, replace the search tab content with `<UnifiedSearchPage />`.

Learning Hub keeps its existing search UIs for users who navigate there directly — no breaking changes.

### Header/Menu
- Search button in header (desktop) and search bar in FAB menu (mobile) both navigate to `search` tab — this already works, no changes needed
- Remove the Search icon from the header since it's already accessible via the menu — actually, keep it for quick access on desktop per current behavior

### Files to create/edit
1. **Create** `src/components/UnifiedSearchPage.tsx` — unified search with sub-tabs
2. **Edit** `src/pages/Index.tsx` — replace search tab content with `<UnifiedSearchPage />`

