

## Fix Course Search: Real Class Central Results with Working Links

### Problem
The LLM fabricates course titles (e.g., "Introduction to Flight and Pilot Training") and URL slugs that don't exist on Class Central, causing links to resolve to completely wrong courses. For "pilot," the real top results are "Private Pilot Ground School" (MIT OCW) and "A Beginner's Guide to Becoming a Private Pilot" (Udemy) -- not what the AI returns.

### Root Cause
An LLM cannot reliably know Class Central's exact URL slugs. It guesses slugs like `coursera-introduction-to-flight` which may resolve to a different course entirely.

### Solution
Two changes to `supabase/functions/search-courses/index.ts`:

1. **Always use search-based URLs**: Every course URL will be `https://www.classcentral.com/search?q=<exact course title>` instead of fabricated slug URLs. This guarantees the link takes users to a Class Central page showing the actual course. Remove the instruction about `{platform}-{slug}` format entirely.

2. **Ground the prompt with real data**: Use Firecrawl (already connected) to fetch the actual Class Central search page for the query, then pass that raw data to the LLM to structure it -- rather than asking the LLM to guess what's on Class Central. This two-step approach:
   - Step 1: Fetch `https://www.classcentral.com/search?q={query}` via Firecrawl to get the real course listings as markdown
   - Step 2: Pass the scraped markdown to the LLM and ask it to extract/structure the course data into the expected JSON format
   - This ensures course titles, providers, descriptions, and ratings are real

### Why This Works
- The LLM is no longer inventing courses -- it's parsing real Class Central data
- URLs use search links that always resolve to valid pages showing the correct course
- Results match what users see on classcentral.com because they come from classcentral.com

### Technical Details
- Firecrawl API key is already configured as a secret
- The edge function will first call Firecrawl's scrape endpoint, then use the LLM to parse the markdown into structured `CourseResult` objects
- Fallback: if Firecrawl fails, fall back to the current LLM-only approach with search URLs

