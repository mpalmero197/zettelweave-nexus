## Why right-click options aren't working

Two concrete bugs in the extension:

### Bug 1 — "Teach ALICE this task" / "Stop recording" never registered

The v1.12.0 changelog and the macro recorder code both assume a right-click entry called **"Teach ALICE this task"** (and a "Stop recording" toggle while a recording is in progress). But `extension/background.js` → `registerContextMenus()` (lines 23-59) never actually calls `chrome.contextMenus.create(...)` for either item. So those options simply don't appear in the menu — that's almost certainly one of the "options that don't work at all."

### Bug 2 — The downloadable extension is stale

`public/chrome-extension/` is the folder that gets zipped and handed to users. Comparing it to the source `extension/` folder:

- `background.js` hashes differ — the public copy is an older build, so even the menu items that exist in source are missing or broken in the installed extension.
- `manifest.json` hashes differ — likely an older version number and missing `web_accessible_resources` for `recorder.js`/`runner.js`.
- `recorder.js` and `runner.js` are **not present at all** in `public/chrome-extension/`. The macro recorder/runner therefore can't be injected on any installed copy, so every macro-related right-click would fail silently.

## Fix

1. **Add the missing menu items** in `extension/background.js` → `registerContextMenus()`:
   - `pendragonx_rec_start` — title "Teach ALICE this task" — contexts `["page", "selection", "link"]` — visible when no recording is active.
   - `pendragonx_rec_stop` — title "Stop recording & save macro" — same contexts — visible only while a recording is active.
   - Toggle visibility with `chrome.contextMenus.update({ visible })` driven by the existing `REC_STATE_KEY` session value (re-run on `onInstalled`, `onStartup`, and after every `PENDRAGONX_REC_START` / `PENDRAGONX_REC_STOP_AND_SAVE`).

2. **Wire the click handler** in the existing `chrome.contextMenus.onClicked` listener:
   - `pendragonx_rec_start` → call the existing `startRecording(tab)` and toast "Recording — interact with the page, then right-click → Stop".
   - `pendragonx_rec_stop` → broadcast `PENDRAGONX_REC_STOP_PROMPT` (the side panel already listens and prompts for a name); open the side panel so the user can finish saving.

3. **Resync the public mirror** so the downloadable ZIP matches source:
   - Copy `extension/background.js`, `extension/manifest.json`, `extension/content.js`, `extension/popup.html`, `extension/popup.js`, `extension/preview-shim.js`, **and the missing `extension/recorder.js` + `extension/runner.js`** into `public/chrome-extension/`.
   - Bump manifest version to `1.12.1` in both copies so reloads pick up the new menu items.

4. **Sanity check** the other menu items that depend on edge functions (`pendragonx_define`, `pendragonx_translate`, `pendragonx_summarize_link`) by reading their handlers — they look correct, so no changes there unless the user reports a specific one.

## Out of scope

- No new features. The Macros side-panel tab built in the previous turn already covers list/run/rename/delete.
- No changes to the in-page recorder/runner scripts themselves.

## Question for you

Are there specific menu items that don't work beyond the two macro-recorder entries? If you can name them I'll target the fix precisely; otherwise I'll ship the plan above, which addresses every menu item that's currently missing or broken on the installed extension.
