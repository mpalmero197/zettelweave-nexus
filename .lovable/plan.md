# ALICE Sprint: Proactive Capabilities & Context Awareness

Four interrelated work items. Each is scoped to land independently and ship in one pass.

---

## 1. ALICE-FIX-001 — Mobile TTS Word Duplication Reset

**Root cause hypothesis:** The Web Speech API's `SpeechSynthesis` queue on mobile Safari/Chrome occasionally double-fires when the page regains focus or when an utterance is re-queued before the previous one finishes. We need a remote "panic button" that ALICE can pull.

**Implementation**
- Add a global window event listener `alice:reset_tts` in `src/components/AppLayout.tsx` (or a dedicated `AliceTtsReset` mount) that calls `window.speechSynthesis.cancel()` and clears any in-flight `SpeechSynthesisUtterance` queue we maintain.
- Track the synthesizer state in a small singleton (`src/lib/aliceTts.ts`) so other components (notification reader, dictation playback) share one queue and the reset wipes everything.
- Expose tool `reset_mobile_tts_engine` in `supabase/functions/jarvis-chat/index.ts`. It returns a `client_action: { type: "reset_tts" }` payload — the existing `useJarvis` fan-out already dispatches `alice:reset_tts`.
- Update ALICE system prompt: "If the user reports duplicated/echoing speech on mobile, call `reset_mobile_tts_engine` immediately, then confirm."

**Acceptance:** "ALICE, my voice is repeating itself" → tool fires → on-device queue cleared → next utterance plays clean.

---

## 2. ALICE-FEATURE-001 — Proactive Scheduled Triggers

**Approach:** Reuse Postgres + `pg_cron` + `pg_net` (already standard in this project) instead of introducing a new scheduler service.

**DB migration**
- New table `alice_scheduled_triggers`:
  - `id uuid pk`, `user_id uuid not null`, `cron_expression text not null`, `tool_name text not null`, `tool_params jsonb not null default '{}'`, `description text`, `enabled boolean default true`, `last_run_at timestamptz`, `next_run_at timestamptz`, `created_at`, `updated_at`.
- RLS: owner-only select/insert/update/delete.

**Edge functions**
- New `supabase/functions/run-scheduled-triggers/index.ts` (verify_jwt=false, cron-invoked): selects triggers due now, invokes `jarvis-chat` internally with a synthetic system message that re-runs the named tool, updates `last_run_at`/`next_run_at`.
- Add `pg_cron` job that hits this function every minute (insert via supabase tool, not migration — contains anon key).
- New tool `create_scheduled_trigger` in `jarvis-chat`: validates cron, inserts row, returns confirmation.
- Companion tools: `list_scheduled_triggers`, `delete_scheduled_trigger`.

**Acceptance:** "Every weekday at 8am, run a web search for AI news" → row created → cron fires → ALICE drops a result into the user's notebook/notification.

---

## 3. ALICE-FEATURE-002 — Habit → Task Recovery Bridge

**Good news:** `_handle_habit_missed()` trigger already exists and creates a recovery task + in-app notification. What's missing is the user-facing on/off switch and a clean "Catch up on habit: [Name]" title (currently uses `habit_id`).

**Implementation**
- Migration: add `habit_recovery_enabled boolean default true` to `profiles`.
- Update `_handle_habit_missed()`:
  - Early-return if `profiles.habit_recovery_enabled = false`.
  - Look up the habit's display name and use `'Catch up on habit: ' || habit_name` as the task title.
- Frontend: add toggle in Settings → Productivity section bound to `profiles.habit_recovery_enabled`.

**Acceptance:** Missed habit → next-day task titled "Catch up on habit: Morning Run" appears; toggling setting off suppresses creation.

---

## 4. ALICE-FEATURE-003 — Browser Tab Context

**Implementation**
- **Extension** (`extension/` + mirror to `public/chrome-extension/`):
  - Add `"tabs"` to `permissions` in `manifest.json`.
  - In `background.js`: on demand (and every 30s while side panel is open) collect `chrome.tabs.query({})` → `[{ url, title, active, windowId }]`, POST to a new edge function `ingest-browser-tabs` with the user's Supabase session token (already stored by the extension's popup auth flow).
  - Respect a `chrome.storage.local` whitelist/blacklist of domain patterns; filter before sending.
- **Backend**:
  - Migration: `browser_tab_snapshots(user_id, tabs jsonb, captured_at timestamptz)`. Keep latest row per user (upsert on `user_id`). RLS owner-only.
  - Migration: `browser_tab_privacy(user_id pk, mode text check in ('all','whitelist','blacklist'), domains text[])`.
  - Edge function `ingest-browser-tabs` (verify_jwt=true): validates JWT, applies user's privacy filter, upserts snapshot.
  - New tool `get_open_browser_tabs` in `jarvis-chat`: reads latest snapshot for the user, returns tab list (or graceful "extension not connected" message if stale > 2 min).
- **Frontend**:
  - Settings panel for tab visibility: enable toggle, mode selector, domain list editor.
  - Update extension popup to surface connection status.

**Acceptance:** Extension installed + enabled → "ALICE, what tabs do I have open?" → returns titles/URLs filtered by privacy rules.

---

## Technical Notes

- All new edge functions follow the existing pattern (CORS headers, JWT validation in code where needed, `corsHeaders` from `@supabase/supabase-js/cors`).
- All new tools registered in `jarvis-chat` system prompt under their respective sections (Scheduling, Context, Diagnostics).
- `useJarvis.ts` already fans `client_actions` to `window` events — no client wiring change needed for reset_tts.
- Cron job SQL inserted via supabase tool (contains anon key), not migration.

## File Summary

**New files**
- `src/lib/aliceTts.ts`
- `supabase/functions/run-scheduled-triggers/index.ts`
- `supabase/functions/ingest-browser-tabs/index.ts`
- Settings sub-panels: `src/components/settings/AliceSchedulesPanel.tsx`, `src/components/settings/BrowserTabPrivacyPanel.tsx`

**Edited**
- `supabase/functions/jarvis-chat/index.ts` (4 new tools + system prompt)
- `extension/manifest.json`, `extension/background.js`, `extension/popup.js` (+ mirrored copies in `public/chrome-extension/`)
- `src/components/AppLayout.tsx` (mount TTS reset listener)
- `src/pages/Settings.tsx` (add new panels, habit recovery toggle)
- `supabase/config.toml` (register new functions)

**Migrations**
- `alice_scheduled_triggers` + RLS
- `browser_tab_snapshots` + `browser_tab_privacy` + RLS
- `profiles.habit_recovery_enabled` + `_handle_habit_missed()` update

Once approved I'll execute in this order: migrations → edge functions → tools → extension → frontend → cron job.
