

## Add Videos Section to Learning Hub

### Overview
Add a "Videos" tab to the Learning Hub that searches for educational videos across YouTube, Odysee (LBRY), and other open-source video platforms. Results display thumbnails, titles, channel names, and durations. Clicking opens the video in a new tab.

### Approach
Use **Firecrawl search** (already connected) via a new edge function to search for educational videos across platforms. The edge function searches queries like `site:youtube.com OR site:odysee.com "{topic}" tutorial`, then extracts video metadata. Thumbnails are generated from video IDs:
- **YouTube**: `https://img.youtube.com/vi/{VIDEO_ID}/mqdefault.jpg` (publicly available, no API key needed)
- **Odysee/LBRY**: Thumbnail URL extracted from Firecrawl results metadata

### Files to Create/Edit

**1. `supabase/functions/search-videos/index.ts`** (new)
- Edge function that uses Firecrawl search to find video results
- Searches with site filters for YouTube, Odysee, and open educational video sites (e.g., Khan Academy, CuriosityStream, PeerTube instances)
- Parses URLs to extract video IDs for thumbnail generation
- Returns structured results: title, url, thumbnail, provider, channel, description

**2. `src/components/learning/LearningVideos.tsx`** (new)
- Search bar + popular topic chips (same pattern as LearningCourses)
- Results grid showing video cards with:
  - Thumbnail image (aspect-ratio 16:9)
  - Provider badge (YouTube, Odysee, etc.)
  - Title, channel name, description snippet
  - "Watch" button opening video in new tab
- Loading and empty states

**3. `src/components/LearningHub.tsx`** (edit)
- Add 4th tab "Videos" with `Video` icon from lucide-react
- Update grid-cols-3 to grid-cols-4
- Update subtitle text to mention videos

**4. `supabase/config.toml`** (edit)
- Add `[functions.search-videos]` with `verify_jwt = false`

### Video Card Layout
Each result card shows:
- 16:9 thumbnail at top (with provider badge overlay in corner)
- Title (line-clamp-2)
- Channel/source name in muted text
- Short description (line-clamp-2)
- "Watch" button that opens in new tab

### Fallback
If Firecrawl fails or returns no results, show a message suggesting the user search directly on YouTube/Odysee with quick-link buttons (same pattern as the courses redirect).

