## 1. Fix "duplicate error" when creating Zettel cards

**Root cause (likely):** In `src/hooks/useZettelCards.ts`, when a new card's auto-generated `number` collides with an existing row on the `(user_id, number)` unique index, the code retries once with `${cardNumber}-${Date.now().toString(36)}`. If that single retry also collides (or the fuzzy title-similarity duplicate check merges into a locked/missing card), the raw Postgres 23505 error surfaces to the toast. The near-duplicate merge branch (title similarity ≥ 0.95) can also block genuinely new cards that happen to share a short title.

**Fix (frontend only, contained to the create-card mutation):**
1. Replace the one-shot 23505 retry with a small loop that generates a guaranteed-unique number using `crypto.randomUUID().slice(0,8)` appended to the base number, retrying up to 3 times.
2. Loosen the similarity-based auto-merge:
   - Only auto-merge when title similarity ≥ 0.95 **and** content similarity ≥ 0.95 **and** the existing card is not empty.
   - If a would-be merge target is found, still allow creation of a fresh card and surface a non-blocking toast: "Similar card exists — created anyway. [View]".
3. Normalize error surface: on any unhandled `23505`, show a friendly toast "Number already used — please try again" instead of the raw Postgres string, and log details to console for debugging.
4. Add a console log of the full error object inside `onError` so future regressions are easier to diagnose.

No schema, RLS, or edge function changes.

## 2. YouTube + URL Q&A ("Watch & Ask")

A new surface where the user pastes a URL (YouTube video or article) and can watch/read it inline while chatting with ALICE about its contents.

### Sources supported
- YouTube URLs (watch, share, shorts) → embedded `youtube-nocookie` iframe + transcript fetched via a new edge function.
- Any other http(s) URL → article extraction via the existing `fetch-url-content` edge function.

### Where it lives
- **Dedicated page:** `/watch` — `src/pages/WatchAsk.tsx`. Two-column layout: left = player/reader, right = ALICE chat panel scoped to that URL. Added to desktop + mobile nav.
- **Inside ALICE:** `src/components/jarvis/JarvisChat.tsx` detects a pasted URL in the composer. If it looks like a YouTube URL or the user prefixes with "watch:", it renders an inline `UrlPreviewCard` with an "Open Watch & Ask" button that deep-links to `/watch?url=…&thread=<current-thread-id>` so the conversation continues.

### New edge function: `youtube-transcript`
- Input: `{ videoId }` (validated).
- Auth-required (`_shared/auth.ts`).
- Fetches `https://www.youtube.com/watch?v=<id>` server-side, extracts `ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer.captionTracks[0].baseUrl`, fetches the XML, converts to plain-text segments with timestamps.
- Returns `{ title, channel, duration, segments: [{ start, dur, text }], fullText }`.
- Fallback: if no captions are available, respond `{ hasTranscript: false }` and the UI shows a graceful "no captions available" state (no Whisper fallback in v1 to keep scope small).

### Client hook: `useWatchAsk`
- Given a URL, classifies as YouTube vs. article, fetches transcript or extracted markdown, caches in memory + `localStorage` by URL hash.
- Provides `askQuestion(question, currentTimeSeconds?)` that calls the existing `ai-assistant-chat` edge function with a system prompt built from title + transcript window (± 2 min around `currentTimeSeconds` when provided, plus a global summary chunk) or the article body (chunked and top-k selected).

### UI (`WatchAsk.tsx`)
- **Header:** URL input, "Load" button, source badge (YouTube / Article).
- **Left pane:**
  - YouTube: `<iframe>` with `enablejsapi=1` + `postMessage` polling of currentTime. A "Jump to timestamp" chip appears next to each ALICE answer citation like `[03:41]`, click to seek.
  - Article: sanitized markdown render with reading time + hostname.
- **Right pane:**
  - Chat thread with streaming answers (reuse `useKnowledgeChat`-style pattern already in the app).
  - Quick-action chips: "Summarize", "Key takeaways", "Ask about the current moment" (YouTube only), "Save summary as Zettel card".
  - "Save answer as Zettel card" per message.
- **Mobile:** stacks vertically — player on top (sticky), chat below.

### Routing / nav
- Add `/watch` route in `src/App.tsx` (lazy-loaded).
- Add "Watch & Ask" entry to desktop top-bar and mobile FAB grid.

### Data / persistence
- No new tables required for v1. Chat is transient per URL and saved on demand as a Zettel card (existing flow) or Note (existing flow).
- Reuses `ai-assistant-chat` (Lovable AI Gateway, gemini-3-flash) — no new secrets.

## Files touched

**Fix (1):**
- `src/hooks/useZettelCards.ts` — loop-based number collision retry, relaxed merge, friendlier error toast, error logging.

**Feature (2):**
- `supabase/functions/youtube-transcript/index.ts` (new) — CORS, auth-checked, transcript extraction.
- `src/hooks/useWatchAsk.ts` (new).
- `src/pages/WatchAsk.tsx` (new).
- `src/components/watch/YouTubePlayer.tsx` (new) — postMessage bridge for currentTime + seek.
- `src/components/watch/ArticleReader.tsx` (new).
- `src/components/watch/WatchChatPanel.tsx` (new).
- `src/components/jarvis/JarvisChat.tsx` — URL detection + "Open Watch & Ask" CTA.
- `src/App.tsx` — lazy route for `/watch`.
- Desktop + mobile nav components — add "Watch & Ask" link.

## Out of scope for this pass
- Whisper fallback for videos without captions.
- Persistent chat threads per URL (can be added later if you want history).
- Non-YouTube video embeds (Vimeo, direct MP4) — can extend the classifier later.