

# Fix Chrome Extension "Cannot read properties of null" Error

## Root Cause

Two issues are causing the persistent error:

1. **Browser cache serving old extension files**: The ZIP download function in `ScratchPad.tsx` fetches extension files without cache-busting headers. When you download the extension, your browser may serve a cached (old) version of `popup.js` that lacks the null guards.

2. **Remaining unguarded `.style` access in `popup.js`**: The `setupTabs` function accesses `document.getElementById('scratch-tab').style` and `document.getElementById('sticky-tab').style` without null checks (lines 281-282).

## Changes

### 1. `src/components/ScratchPad.tsx` -- Add cache-busting to ZIP download

Add a cache-busting query parameter (timestamp) to every `fetch()` call in `handleDownloadExtension` so the browser always fetches the latest files:

```text
Before:  fetch(`/chrome-extension/${file}`)
After:   fetch(`/chrome-extension/${file}?t=${Date.now()}`)
```

### 2. `public/chrome-extension/popup.js` -- Guard all remaining unguarded DOM access

Add null checks to every remaining function that accesses DOM elements without guards:

- **`setupTabs`** (lines 281-282): Guard `scratch-tab` and `sticky-tab` before accessing `.style`
- **`setupScratchPad`** (lines 289-293): Guard `scratch-input`, `save-scratch`, `clear-scratch` with early return
- **`setupStickyNotes`** (line 361): Guard `add-sticky`
- **`renderColorPicker`** (line 369): Guard `color-picker`
- **`renderScratchNotes`** (line 316): Guard `notes-list`
- **`renderStickyNotes`** (line 385): Guard `sticky-grid`

This comprehensive pass ensures no DOM element is ever accessed without a null check, completely eliminating the class of error.

