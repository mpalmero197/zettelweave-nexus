# ALICE Spark Overhaul — Phased Plan

Big scope. I'll ship this in three reviewable phases so we don't get lost. Each phase is independently shippable.

---

## Phase 1 — Rich Media Chat UI (Gemini-style)

**Goal:** Replace the text-only Jarvis chat with an "expressive" renderer that turns tool results into rich cards instead of raw text.

**New components** (`src/components/jarvis/cards/`):
- `ImageCard.tsx` — image with caption + lightbox
- `MapCard.tsx` — embedded OpenStreetMap iframe (no API key) with pin + "Open in Google Maps" link
- `PdfCard.tsx` — title, page count badge, "Open PDF" CTA, inline preview thumb
- `VideoCard.tsx` — YouTube/MP4 embed with poster, lazy-loaded
- `SpreadsheetCard.tsx` — first ~10 rows of a CSV/XLSX in a table, "Open full" link
- `LinkCard.tsx` — OG-style preview (favicon, title, snippet, domain)
- `QuoteCard.tsx` — large pull-quote with source attribution
- `FileCard.tsx` — generic uploaded file (icon by mime, size, download)

**Renderer:** `JarvisRichMessage.tsx` parses assistant `parts` for new part types (`image`, `map`, `pdf`, `video`, `link`, `quote`, `spreadsheet`, `file`) plus a fenced markdown convention `[[ALICE_CARD type=link]]{...json...}[[/ALICE_CARD]]` so the model can emit cards inline (mirrors existing `[[ALICE_PLAN]]` pattern in `useJarvis.ts`).

**Typography & color refresh** (chat-scoped, not site-wide):
- Heading font: **Sora** (display) paired with existing Inter body
- New accent gradient token `--alice-gradient` (electric indigo → cyan)
- Cards: 1px border + subtle gradient hover, framer-motion stagger fade-in
- Streaming token cursor (blinking caret)

**Files edited:** `src/components/jarvis/JarvisChat.tsx`, `src/hooks/useJarvis.ts` (add `extractCards` next to `extractPlans`), `src/index.css` (add `--alice-*` tokens), `supabase/functions/jarvis-chat/index.ts` (system prompt: when web search / file lookup returns rich content, emit `[[ALICE_CARD]]` blocks).

---

## Phase 2 — Attachments + Search Engine Picker

**Attachments (+ button):**
- New `JarvisAttachmentMenu.tsx` triggered by `+` button left of input
- Options: **Image**, **PDF/Doc**, **Audio**, **Camera** (mobile), **From knowledge base**
- Upload → `card-media` bucket (existing) → attach as `file_url` part on next user message
- `jarvis-chat` edge function extended to accept `attachments: [{url, mime, name}]`, passes images directly to Gemini vision, extracts text from PDFs via existing `fetch-url-content` pattern

**Search engine picker:**
- New column `profiles.preferred_search_engine` enum: `google` (default) | `duckduckgo`
- Settings UI: dropdown in `src/pages/Settings.tsx` → Privacy section
- `supabase/functions/web-search/index.ts` reads pref from caller's profile; if `duckduckgo`, swaps to DuckDuckGo Instant Answer + HTML fallback (no API key needed). Google path unchanged.

**Migration:** add `preferred_search_engine TEXT DEFAULT 'google'` to `profiles`.

---

## Phase 3 — Proactive ALICE (Spark-style, level 3/5)

**Goal:** ALICE wakes up on her own ~2–3×/day to surface useful nudges based on the user's calendar, tasks, recent notes, and stated goals.

**New edge function:** `alice-proactive-pulse`
- Cron: every 4 hours via `pg_cron`
- For each user with `alice_proactive_enabled = true`:
  1. Pull last 24h of cards/notes, today's calendar events, overdue tasks, active habits
  2. Send compact context to Gemini with prompt: *"Suggest 1 proactive action ALICE should take or surface. Output JSON {action, rationale, suggested_trigger?}"*
  3. If action is time-bound → call existing `create_scheduled_trigger` flow (insert into `alice_scheduled_triggers`)
  4. Else → insert an `in_app_notifications` row tagged `alice_pulse` + optionally a `jarvis_messages` row in a dedicated "ALICE Pulse" thread

**New table:** `alice_pulses` (id, user_id, kind, summary, payload jsonb, status [pending|seen|acted|dismissed], created_at)

**New UI:**
- `AlicePulseFeed.tsx` — dropdown in top bar (Sparkles icon w/ unread dot) listing recent pulses; tap to act/dismiss
- Settings toggle: "Proactive ALICE" + frequency slider (1–5, default 3 = every 4h) → stored on `profiles`

**Migration:** add `profiles.alice_proactive_enabled BOOLEAN DEFAULT true`, `profiles.alice_proactive_level INTEGER DEFAULT 3`; create `alice_pulses` table with RLS (user owns rows).

---

## Order of ship

I'll start with **Phase 1** end-to-end (it has the most visible payoff and unblocks Phases 2–3 visually), then circle back for 2, then 3. Each phase is one focused turn so you can review and steer between them.

Reply **"go"** to start Phase 1, or tell me to re-order / drop a phase.
