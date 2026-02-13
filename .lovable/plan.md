

# Fix Chrome Extension ZIP Structure

## Problem
The ZIP bundles files inside a `pendragonx-extension/` subfolder. When Windows extracts `pendragonx-chrome-extension.zip`, the result is:

```text
pendragonx-chrome-extension/
  pendragonx-extension/
    manifest.json
    popup.html
    ...
```

Users naturally select the outer folder, but Chrome needs the folder containing `manifest.json` directly -- that's the inner one. This is confusing and error-prone.

## Fix

### `src/components/ScratchPad.tsx`
Remove the `zip.folder("pendragonx-extension")` call and add files directly to the ZIP root. This way, when extracted, the user gets a single folder with all files at the top level:

```text
pendragonx-chrome-extension/
  manifest.json
  popup.html
  popup.js
  icon-16.png
  icon-48.png
  icon-128.png
```

**Specific change:** Replace `const folder = zip.folder("pendragonx-extension")!;` with just using `zip` directly, and change all `folder.file(...)` calls to `zip.file(...)`.

This is a ~4 line change in the `handleDownloadExtension` function.

