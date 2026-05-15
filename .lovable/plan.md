# PendragonX Toolbox — Improvements Plan

Scope: Chrome extension (`extension/` + mirrored `public/chrome-extension/`) and the web Calendar surface.

## 1. Auto-sync (no more manual refresh)

- On panel open, sync immediately, then every **30 s** via `setInterval` (cleared on `window.unload`).
- Re-sync on `document.visibilitychange` → `visible`.
- Re-sync on `chrome.tabs.onActivated` (already broadcasted by background; popup will listen via `chrome.runtime.onMessage`).
- Subscribe to Supabase Realtime for `zettel_cards`, `notes`, `calendar_events`, `tasks` (filtered by `user_id`) using the REST/Realtime websocket — fall back to polling if the socket fails.
- Replace the manual "Sync" button label with a live status dot (Synced • / Syncing… / Offline).

## 2. Open notes & cards inside the toolbox

- Replace `window.open(...)` on card/note rows with an in-panel **viewer/editor modal**:
  - Editable `title` + `content` textarea, autosaves on blur (PATCH `notes` / `zettel_cards`).
  - Buttons: **Save**, **Delete** (soft-delete via `deleted_at`), **Open in PendragonX** (kept as escape hatch), **Close**.
- Modal is a single overlay component reused by both Notes and Cards tabs.

## 3. Fix "Save as Card" routing bug

Root cause candidates to verify and resolve:
- The `Save as Card` button currently lives in the **Notes** tab, so after capture the panel still shows the Notes list — making it look like the card was saved to Notes.
- Fix:
  - Move web-capture controls into a shared **Capture bar** visible on both Notes and Cards tabs.
  - After `captureFromPage('card')`, auto-switch to the **Cards** tab and highlight the new row.
  - Toast clearly says "Saved to Cards" (with an "Open" action that launches the new modal).
  - Audit `createCard` to ensure `category: 'web'` and the row truly lands in `zettel_cards` (add a sanity `select` after insert).

## 4. Richer calendar — toolbox

Replace the current flat list with:

- **Mini month grid** at the top (7-col CSS grid, dots per event, click a day to filter the list).
- Quick-add row: title + date + time + category dropdown (event / appointment / meeting / phone / personal / deadline / reminder / task / habit).
- **Per-event actions** on each row: edit (inline title/date/time/category), delete, **move** (date+time picker).
- **Duplicate detection** on save/move: query `calendar_events?event_date=eq.X&event_time=eq.Y&user_id=eq.me`. If matches exist, show a confirm dialog:
  - "An event already exists at this time — keep both, replace existing, or cancel?"
- Filter chips already exist; add "Today / Week / Month" range chips alongside the category filter.

Technical sketch:

```text
[ Aug 2026 ◀ ▶ ]
[S M T W T F S]   ← clickable cells with colored dots
[ + Add: title | date | time | category ▾ ]
[ Filter: All • Event • Task • Habit … ]
[ Event row → ✏ 🕒 🗑 ]
```

## 5. Richer calendar — website

In `src/components/widgets/CalendarEventsWidget.tsx` and the main Calendar page:
- Add inline edit/delete/move (Popover with shadcn `Calendar` + time input).
- Same duplicate-detection flow via `ConfirmDialog` with "Keep both / Replace / Cancel".
- Color-coded category dots matching the toolbox.
- Drag-to-reschedule on the full Calendar page (uses existing `useDraggable`).

## 6. Other improvements (bundled)

- **Global search** at the top of the panel — fuzzy across cards, notes, calendar, tasks; results open in the new in-panel viewer.
- **Keyboard shortcuts**: `1-5` switch tabs, `⌘/Ctrl+K` focuses search, `⌘/Ctrl+Enter` saves the active form.
- **Quick-capture from selection**: right-click context menu items "Save selection → Note / Card" via `chrome.contextMenus`.
- **Per-tab badge** on the toolbar icon showing today's open task count.
- **Offline queue**: writes that fail (no network) are queued in `chrome.storage.local` and flushed when sync resumes.
- **Token refresh**: extension currently never refreshes the Supabase JWT — add silent refresh using the stored `refresh_token` so users aren't logged out after 1 hour.

## Files to change

- `extension/popup.html` — modal markup, mini-calendar grid, capture bar, search bar, status dot.
- `extension/popup.js` — auto-sync loop, realtime subscription, viewer/editor, calendar edit/delete/move + dup check, tab auto-switch, contextMenus, offline queue, token refresh.
- `extension/background.js` — `chrome.contextMenus` registration, badge updates.
- `extension/manifest.json` — add `contextMenus` permission, bump version.
- Mirror everything to `public/chrome-extension/` and rebuild `public/pendragonx-chrome-extension.zip`.
- `src/pages/` Calendar page + `src/components/widgets/CalendarEventsWidget.tsx` — edit/delete/move + duplicate confirm.
- New `src/components/calendar/EventEditPopover.tsx` for the shared edit UI.

## Out of scope (confirm before adding)

- Two-way sync of the Pomodoro timer between web and extension.
- Recurring-event UI in the toolbox (DB already supports it).
