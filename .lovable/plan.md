# ALICE Wake Word + Teach-a-Macro + Macro Marketplace

Three coordinated workstreams shipped together.

---

## 1. Fix "Hey ALICE" wake word in the Toolbox extension

The current offscreen wake-word loop never triggers a conversation start. Plan:

- Audit `extension/background.js`, `extension/offscreen.js`, `extension/offscreen.html` and the mirrored `public/chrome-extension/*` copies.
- Confirm `offscreen` document is being created with the right reasons (`USER_MEDIA` + `AUDIO_PLAYBACK`) and that `chrome.runtime.sendMessage` from offscreen → background is wired.
- Replace fragile keyword spotting with a robust loop:
  - Continuous `MediaRecorder` 3‑second rolling chunks → Whisper via existing `transcribe-audio` edge function.
  - If transcript matches `/\bhey,?\s*(alice|allie)\b/i` → background opens the side panel / popup and posts `alice:wake` to it.
- Add a visible mic indicator + on/off toggle in `popup.html` writing to `chrome.storage.local.wakeWord = true|false`.
- Re-zip both `public/pendragonx-toolbox.zip` and `public/pendragonx-chrome-extension.zip`.

Acceptance: open extension popup → enable Wake Word → say "Hey ALICE" → ALICE side panel opens with mic already hot.

---

## 2. Teach-a-Macro (record-by-demonstration)

Let users demo a workflow once and save it as an `alice_macros` row with pause/ask steps.

### Extension recorder
- Reuse existing `extension/recorder.js`. Add a floating "Teach ALICE" pill the user clicks to start.
- Capture: `click` (with stable selector + visible text), `fill` (value redacted if `input[type=password]` → emitted as `pause` prompt "Enter your password"), `select`, `navigate`, explicit user-tagged `pause` ("ALICE, wait here").
- On stop → POST normalized steps to new edge function `alice-save-taught-macro` which:
  1. Calls Gemini to clean step list, name the macro, suggest tags, mark sensitive fields as `pause`.
  2. Inserts row into `alice_macros` with `source = 'taught'`.

### In-app builder
- New page `/alice/macros/teach` that opens the start URL in a new tab, instructs the user to install the extension if missing, and shows live captured steps.
- Existing `MacroCoach` already plays steps back — verify by loading the saved macro.

---

## 3. Macro Marketplace (admin-approved)

### Schema (new tables, all with GRANTs)
- `macro_marketplace_submissions` — `id, macro_id, user_id, status (pending|approved|rejected|removed), title, description, tags[], steps_snapshot jsonb, start_url, submitted_at, reviewed_at, reviewer_id, rejection_reason`.
- `macro_marketplace_ratings` — `id, submission_id, user_id (unique pair), stars 1-5, review text, created_at`.
- `macro_marketplace_installs` — `id, submission_id, user_id, installed_macro_id, created_at` (for download counts).
- View `macro_marketplace_public` exposing only `approved` rows + aggregated `avg_rating`, `rating_count`, `install_count`.

RLS:
- Anyone authenticated can `SELECT` from the public view.
- Owner can update their own pending submission.
- Admins (via `has_role`) can update status.
- Ratings: insert/update only own row; everyone reads.

### UI
- `src/pages/MacroMarketplace.tsx` — browse grid, filter by tag, sort by rating / installs / newest, search.
- `src/pages/MacroMarketplaceDetail.tsx` — full step list (rendered with `describeStep` shared with `MacroCoach`), screenshots-style step cards, ratings & reviews, **Install to my ALICE** button (clones into the user's `alice_macros` via edge function `install-marketplace-macro`), Report button.
- "Publish to Marketplace" action on each user macro in the existing macros list → opens dialog (title, description, tags) → inserts pending submission.
- Admin Panel tab `Macro Reviews`: pending queue, step preview, Approve / Reject (with reason) / Remove buttons.

### Edge functions
- `submit-macro-to-marketplace` — owner-only, snapshots steps so later edits don't change the public version.
- `install-marketplace-macro` — clones snapshot into caller's `alice_macros` (resets vault tokens, marks `source='marketplace'`, increments install count).
- `moderate-marketplace-macro` — admin-only status changes.

---

## Implementation order

1. DB migration for marketplace tables + view + RLS + grants.
2. Edge functions (submit / install / moderate / save-taught-macro).
3. Extension wake-word fix + repackage zips.
4. Teach-a-Macro recorder flow.
5. Marketplace browse, detail, ratings, install.
6. Admin moderation queue.
7. Smoke test end-to-end with Playwright.

---

## Technical notes (for reference)

- Snapshot pattern keeps marketplace versions immutable so ratings stay meaningful even if the author edits their local copy.
- Vault tokens (`{{vault.*}}`) survive cloning — they resolve at runtime against the installer's vault, so no secrets leak.
- Wake-word stays client-side (browser mic → offscreen Whisper). No always-on streaming to the server.
- All new tables get explicit `GRANT` blocks per project rules.
