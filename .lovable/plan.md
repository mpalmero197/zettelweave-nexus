

# Whiteboard Complete Overhaul

## Problems With the Current Whiteboard

### Critical Bugs
- **Canvas re-creates on every color/size/grid change**: The `useEffect` at line 90 has `[penColor, penSize, showGrid]` as dependencies, meaning the entire Fabric canvas is destroyed and rebuilt whenever you pick a new color or toggle the grid. All drawn content is lost.
- **Undo/redo is broken**: `history` and `historyIndex` state variables are declared but never populated -- the undo/redo buttons do nothing.
- **No actual grid rendered**: Toggling "grid" just changes the background from `#F8F9FA` to `#FFFFFF` -- there are no grid lines or dots.

### Design Issues
- **Toolbar is cluttered**: Three separate Sheet panels (Drawing, Shapes, Lines) slide over the canvas to show sub-tools. This is disruptive and hides your work.
- **Fixed 800px height**: The desktop canvas is locked at `h-[800px]`, not truly infinite or even responsive.
- **No keyboard shortcuts**: No way to quickly switch tools, undo, or delete without clicking.
- **Mobile version is too basic**: No zoom, no undo, no stroke size control, limited tools.

## The New Whiteboard Vision

A clean, Excalidraw-inspired whiteboard with a floating toolbar, working undo/redo, a real dot grid, proper infinite canvas, and keyboard shortcuts.

## Technical Plan

### 1. Fix the Canvas Initialization Bug
**File: `src/components/DesktopWhiteboard.tsx`** (rewrite)

Separate canvas creation from tool configuration:
- Canvas init `useEffect` depends only on `[]` (mount once)
- Pen color, size, and brush settings update in a separate `useEffect` that modifies the existing canvas without recreating it
- Grid rendering done via canvas overlay objects, not background color

### 2. Implement Working Undo/Redo
- Save canvas JSON state after every `object:added`, `object:removed`, `object:modified` event
- Cap history at 50 entries to prevent memory bloat
- `historyIndex` tracks current position; undo/redo restore from the stack
- Keyboard shortcuts: Ctrl+Z / Ctrl+Shift+Z

### 3. Render a Real Dot Grid
- Draw small circles in a pattern across the canvas using Fabric objects with `selectable: false` and `evented: false`
- Grid dots are light grey, spaced 30px apart
- Toggle shows/hides the grid group without recreating the canvas
- Grid adjusts when panning/zooming

### 4. Redesign the Toolbar as a Single Floating Bar
Replace the three Sheet-based sub-menus with a single compact floating toolbar:

```text
+------------------------------------------------------+
| Select | Pan | Pen | Shapes v | Text | Sticky | ...  |
+------------------------------------------------------+
```

- **Shapes dropdown**: A small popover (not a Sheet) showing Rectangle, Circle, Triangle, Star, Hexagon as icon buttons in a 3x2 grid
- **Color/size**: A small popover from a color swatch button showing the palette + stroke slider inline
- **Actions**: Undo, Redo, Delete, Clear, Export grouped at the end
- All buttons are icon-only with tooltips for clean appearance

### 5. Make the Canvas Truly Responsive
- Replace fixed `h-[800px]` with `h-full` filling the parent container
- Add `ResizeObserver` to update canvas dimensions when the container resizes
- Smooth zoom with mouse wheel (Ctrl+scroll) clamped to 25%-400%

### 6. Add Keyboard Shortcuts
| Key | Action |
|-----|--------|
| V | Select tool |
| H | Pan tool |
| P | Pen tool |
| R | Rectangle |
| O | Circle |
| T | Text |
| S | Sticky note |
| E | Eraser |
| Delete/Backspace | Delete selected |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Ctrl+A | Select all |
| +/- | Zoom in/out |

### 7. Overhaul Mobile Whiteboard
**File: `src/components/MobileWhiteboard.tsx`** (rewrite)

- Add pinch-to-zoom support using touch events
- Add undo button to the bottom toolbar (most important missing feature)
- Add stroke size toggle (thin/medium/thick) as a simple 3-state button
- Improve the bottom toolbar layout: primary tools on main row, color picker slides up as a secondary row only when a drawing tool is active (keep current pattern but polish)
- Fix canvas init to not depend on `penColor`

### 8. Visual Polish
- Floating toolbar uses `bg-card/90 backdrop-blur-xl rounded-2xl shadow-lg border` for a modern glass look
- Active tool button gets a subtle filled background with smooth transition
- Canvas background uses a warm off-white (`#FAFAF8`) instead of pure white
- Sticky notes get slightly rounded corners and a subtle rotation (1-3 degrees random) for a natural look
- Zoom percentage badge displayed at bottom-right corner

## Files Changed

| File | Action |
|------|--------|
| `src/components/DesktopWhiteboard.tsx` | Rewrite (fix canvas bug, toolbar redesign, undo/redo, dot grid, keyboard shortcuts, responsive sizing) |
| `src/components/MobileWhiteboard.tsx` | Rewrite (pinch zoom, undo, stroke size, polish) |
| `src/components/InfiniteWhiteboard.tsx` | Minor update (pass through any new props if needed) |

## What This Achieves

- **No more data loss** when changing colors or stroke size
- **Working undo/redo** with keyboard shortcuts
- **Real dot grid** instead of a background color toggle
- **Clean single toolbar** instead of three disruptive Sheet panels
- **Responsive canvas** that fills available space
- **Keyboard-driven workflow** for power users
- **Better mobile experience** with pinch zoom and undo

