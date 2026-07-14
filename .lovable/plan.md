
# Macro Deck parity for ALICE — broad build plan

Bring the "tap-tile control surface" pattern from Macro Deck into ALICE, on top of the macro engine that already exists (`alice_macros`, abilities registry, marketplace, extension runner, triggers).

Five phases, shippable individually. Each phase ends in a working slice.

---

## Phase 1 — Deck data model + Deck Studio editor

New page `/decks` (Deck Studio) with a visual grid editor.

- New tables (via migration, with GRANTs + RLS scoped to `auth.uid()`):
  - `alice_decks` — id, user_id, name, description, cols (default 5), rows (default 3), background, theme, is_default, updated_at.
  - `alice_deck_folders` — id, deck_id, parent_folder_id, name, icon, position.
  - `alice_deck_tiles` — id, deck_id, folder_id, x, y, w, h, kind (`macro | folder | widget | multi | noop`), label, icon (lucide name / emoji / storage url), bg_color, fg_color, macro_id (fk `alice_macros`), widget_type, config jsonb, hotkey.
  - `alice_deck_shares` — id, deck_id, code, expires_at, scopes (view/press).
- Editor UI (drag-drop tile placement on a CSS-grid canvas, right rail = tile inspector, top bar = deck picker + profile switcher, keyboard nudge). Reuses design tokens (deep ink + iridescent violet).
- "Bind to macro" picker uses existing `alice_macros`; "New macro" jumps into the current Macros builder pre-linked back.
- Import / Export deck as JSON.

## Phase 2 — Runtime: web deck + phone companion (QR pair)

- Runtime view at `/deck/:id` — fullscreen tap grid, big touch targets, haptic + audio feedback, works on desktop and mobile. Live-updates via Supabase realtime on `alice_deck_tiles`.
- Phone-as-remote flow (Macro Deck's killer feature):
  - Desktop shows a QR / 6-char pair code (edge fn `deck-pair-create` → row in `alice_deck_shares`).
  - Phone hits `/deck/join?code=…`, redeems via `deck-pair-redeem`, joins a realtime channel `deck:{deck_id}:{session}`.
  - Tap on phone → broadcast → desktop receives → executes tile action through the existing ALICE runner (macros, alice_chat, extension bridge).
- Tile press dispatch is a single `runTile(tile)` helper: macro → invoke existing macro runner; alice_chat → open ALICE with prompt; hotkey → forward to extension; widget → local-only.

## Phase 3 — Profiles, folders, contextual auto-switch

- Profiles = named decks; a "Default profile" per user.
- Folder tiles push a folder onto a breadcrumb stack in runtime; back tile pops.
- Context rules table `alice_deck_context_rules` (host pattern, app id, keyword) → auto-switch active deck when the extension reports a matching active tab (reuses the existing `site` / `topic` trigger infra).

## Phase 4 — Icon packs, theme packs, widget tiles

- Icon library modal: Lucide (already installed), emoji picker, plus user uploads stored in a new `deck-icons` storage bucket (private, RLS to owner). Optional "Icon packs" table so packs can be installed marketplace-style.
- Theme packs = named color presets (bg gradient, tile radius, glow intensity) applied at deck level.
- Widget tiles (no macro needed, render live data):
  - `clock`, `countdown`, `pomodoro`, `counter` (tap to inc, long-press reset), `weather` (reuse existing Open-Meteo integration), `stopwatch`, `writing_streak`, `zettel_count`, `now_playing` (from recorder), `alice_status`.

## Phase 5 — Marketplace + plugin abilities + sharing

- Extend the existing `macro_marketplace_submissions` flow with a `kind` column: `macro | deck | ability_plugin | icon_pack | theme_pack`. Install pulls a snapshot into the user's own tables (same pattern as `macro-marketplace-install`).
- Ability plugins = JSON-defined custom step types added to `MACRO_ABILITIES` at runtime (mirrored in extension via a fetched registry file).
- Deck share links: read-only public deck view (`/d/:code`) rendered from `alice_deck_shares` with press disabled unless the viewer is signed in and holds `press` scope.

---

## Technical details

- **Stack**: existing React 18 + Vite + Tailwind + shadcn; Supabase for tables/realtime/storage; existing edge-function auth helper.
- **Realtime**: broadcast channels for tap events (low-latency, no DB write); postgres_changes on `alice_deck_tiles` for editor sync. All subscriptions inside `useEffect` with `removeChannel` cleanup (per project rule).
- **Security**: all new tables `ENABLE ROW LEVEL SECURITY`; policies use `auth.uid() = user_id` (or `has_role`); explicit `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated;` + `GRANT ALL ... TO service_role;` in the same migration. Pair codes are single-use, short-lived (5 min), rate-limited in the edge function.
- **Extension**: `public/chrome-extension/runner.js` gains a `run_deck_tile` message handler so desktop deck presses can reach browser-side abilities; new `deck-bridge.js` script bridges realtime broadcasts → runner.
- **Reuse, don't fork**: tiles delegate to the existing macro runner, abilities registry, marketplace, triggers, and vault — no parallel execution engine.
- **Rollout**: ship Phase 1 alone (editor works with existing macros, no runtime yet). Phase 2 unlocks the phone remote. Phases 3–5 are additive.

---

## Out of scope for this pass

- Native desktop app (Macro Deck ships a .NET desktop client — we stay web + extension).
- Stream Deck hardware driver.
- Non-Chromium browser extension parity.
