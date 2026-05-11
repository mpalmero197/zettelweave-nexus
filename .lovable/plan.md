
# ALICE Upgrade Plan

A staged build to give ALICE persistent memory, proactive briefings, multi-step actions with confirm/undo, file/image/audio attachments, and an auto Deep Think mode — and to make every AI tool in PendragonX run on a single shared ALICE Core.

## Stage 1 — ALICE Core (shared engine)

Create one edge function, `alice-core`, that becomes the single brain for every AI feature.

- Accepts a `mode` parameter: `chat`, `summarize`, `study-guide`, `mind-map`, `resume`, `exam`, `daily-report`, `search-rerank`, `modify`, `knowledge-chat`, `catalyst-agent`.
- Shared toolset (every mode inherits): `deep_search`, `open_note`, `open_card`, `open_in_catalyst`, `navigate`, `web_search`, `create_task`, `schedule_event`, `create_note`, `create_card`, `write_document`, `recall_memory`, `save_memory`.
- Shared persona/directive: existing `[Inference]/[Unverified]` rules, timezone/location handling, refusal of admin write actions.
- Auto model routing:
  - Default → `google/gemini-3-flash-preview`
  - Auto Deep Think → `google/gemini-2.5-pro` when prompt contains reasoning triggers (multi-step questions, "compare", "analyze", "plan", >400 chars, or attachments present) OR caller passes `forceDeepThink: true`.
- Migrate existing functions (`jarvis-chat`, `knowledge-chat`, `content-summarizer`, `mind-map-generator`, `study-guide-generator`, etc.) to thin wrappers that call `alice-core` with the right mode.

## Stage 2 — Persistent Long-Term Memory

New table `alice_memories`:
- `id`, `user_id`, `kind` (preference | fact | project | person | rule), `key`, `value`, `weight`, `source` (auto | manual), `created_at`, `last_used_at`.
- RLS: user-scoped.
- New tool `save_memory({kind, key, value})` and `recall_memory({query?})`. ALICE auto-saves when she detects stable preferences ("I always write in 1st person", "Sarah is my editor").
- On every request, top N relevant memories are retrieved by embedding similarity and injected into the system prompt.
- Settings page: "ALICE Memory" — list, edit, delete, export.

## Stage 3 — Proactive Briefings & Nudges

- New table `alice_briefings`: `id`, `user_id`, `for_date`, `summary_md`, `highlights_jsonb`, `delivered_at`.
- Scheduled edge function `alice-briefing` (pg_cron at 7 AM user-local) builds a personalized morning briefing: overdue tasks, today's calendar, writing streak, idle projects, suggested next action. Saves a row and pushes a web-push notification.
- In-app "Today" panel on the dashboard displays the latest briefing; clicking any item deep-links to the source.
- Idle-project nudges (separate cron) check for projects with no activity in 5+ days and queue a soft notification.

## Stage 4 — Multi-Step Action Plans with Confirm/Undo

- New table `alice_actions`: `id`, `user_id`, `conversation_id`, `plan_jsonb` (ordered steps), `status` (pending_confirm | running | done | failed | undone), `executed_steps_jsonb`, `undo_payload_jsonb`, `created_at`.
- When ALICE produces a plan with mutations (create event, write doc, schedule task, send message), she returns a structured plan instead of executing. UI renders a confirmation card: "I'll do these 3 things — Approve / Modify / Cancel."
- On approve, server executes steps sequentially, capturing inverse operations into `undo_payload_jsonb`.
- An "Undo last action" toast appears for 60 s after completion, calling an `alice-undo` endpoint.
- Read-only operations (search, lookup, summarize) never require confirmation.

## Stage 5 — Attachments (Images, PDFs, Audio)

- Reuse the existing `documents` and `audio-snippets` storage buckets; create `alice-attachments` for images.
- Chat input gains a paperclip with multi-file picker (image/png, image/jpeg, image/webp, application/pdf, audio/*).
- Server pipeline:
  - Images → passed inline to `gemini-2.5-pro` (vision).
  - PDFs → text extracted server-side; if >8k tokens, chunked + summarized first.
  - Audio → transcribed (Whisper via existing pipeline), transcript injected.
- Attachment metadata stored on the message row; renders as a chip with type + name + size in the chat bubble.

## Stage 6 — "Ask ALICE" everywhere

- New `<AskAliceButton context={…}/>` component placed in headers of: Notes, Cards, Calendar, Catalyst, Whiteboard, Learning Hub, Knowledge Graph, Tasks, Projects.
- Clicking opens the ALICE drawer pre-loaded with that module's context (current selection, doc id, filters).
- Knowledge Chat module is replaced by ALICE drawer with `mode: 'knowledge-chat'`.

## Database changes

- `alice_memories` — long-term memory
- `alice_briefings` — daily briefings
- `alice_actions` — pending/executed action plans
- All with RLS scoped to `auth.uid() = user_id`.
- pg_cron jobs for `alice-briefing` (daily) and `alice-idle-nudge` (daily).

## Edge functions

- `alice-core` — unified brain (new)
- `alice-briefing` — scheduled briefing builder (new)
- `alice-undo` — reverse executed plans (new)
- `alice-attachment-process` — extract/transcribe uploads (new)
- Existing AI functions migrated to thin wrappers

## Frontend

- New components: `AskAliceButton`, `AliceMemoryPanel` (settings), `AliceBriefingCard` (dashboard), `AliceActionPlanCard` (chat), `AliceAttachmentChip`, `AliceUndoToast`.
- Update `useJarvis` → `useAlice`, point to `alice-core`.

## Rollout order

1. Stage 1 (Core engine) — foundation everything else builds on
2. Stage 2 (Memory) — immediately improves every response
3. Stage 4 (Action plans) — biggest "doer" upgrade, needs Core
4. Stage 5 (Attachments) — high user-perceived value
5. Stage 3 (Briefings) — needs cron + push wiring
6. Stage 6 (Ask ALICE buttons) — surface area expansion last

## Out of scope (for now)

- Voice input/TTS — deferred (you didn't pick it; easy to add later)
- Admin write tools — explicitly forbidden per existing directive
