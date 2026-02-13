
# Make Chrome Extension Downloadable as ZIP

## Problem
The "Download Extension" button currently opens `manifest.json` in a new tab -- completely useless for installing the extension. Users need all 6 files packaged together.

## Solution
Use the already-installed **JSZip** library to fetch all chrome extension files from `public/chrome-extension/`, bundle them into a ZIP, and trigger a browser download. Also fix the footer link in `popup.html` to point to the actual published URL.

## Changes

### 1. `src/components/ScratchPad.tsx`
- Import `JSZip` and `file-saver`'s `saveAs`
- Replace the broken `window.open('/chrome-extension/manifest.json')` with a `handleDownloadExtension` function that:
  1. Fetches all 6 extension files (`manifest.json`, `popup.html`, `popup.js`, `icon-16.png`, `icon-48.png`, `icon-128.png`)
  2. Adds them to a JSZip instance under a `pendragonx-extension/` folder
  3. Generates the ZIP blob and triggers download as `pendragonx-chrome-extension.zip`
  4. Shows a toast with installation instructions
- Add a loading state while ZIP is being generated
- Improve the installation guide with numbered steps in a cleaner format

### 2. `public/chrome-extension/popup.html`
- Update the footer link from `https://pendragonx.com` to `https://pendragonx.lovable.app` (the actual published URL)

### 3. `public/chrome-extension/popup.js`
- No changes needed -- the Supabase URL and anon key are already correct

## Technical Details

The extension files to bundle:
| File | Type |
|------|------|
| manifest.json | JSON (text) |
| popup.html | HTML (text) |
| popup.js | JS (text) |
| icon-16.png | Image (binary) |
| icon-48.png | Image (binary) |
| icon-128.png | Image (binary) |

JSZip handles both text and binary content. Images are fetched as `arrayBuffer` and text files as `text`. The ZIP is generated with `type: 'blob'` and downloaded via `file-saver`.
