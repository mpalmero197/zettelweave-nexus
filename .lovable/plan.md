

## Restore Learning Hub Functionality

### Problem
The previous "remove duplicate search bars" change went too far — it stripped the Learning Hub tabs of their self-contained search/discover UIs, leaving them as empty shells that say "go use the Search tab." The Learning Hub should be a standalone educational ecosystem with its own search capabilities.

### What needs to change

**1. `src/components/learning/LearningBooks.tsx`** — Restore search/discover view
- The component still has all the search logic (`searchBooks`, `results`, `query`, filters, etc.) but the render only shows the library view
- Re-add the search/library toggle buttons, the search form with language and access filters, popular search chips, and the search results grid with book cards
- All the code is already there — just the UI render section (lines 382-395) needs to be restored to show both views

**2. `src/components/learning/LearningCourses.tsx`** — Restore course search
- Re-add query state, search form, popular topic chips, and the `openClassCentral` function that opens Class Central in a new tab
- Add back the search/saved toggle so users can discover new courses AND manage saved ones

**3. `src/components/learning/LearningVideos.tsx`** — Restore video search
- Currently a 17-line placeholder. Rebuild with video search functionality using the `search-videos` edge function (same as `UnifiedSearchPage` uses)
- Include search input, popular topic chips, video result cards with thumbnails/provider badges, and external play links

### Scope
- Restore each Learning Hub tab as a fully functional, self-contained experience
- The UnifiedSearchPage keeps its own search capabilities separately — both can coexist
- ~3 files modified

