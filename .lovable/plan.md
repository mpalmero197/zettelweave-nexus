

## Fix Course Links Not Working in Embed

### Problem
The AI generates "realistic" URLs for courses, but these are fabricated/hallucinated URLs that don't actually exist on the platforms. When embedded in an iframe, the pages return 404s. Additionally, most platforms (Coursera, edX, Udacity) block iframe embedding via `X-Frame-Options` headers, so even valid URLs won't render.

### Solution

Two changes:

**1. Edge function (`supabase/functions/search-courses/index.ts`)**: Update the system prompt to instruct the AI to generate **real, verified course URLs** rather than fabricated ones. However, since AI-generated URLs will still often be wrong, also add a fallback: instruct the AI to generate a **search URL** for the platform (e.g. `https://www.coursera.org/search?query=pilot`) as a secondary field, so there's always a working link.

**2. Frontend (`src/components/learning/LearningCourses.tsx`)**: Replace the iframe embed with opening the course URL in a **new browser tab** (`window.open`). Iframes are blocked by virtually all course platforms (Coursera, edX, Udacity, Khan Academy) via `X-Frame-Options: DENY/SAMEORIGIN`. The iframe approach will never work reliably.

### Specific Changes

**`supabase/functions/search-courses/index.ts`**:
- Update system prompt: "Generate real course URLs that actually exist. For the url field, provide the platform's search results page URL for the topic (e.g. `https://www.coursera.org/search?query=...`) so users always land on a working page with relevant results."
- Change the `url` field description to clarify it should be a search/browse URL on the platform

**`src/components/learning/LearningCourses.tsx`**:
- Remove the iframe-based `viewingCourse` state and embedded viewer entirely
- Change "View Course" / "Open Course" buttons to open `course.url` in a new tab via `window.open(course.url, '_blank')`
- Remove `viewingCourse` state variable and the early-return iframe block

