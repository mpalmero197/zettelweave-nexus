

# Catalyst Writer Enhancement + WCAG Compliance

## Part A: Writer-Dream Features

### 1. Typewriter Scrolling Mode
**File**: `src/components/CatalystEditor.tsx`, `src/index.css`

Add a "typewriter" toggle to the toolbar that keeps the active cursor line vertically centered in the viewport as the user types. Implemented via a TipTap `onTransaction` handler that calls `scrollIntoView` with `block: 'center'` on the cursor position after each keystroke.

### 2. Highlight / Marker Extension
**File**: `src/components/CatalystEditor.tsx`

Add TipTap's `Highlight` extension with a toolbar color-picker (4 preset colors: yellow, green, blue, pink). Writers use highlighting for revision passes -- e.g., "yellow = needs citation", "pink = cut candidate".

### 3. Reading Time Estimate in Stats Bar
**File**: `src/components/catalyst/CatalystStatsBar.tsx`

Add a "~X min read" pill next to the word count, calculated as `Math.ceil(wordCount / 238)` (average adult reading speed). Already has the data; just needs the display.

### 4. Auto-Save Status Indicator
**File**: `src/components/Catalyst.tsx`

Show a subtle "Saved" / "Saving..." / "Unsaved changes" indicator next to the document title. Track dirty state by comparing current content to last-saved content, and show the timestamp of last save.

### 5. Markdown Input Rules (Smart Shortcuts)
**File**: `src/components/CatalystEditor.tsx`

TipTap's StarterKit already includes basic input rules, but add `Typography` extension for smart quotes (`"` to curly quotes), em-dashes (`--` to `—`), and ellipsis (`...` to `…`). Writers expect these automatically.

---

## Part B: WCAG 2.1 AA Compliance for Document Window

### 1. Toolbar Accessibility
**File**: `src/components/CatalystEditor.tsx`

- Add `role="toolbar"` and `aria-label="Formatting toolbar"` to the toolbar container
- Add `aria-label` to every Toggle button (e.g., "Bold", "Italic", "Heading 1", "Undo")
- Add `aria-pressed` state (already handled by Radix Toggle, but verify)
- Group related controls with `role="group"` and `aria-label` (e.g., "Text formatting", "Alignment")

### 2. Focus Mode Contrast Fix
**File**: `src/index.css`

Current focus mode dims inactive paragraphs to `opacity: 0.3` which fails WCAG contrast. Change to `opacity: 0.45` minimum and add a `prefers-contrast: more` override that sets it to `0.7`.

### 3. Live Regions for Dynamic Content
**File**: `src/components/CatalystEditor.tsx`, `src/components/catalyst/CatalystStatsBar.tsx`

- Wrap word count display in `aria-live="polite"` so screen readers announce changes
- Add `aria-live="assertive"` for save status changes
- Add `sr-only` announcements for toolbar state changes

### 4. Editor Area Semantics
**File**: `src/components/CatalystEditor.tsx`

- Add `aria-label="Document editor"` to the EditorContent wrapper
- Add `role="region"` and `aria-label` to the overall editor container
- Ensure the ProseMirror element gets `aria-multiline="true"`

### 5. Keyboard Navigation Enhancement
**File**: `src/components/CatalystEditor.tsx`

- Add `Escape` key handler to exit the editor and return focus to the toolbar
- Add `aria-keyshortcuts` attributes to toolbar buttons with shortcuts (Ctrl+B, Ctrl+I, etc.)

---

## Files Changed

| File | Changes |
|------|---------|
| `src/components/CatalystEditor.tsx` | Typewriter mode, Highlight extension, Typography extension, full WCAG toolbar markup, keyboard nav, editor semantics |
| `src/index.css` | Typewriter scroll CSS, focus mode opacity fix, high-contrast overrides |
| `src/components/catalyst/CatalystStatsBar.tsx` | Reading time pill, aria-live region |
| `src/components/Catalyst.tsx` | Auto-save status indicator near title |

No database changes required.

