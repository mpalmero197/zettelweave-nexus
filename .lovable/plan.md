# Macros v3 — Routine Builder

Add a guided, form-driven macro builder modeled on Google Routines, alongside the existing ALICE-generated macros. Users assemble a macro from labeled dropdowns instead of writing prompts.

## UX — Routine Builder modal

Opened from the Macros panel (web app + extension popup) via "+ New Routine". Single scrollable form with these sections, each a labeled dropdown plus an optional "Custom…" entry that reveals a text/JSON field:

1. **Name the routine** — text input.
2. **What starts it? (Trigger)** — dropdown:
   - Manual ("Run from menu")
   - On schedule (cron / time-of-day picker)
   - When I visit a site (host pattern)
   - When ALICE detects a topic (keyword list)
   - When a workflow fires (pick from `alice_workflows`)
   - Hotkey (key combo capture)
   - Custom…
3. **What is the action? (Steps)** — repeatable rows; each row is a dropdown of pre-built abilities:
   - Open URL
   - Log in with vault credential (host autodetected)
   - Fill form field (selector + value, value can be `{{vault.*}}` or `{{var.*}}`)
   - Click element
   - Wait for element / wait N seconds
   - Ask the user (prompt + options → stored in `run_vars`)
   - Extract text → save to Zettel card / notebook
   - Summarize current page → save to notebook
   - Send to ALICE chat (prompt template)
   - Run another macro (chain)
   - Custom step (raw JSON, advanced)
   - "Let ALICE plan the rest" (hands off to `alice-research-macro` from this point)
4. **Notification?** — dropdown: None / Toast on completion / Push notification / Email. Custom message field.
5. **Reminder?** — dropdown: None / One-time at… / Recurring (reuses existing `ReminderPicker` presets: 15m, 1h, 1d, 1w, custom).
6. **Run mode** — Foreground (show overlay) / Background (silent, extension only).
7. **Who can run it** — Just me / Shared with collaborators (future-proof toggle, default Just me).

Save writes a normalized `steps[]` array into `alice_macros` (existing table) so the same runner executes both routine-builder macros and ALICE-generated ones. Trigger/notification/reminder metadata go into new columns.

## Data model

Migration adds to `alice_macros`:
- `trigger jsonb default '{"type":"manual"}'::jsonb` — `{type, schedule?, host?, keywords?, workflow_id?, hotkey?}`
- `notification jsonb default '{"type":"none"}'::jsonb` — `{type, message?}`
- `reminder_offsets int[] default '{}'::int[]` — minutes-before list, reusing reminder pipeline
- `run_mode text default 'foreground'`
- `source text default 'alice'` — `'alice' | 'routine_builder'` (lets the UI badge them differently)

Routine reminders are inserted into existing `reminders` table on save via `useNotifications.addReminders` so the existing `send-reminders` cron handles them — no new scheduler.

Site-visit and hotkey triggers are handled by the extension (`background.js` listens to `chrome.tabs.onUpdated` + `chrome.commands`); schedule triggers are handled by the existing `run-scheduled-triggers` edge function (extend it to read `alice_macros.trigger` when `type='schedule'`).

## Files

**New**
- `src/components/alice/RoutineBuilder.tsx` — the modal form described above. Uses existing `Select`, `Input`, `Button`, `Popover`, `ReminderPicker`.
- `src/components/alice/RoutineStepRow.tsx` — single step row with ability dropdown + dynamic fields.
- `src/lib/macros/abilities.ts` — registry of pre-built abilities (label, icon, fields schema, → normalized step JSON).
- `src/lib/macros/triggers.ts` — trigger type registry (label, fields, → normalized trigger JSON).
- `supabase/migrations/<ts>_macros_routine_builder.sql` — column additions.

**Modified**
- `src/components/alice/MacroCoach.tsx` — add "+ New Routine" button that opens `RoutineBuilder`; list shows a "Routine" badge when `source='routine_builder'`.
- `extension/popup.js` + `popup.html` — same "+ New Routine" entry point; reuses ability registry via a small mirrored JS module (`extension/abilities.js`) so popup and web app stay in sync. Bump toolbox to 1.18.0 and repackage both zips.
- `extension/background.js` — handle `tabs.onUpdated` host-match and `chrome.commands` hotkey triggers; run matching macros via existing runner.
- `extension/runner.js` — no logic change; already supports the step actions we expose. Add small shims for new ability types that map 1:1 to existing actions (`open_url` → `navigate`, `login_with_vault` → `fill` pair with `{{vault.*}}`).
- `supabase/functions/run-scheduled-triggers/index.ts` — also scan `alice_macros` for `trigger.type='schedule'` and enqueue runs.
- `supabase/functions/jarvis-chat/index.ts` — extend `create_macro` tool schema with optional `trigger`, `notification`, `reminder_offsets` so ALICE can also produce routine-style macros when asked.

## Technical notes
- The ability registry is the single source of truth: each entry defines `{ id, label, icon, fields: [{name,type,placeholder,optional}], toStep(values) }`. Adding a new pre-built ability is one entry; no UI changes.
- "Custom…" in every dropdown surfaces a raw JSON editor so power users keep full control.
- Routine reminders are decoupled from macro execution: the macro can run at trigger time, and reminders are independent rows in `reminders` pointing at the macro by `item_type='alice_macro'`, `item_id=macro.id`.
- Backwards compatible: existing ALICE-created macros keep working (defaults satisfy new columns).
