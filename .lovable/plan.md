

# Milanote-Style Whiteboard Enhancement

## Overview
Upgrade the existing Fabric.js whiteboard with Milanote's signature features: rich note cards, task lists, link cards, connector lines, a minimap, smart guides, board templates, and a color palette tool.

## New Features

### 1. Rich Note Cards
Add a "Note Card" tool that creates a styled card with a bold title field and a multi-line body field (two `Textbox` objects grouped with a rounded `Rect` background). Distinct from sticky notes -- these are white, have a subtle shadow, and look like index cards.

### 2. Task/Checklist Objects
Add a "Checklist" tool that places an interactive checklist card on the canvas. Each item is a `Group` of a checkbox rect + text. Clicking the checkbox toggles a checkmark (strike-through text + filled square). Users can double-click to add new items.

### 3. Link Cards
Add a "Link Card" tool -- user pastes a URL into a prompt, and a card is created showing the URL domain + title text. No external API needed; just parses the URL for domain display.

### 4. Connector Lines (Object-to-Object)
Add a "Connector" tool. User clicks a source object, then clicks a target object, and a line is drawn between their centers. On `object:moving`, connected lines update their endpoints. Store connections in a ref map keyed by object IDs.

### 5. Minimap
Render a small (150x100px) overview in the bottom-left corner showing all objects as tiny dots/rectangles. Clicking the minimap pans the viewport to that area. Updates on `after:render`.

### 6. Smart Guides / Snap to Grid
On `object:moving`, calculate alignment with nearby objects and show red guide lines when edges/centers align (within 5px threshold). Optionally snap objects to a configurable grid (20px default).

### 7. Board Templates
Add a "Templates" button in the toolbar that opens a popover with 4 presets:
- **Mood Board**: 3x3 grid of image placeholder frames
- **Project Plan**: columns with headers (To Do / In Progress / Done)
- **Brainstorm**: central topic card with radiating sticky notes
- **Storyboard**: horizontal sequence of numbered frames

Each template places pre-built Fabric objects on the canvas.

### 8. Color Palette Tool
Add a "Swatch" tool that places a row of 5 color circles on the canvas, acting as a visual palette/mood reference. User can change colors by clicking each circle.

---

## Technical Details

### Files Changed

| File | Changes |
|------|---------|
| `src/components/DesktopWhiteboard.tsx` | Add 5 new tools (noteCard, checklist, linkCard, connector, swatch) to Tool type. Add connector tracking refs + update logic. Add smart guide rendering. Add minimap canvas. Add templates popover. Extend `handleToolClick` and keyboard shortcuts. |
| `src/index.css` | Add `.whiteboard-minimap`, `.whiteboard-smart-guide`, `.whiteboard-note-card` styles |

### New Tool Type Additions
```text
Tool union += "noteCard" | "checklist" | "linkCard" | "connector" | "swatch"
```

### Connector Architecture
- `connectionsRef = useRef<Map<string, {from: string, to: string, line: Line}>>()`
- Assign unique IDs to objects via `obj.set('data', { id: nanoid() })`
- On `object:moving`, iterate connections and update line coordinates
- Connector mode: first click sets source, second click draws line

### Smart Guides
- On `object:moving`, compare active object edges (left, right, center, top, bottom, middle) against all other objects
- Render temporary `Line` objects (red, 1px) as guides
- Remove guides on `object:modified`

### Minimap
- Secondary offscreen canvas (150x100) rendered in a `div` overlay
- Re-render on `after:render` by iterating objects and drawing scaled rectangles
- Click handler calculates viewport pan target from click position

### No new dependencies required -- all built with existing Fabric.js primitives.

