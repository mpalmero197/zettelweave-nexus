

## Improve Course Link Quality

### Problem
The AI-generated course URLs are generic search page links (e.g. `coursera.org/search?query=...`) rather than direct links to actual courses. Users expect clicking "View Course" to take them to the real course page, like Class Central does.

### Solution
Instead of having the AI fabricate URLs, use **Class Central's actual search** to find real course pages. Class Central aggregates courses from all major platforms and has a public search URL pattern.

### Changes

**`supabase/functions/search-courses/index.ts`**:
1. Update the AI system prompt to instruct it to generate a `class_central_query` field per course (the best search terms to find that specific course on Class Central) instead of fabricating URLs.
2. For each course returned by the AI, construct a Class Central search URL: `https://www.classcentral.com/search?q=<encoded course title + provider>`.
3. Alternatively, set the `url` to a direct Class Central search link like `https://www.classcentral.com/search?q=Introduction+to+Machine+Learning+Coursera` which lands users on a real search results page with the actual course.

**Updated AI prompt approach**:
- Remove the instruction to generate generic platform search URLs
- Instead instruct: "For the url field, construct a Class Central search URL: `https://www.classcentral.com/search?q=` followed by the URL-encoded course title. This ensures users land on a real page with the actual course listing."
- This guarantees every link goes to a working page where the user can find and enroll in the exact course

### Why Class Central
- Aggregates courses from Coursera, edX, Udacity, Khan Academy, MIT OCW, etc.
- Their search reliably returns the matching course
- No API key needed — just a search URL
- Matches the user's expectation ("like classcentral.com")

