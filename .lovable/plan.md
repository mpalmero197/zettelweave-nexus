## Goal

Make the PendragonX browser extension's right-click menu a real productivity hub: route selections to the best destination by length, add Save-as-PDF, and ship a small but useful set of additional capture/lookup tools.

## New context menu structure

Right-click → **PendragonX** submenu shows items based on what's clicked (page / selection / link / image):

**Selection items (visible only when text is selected):**
1. **Save selection** (smart) — auto-routes by length:
   - `< 500` chars → **Scratchpad note** (fast jot, no AI)
   - `500–1500` chars → **ZettelCard** (via `summarize-page-to-card` so it gets title + tags + Dewey category)
   - `> 1500` chars → **Note** in the user's Notes (full markdown with source citation footer)
   - Toast confirms which destination was used, e.g. "✓ Saved to Cards (842 chars)"
2. **Save selection as… ▸** explicit override submenu: Scratchpad / Card / Note / Task — for when the user disagrees with the auto-route
3. **Define selection** — looks up the highlighted term via the existing `dictionary-lookup` edge function and shows result in the toast
4. **Translate selection to English** — quick `ai-modify-content` call with a translate prompt, result copied to clipboard + toast

**Page items (always visible):**
5. **Summarize page to card** (existing — keep)
6. **Save page as PDF** — injects `window.print()` into the active tab so Chrome's native "Save as PDF" dialog opens with the rendered page. Zero server cost, works on any site, user picks where to save. (Server-side PDF rendering rejected for v1 — slower, breaks paywalled/auth'd pages, costs tokens.)
7. **Save page as Note** — sends extracted readable text (same extractor used for summarize) straight into Notes as full markdown, no AI summarization. Useful for archiving full articles.
8. **Save page as read-later task** — creates a task with title = page title, description = URL, due = none. Wires into the existing task system.
9. **Send page to ALICE** — opens side panel with the page URL + title prefilled as a chat seed so the user can ask questions about it.

**Link items (right-click on an `<a>`):**
10. **Save link as read-later task** — same as #8 but uses `info.linkUrl` instead of the current page.
11. **Summarize linked page** — fetches the linked URL server-side via `fetch-url-content` then runs summarize.

**Image items (right-click on an image):**
12. **Save image as card** (existing — keep)
13. **Save image to Files** — uploads via signed Supabase storage URL to the user's `files` bucket.

**Footer (always):**
- Open Toolbox side panel (existing)
- Open PendragonX app (existing)

## Auth & error UX

- All actions go through the existing `ensureFreshSession` flow.
- When unauthenticated, toast: **"Sign in to PendragonX, then retry"** with a one-tap "Open app" action on the Chrome notification fallback.
- All failures show the actual server error (already done for scratchpad/card paths).

## Settings (in popup.html)

Add a "Context menu" section with toggles so power users can hide items they don't want:
- Smart save (master switch)
- Save as PDF
- Translate / Define
- Send to ALICE

Stored in `chrome.storage.local` under `pendragonx_menu_prefs`; `registerContextMenus()` reads it and skips disabled items.

## Technical details

- **Files touched:** `extension/background.js`, `extension/popup.html`, `extension/popup.js`, `extension/manifest.json` (bump version + add `downloads` permission only if we end up server-rendering PDFs — not needed for window.print path), and mirror all changes into `public/chrome-extension/*`. Repack `public/pendragonx-toolbox.zip` and `public/pendragonx-chrome-extension.zip`.
- **Smart routing logic** lives in one helper `routeSelection(text, tab, token)` that picks endpoint and posts. Length thresholds are constants at top of file so they're easy to tune.
- **Notes insert** uses `POST /rest/v1/notes` (same pattern as the existing scratchpad insert). I'll verify the `notes` table columns (likely `title`, `content`, `user_id`, `source_url`) before writing the insert; if a notebook is required, default to the user's "Inbox" notebook or create one on first use.
- **Tasks insert** uses `POST /rest/v1/tasks` with `title`, `user_id`, `due_at: null`, `metadata: { source_url }`.
- **PDF:** `chrome.scripting.executeScript({ target:{tabId}, func: () => window.print() })`. No new permissions needed — `scripting` + `activeTab` already cover it.
- **Translate / Define:** call existing edge functions; show result in the page toast (already a nice pill). For Translate, also `navigator.clipboard.writeText` via injected script so the user can paste anywhere.
- **Send to ALICE:** store `{ seed_url, seed_title }` in `chrome.storage.local` under `pendragonx_alice_seed`, then open the side panel. The side panel `popup.js` reads & clears that key on load and pre-fills the chat input.

## Open questions before I build

1. Are the **length thresholds** (500 / 1500) good, or do you want different cutoffs?
2. For **Save page as PDF**, is the native `window.print()` → "Save as PDF" flow OK, or do you want a server-rendered PDF saved into the Files tab automatically (heavier, but no user dialog)?
3. For **Send to ALICE**, should it seed a Q&A turn ("Summarize this page for me") automatically, or just open ALICE with the URL attached and let the user type?
