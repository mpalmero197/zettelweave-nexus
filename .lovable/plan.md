# Mind Map -- Premium Overhaul

## Vision

Transform the current basic tree renderer into a **Mind Map Studio** -- a visually stunning, interaction-rich canvas experience with organic curved branches, gradient-painted nodes, a minimap navigator, multiple layout modes, and rich node content (notes, icons, priorities). Pure CSS/SVG-driven, no new dependencies.

## Current Problems

- **Flat, lifeless nodes**: Pill-shaped boxes with thin borders look like a wireframe, not a premium tool
- **Rigid layout**: Single left/right radial tree with fixed spacing -- no layout options
- **No minimap**: Large maps require constant panning with no spatial awareness
- **No node richness**: Nodes only hold text -- no icons, notes, priority levels, or visual markers
- **Mechanical connections**: Thin bezier curves with flat color feel utilitarian
- **No visual hierarchy**: Root node and leaf nodes use essentially the same shape -- just different font size
- **Cluttered toolbar**: 15+ tiny buttons in a single row with no visual grouping
- **No search**: Cannot find nodes in large maps
- **No drag-to-rearrange**: Nodes are static; cannot reorder children or move branches
- **Missing quick actions**: No right-click context menu for fast operations
- **Help text wastes space**: Permanent hint text at bottom-left is always visible

## New Architecture

```text
+------------------------------------------------------------+
|  Mind Map Studio                                            |
|  [Layout: Radial | Tree | Org] [Search] [Zoom] [Export]    |
+------------------------------------------------------------+
|                                                             |
|  +--------+                                                 |
|  |Minimap |     (Infinite Canvas)                           |
|  |        |                                                 |
|  +--------+     Organic branches with tapered strokes       |
|                 Gradient-filled nodes with icons/emoji       |
|                 Glow effect on selected branch               |
|                 Hover reveals action ring                     |
|                                                             |
|                     +===========+                           |
|                     |  Central  |  <-- Larger, radial glow  |
|                     |  Topic    |                           |
|                     +===========+                           |
|                    /      |      \                          |
|                  /        |        \                        |
|            [Branch]  [Branch]  [Branch]                     |
|             /    \       |        |  \                      |
|          [...]  [...]  [...]   [...]  [...]                 |
|                                                             |
+------------------------------------------------------------+
|  [Tab] Add child  [Enter] Sibling  [Del] Remove  ...       |
+------------------------------------------------------------+
```

### Key Design Elements

- **Organic tapered branches**: SVG paths with `strokeWidth` that tapers from thick (parent) to thin (child), using gradient strokes matching node colors
- **Rich node cards**: Rounded cards with subtle gradient backgrounds, optional emoji/icon prefix, character-limited note preview, and priority dot
- **Root node aura**: Central topic gets a subtle radial glow/shadow ring that pulses softly, making it the undeniable focal point
- **Action ring on hover**: Instead of scattered buttons, hovering a node reveals a small circular action ring (add child, delete, color, collapse) around the node
- **Minimap**: A small fixed-position overview in the corner showing all nodes as colored dots with a viewport rectangle -- click to navigate
- **Layout modes**: Toggle between Radial (current left/right), Tree (top-down), and Org Chart (top-down with horizontal children)
- **Search overlay**: Cmd+F or search button opens a small search bar that highlights matching nodes and auto-pans to first result
- **Context menu**: Right-click a node for full operations (add, delete, color, duplicate, collapse, add note)
- **Keyboard shortcut bar**: Compact bar at bottom that only shows on first visit, then remembers dismissal
- **Drag-to-rearrange**: Drag a node to reorder it among its siblings

## File Changes

### 1. Full rewrite: `src/components/MindMap.tsx`

Major structural changes:

**Data model expansion** -- Add fields to `MindMapNode`:

- `emoji: string` (optional icon/emoji prefix displayed before text)
- `note: string` (short note shown as a subtle second line)
- `priority: 'none' | 'low' | 'medium' | 'high'` (colored dot indicator)

**Layout engine** -- Refactor `layoutTree` into three modes:

- `radial` (existing left/right split, tuned with better spacing)
- `tree` (top-down: x is horizontal spread, y is depth * V_GAP)
- `orgchart` (top-down but children arranged horizontally)
- Layout mode stored in state, toggled from toolbar

**Minimap component** (inline):

- Fixed 120x80px box in bottom-right corner
- Renders all nodes as tiny 3px colored circles on a scaled-down coordinate system
- Draws a semi-transparent rectangle representing the current viewport
- Click on minimap to pan the canvas to that position
- Collapsible via a small toggle button

**Action ring** (inline):

- On node hover, show 3-4 small circular icon buttons orbiting the node (using absolute positioning + transform)
- Buttons: Add Child, Delete, Color Picker, Toggle Collapse
- Replaces the current scattered hover buttons that appear off-edge

**Search** (inline):

- Small input overlay at top-right of canvas (similar to browser Ctrl+F)
- Filters nodes by text match, highlights matches with a ring, auto-pans to first result
- Up/down arrows to cycle through results

**Context menu**:

- Uses the existing `ContextMenu` component from shadcn
- Right-click a node to get: Add Child, Add Sibling, Edit, Delete, Change Color (submenu), Add Emoji, Set Priority, Duplicate Branch

**Tapered branch rendering**:

- Replace single `<path>` with a `<path>` that uses a linear gradient along its length matching the node color
- `strokeWidth` varies: 3px at parent end, 1.5px at child end (achieved by drawing the curve as a filled polygon or using two parallel paths)
- Simpler approach: just use `strokeWidth={isFromRoot ? 3 : 2}` with opacity gradient

**Node rendering upgrade**:

- Root: Larger rounded rectangle with radial gradient background, subtle box-shadow glow
- Branch nodes: Rounded pill with gradient from node color (15% opacity) to transparent, left color accent bar (3px)
- Emoji displayed inline before text
- Priority dot (4px colored circle) in top-right corner
- Note preview (truncated to ~30 chars) as a faded second line

**Bottom shortcut bar**:

- Slim bar at very bottom with shortcut hints, dismissible via an X button
- Dismissal saved to localStorage (`pendragon-mindmap-hints-dismissed`)

### 2. Minimal CSS additions in `src/index.css`

- `.mindmap-node-glow` -- Subtle animated box-shadow for root node
- `.mindmap-action-ring button` -- Circular buttons with scale-in animation on parent hover
- `.mindmap-minimap` -- Glassmorphic background with border for the minimap panel
- `.mindmap-search-highlight` -- Pulsing ring animation for search-matched nodes

### 3. No other file changes

The Mind Map is self-contained. No changes needed to `AppLayout.tsx`, `MinimalSidebar.tsx`, or `Index.tsx` -- those already wire the `mindmap` tab correctly.

## Technical Details

- **Backward compatibility**: New fields (`emoji`, `note`, `priority`) default to empty/none. Existing saved maps load without issues -- missing fields are filled with defaults on load.
- **Layout modes**: A simple `layoutMode` state drives which layout function runs. All three use the same `layoutTree` entry point with a mode parameter.
- **Minimap**: Calculates a bounding box of all nodes, scales coordinates to fit the 120x80 minimap. Viewport rectangle computed from `pan`, `zoom`, and canvas dimensions. All pure math, no extra rendering library.
- **Performance**: Context menu uses radix primitives (already installed). Action ring uses CSS `opacity` + `scale` transitions triggered by parent `:hover`. No JS animation loops.
- **No new dependencies**: Everything built with existing shadcn components (ContextMenu, DropdownMenu, Input, Button) plus inline SVG.