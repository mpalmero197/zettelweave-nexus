

## Direct Search Redirect to Class Central

### Approach
Instead of using AI or scraping to fetch and display course results within the app, simply redirect the user's search query directly to Class Central's search page in a new browser tab. This guarantees 100% accurate results with real links.

### Changes

**`src/components/learning/LearningCourses.tsx`**:
- Replace the `searchCourses` function: instead of calling the `search-courses` edge function, open `https://www.classcentral.com/search?q={query}` in a new tab
- Remove the results display grid, loading states, and syllabus expansion logic for search results
- Keep the saved courses library functionality intact (users can still manually save courses they find)
- Keep the popular topics chips but make them also trigger direct redirects
- Simplify the search UI: search bar + "Search on Class Central" button that opens a new tab
- Add a note like "Results open on Class Central" near the search bar so users know what to expect

**`supabase/functions/search-courses/index.ts`**:
- This edge function becomes unused. We can either delete it or leave it for now. I'll leave it since it has no cost when not called.

### What stays
- Saved courses library (view/manage previously saved courses)
- The save flow can still work if users manually enter course details or if we add a "Save from URL" feature later
- Popular topic chips (now redirect to Class Central search)

### UX Flow
1. User types "Pilot" in search bar
2. User clicks Search (or presses Enter)
3. New tab opens: `https://www.classcentral.com/search?q=Pilot`
4. User browses real Class Central results with real links

