# ALICE Macros v2 — Vault tokens, DOM-aware repair, richer pauses

## Problems being fixed
1. Macro runs fail on a step (overlay shows "✗ Failed: …").
2. Planner emits literal strings like `{{vault.username.login}}` that get typed verbatim because the extension has no token resolver.
3. Planner picks selectors from documentation pages, not the actual live page, so selectors miss.
4. Pauses are dumb — no way for ALICE to ask the user a question mid-flow (e.g. "which Google account?").

## Plan

### 1. Vault token resolver (extension side)
- Define a canonical token grammar the planner must use:
  - `{{vault.username}}` / `{{vault.password}}` / `{{vault.otp}}` → auto-match the vault item whose `url`/`domain` matches the current tab's host.
  - `{{vault:"Item Title".username}}` → explicit by title.
- New `extension/vault-resolver.js`, injected on every macro tab:
  - Listens on the existing `pendragonx-vault` BroadcastChannel for `get-credential` (already used for OTP).
  - In-page web app handler (added to `useVault`/`Vault.tsx` mount or a small global subscriber in `src/App.tsx`) decrypts requested item locally and posts back `{ username, password, otp? }`.
- `runner.js` before each `fill`/`type`:
  - Scans `step.value` for `{{vault…}}` tokens.
  - Asks the resolver for the matching item by host.
  - If 0 matches → falls through to a new "vault-pick" pause overlay listing available titles (radio buttons) so the user picks; the chosen title is cached for the rest of the run.
  - If ≥1 match → uses it silently; substitutes the real value into `step.value` and continues with `nativeSet`.
- `sensitive: true` no longer throws when the value is a resolvable vault token.

### 2. DOM-aware repair (hybrid re-plan on failure)
- New edge function `alice-repair-macro-step`:
  - Inputs: `macro_id`, `step_index`, current step JSON, page snapshot (URL, title, list of `{tag, id, name, ariaLabel, placeholder, text, type, role, selector}` for visible inputs/buttons/links — capped at 80).
  - Calls Gemini-2.5-flash with the snapshot + the original step intent; returns a single corrected step (selector + action).
  - Persists the corrected step back into `alice_macros.steps` so future runs don't need repair.
- `runner.js` failure path:
  - On second failure of a non-pause step, snapshots the live DOM (≤80 candidate elements) and POSTs to `alice-repair-macro-step` via the extension's existing authed `rest()` helper.
  - Applies the returned step, retries once, then falls back to a pause with `prompt: "I couldn't find <intent>. Please do it manually, then continue."`

### 3. Smarter initial planner (`alice-research-macro`)
- Update the system prompt to:
  - Document the vault token grammar and **require** it for credential fields.
  - Add new step action `ask` (`prompt`, `options[]`, `var`) — pauses and shows a chooser; selection is stored under `runVars[var]` and substitutable as `{{var.<name>}}` in later steps. Example: "Which Google account?" with the accounts ALICE detected on the page.
  - Encourage `pause` with a `selector` (already supported) so the field is highlighted while the user types.
- After Firecrawl research, do an optional second pass: scrape `start_url` and feed the first-page DOM summary to the planner so initial selectors match the real page.

### 4. Runner enhancements
- Add `ask` action handler in `runner.js`: builds an overlay with radio choices, stores result in `window.__pendragonxRunVars`.
- Generic `{{var.X}}` substitution alongside vault tokens.
- Element highlight stays visible during every `pause`/`ask` (already partly done).
- Persist `current_step` to `alice_macro_runs` between steps so the Macros tab can show progress.

### 5. Toolbox Macros tab error
- `popup.js#renderMacros` currently crashes if `steps` is null. Guard with `Array.isArray(m.steps) ? m.steps.length : 0`.
- Surface the last `alice_macro_runs.error` under each macro card so the failure (e.g. "Step requires a sensitive value") is visible without opening DevTools.
- Add a "Repair with ALICE" button that re-invokes `alice-repair-macro-step` against the failed step.

### 6. Schema
No new tables. Add columns to `alice_macros`:
- `run_vars jsonb default '{}'::jsonb` (last run's collected `ask` answers, for re-runs)
- `last_error text`, `last_error_step int` (for the popup display)

### 7. Toolbox version bump → 1.17.0, repackage zips.

## Files changed
- `extension/runner.js` — vault/var substitution, `ask` action, repair-on-failure path, vault-pick overlay
- `extension/vault-resolver.js` (new) + manifest entry
- `extension/popup.js`, `popup.html` — null-safe rendering, last-error display, Repair button
- `extension/manifest.json` + `public/chrome-extension/*` mirror + zips
- `src/App.tsx` or new `src/components/alice/VaultBridge.tsx` — in-page BroadcastChannel listener that decrypts vault items on request
- `supabase/functions/alice-research-macro/index.ts` — token grammar, `ask` action, optional live-page DOM pass
- `supabase/functions/alice-repair-macro-step/index.ts` (new)
- `supabase/functions/jarvis-chat/index.ts` — extend `create_macro` schema with `ask` + token docs
- Migration: add `run_vars`, `last_error`, `last_error_step` columns to `alice_macros`

## Technical notes (for reference)
- Vault items are AES-GCM encrypted with the user's master passphrase; decryption must stay in the web app (the extension never sees the key). The BroadcastChannel pattern already used for OTP extends cleanly to `get-credential`.
- DOM snapshot uses `IntersectionObserverEntry`-style filtering: only elements whose bounding rect is in viewport and that are interactive.
- Repair function is rate-limited to 3 calls per macro run to cap cost.