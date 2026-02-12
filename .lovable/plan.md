
# Graph View Complete Overhaul

## Problems With the Current Graph

The app has **two** graph components (`GraphView.tsx` at 941 lines and `GraphViewNew.tsx` at 781 lines) doing similar things, creating confusion and bloat. The active one (`GraphViewNew.tsx`, imported as `GraphView`) has these issues:

- **Physics are broken**: The d3-force simulation re-creates on every render because `nodes.length` is in the dependency array, causing flickering and wasted CPU cycles. The simulation mutates node objects directly which conflicts with React Flow's state model.
- **No visual identity**: Nodes are plain dots with text labels floating above them -- no color coding, no visual weight, no personality.
- **Edges are dull**: All edges look identical -- thin grey lines with no differentiation between strong and weak connections.
- **Layouts are static**: Circular, hierarchical, and category layouts just compute positions once with no animation or transition between them.
- **Desktop controls are cramped**: A 240px-wide panel stuffed with buttons and dropdowns.
- **No hover interactions**: No way to explore connections by hovering (the old `GraphView.tsx` had this but the active one doesn't).

## The New Graph Vision

A clean, performant, Obsidian-inspired knowledge graph with:
- **Color-coded nodes** by category with subtle glow effects
- **Smooth animated transitions** between layouts
- **Working physics** that actually settles properly
- **Hover-to-highlight** connection paths
- **Elegant edge styling** that differentiates link types
- **Minimal, floating controls** that don't obstruct the view

## Technical Plan

### 1. Rewrite GraphViewNew.tsx (the active component)

**Node Design:**
- Replace text+dot with compact circular nodes colored by Dewey category
- Node size scales with connection count (more links = larger node)
- Title displayed inside/below the node, truncated to fit
- On hover: node glows, connected nodes highlight, unconnected nodes fade to 20% opacity
- On click: opens card (existing behavior preserved)

**Edge Design:**
- Direct links: solid lines with subtle gradient from source to target category color
- Width scales with link strength (shared tags = thicker)
- On hover over a node: connected edges brighten, others fade
- Remove arrow markers for cleaner look (Obsidian style)

**Physics Fix:**
- Move simulation setup into a stable `useRef`-based pattern that doesn't re-create on every render
- Use `alphaTarget` for smooth start/stop instead of recreating the simulation
- Add proper cleanup with `simulation.stop()` before creating new ones
- Fix the dependency array to only include truly changing values (edge list hash, not `nodes.length`)
- Add velocity capping to prevent nodes from flying off-screen
- Tune forces: stronger center gravity (0.05), moderate charge (-800), link distance proportional to graph density

**Layout Transitions:**
- When switching layouts, animate nodes from current position to target position using `requestAnimationFrame` interpolation over 600ms
- No jarring snap -- smooth easing

**Hover Interactions (from old GraphView, improved):**
- `onNodeMouseEnter`: find all connected node IDs, set them as highlighted
- `onNodeMouseLeave`: clear highlights
- Highlighted nodes: full opacity + glow; non-highlighted: 0.15 opacity
- Highlighted edges: full opacity + thicker; non-highlighted: 0.05 opacity

### 2. Simplify Controls

**Desktop:**
- Floating pill-shaped toolbar at top-center with: search input, layout dropdown, physics toggle, reset button
- Stats badge at bottom-left corner
- Remove fullscreen toggle (React Flow already supports it via Controls)
- Remove separate auto-link/clear buttons from the graph (keep them in card management)

**Mobile:**
- Keep the existing FAB + expandable panel pattern (it works well)
- Clean up the panel content to match the simplified desktop controls

### 3. Delete GraphView.tsx (the old unused one)

The old 941-line `GraphView.tsx` is not imported anywhere active. It will be removed to reduce codebase confusion.

### 4. Update grid-layout.css

Add graph-specific utility styles for node glow effects and edge animations using CSS custom properties, keeping them lightweight.

## Files Changed

| File | Action |
|------|--------|
| `src/components/GraphViewNew.tsx` | Rewrite (new node design, fixed physics, hover interactions, simplified controls) |
| `src/components/GraphView.tsx` | Delete (unused legacy component) |
| `src/styles/grid-layout.css` | Add graph glow/animation utilities |

## What This Achieves

- **Single graph component** instead of two competing ones
- **Fixed physics** that settle smoothly without flickering or infinite re-renders
- **Visual hierarchy** through color-coded, size-weighted nodes
- **Discoverable connections** via hover-to-highlight interaction
- **Smooth layout transitions** instead of jarring position snaps
- **Cleaner controls** that don't compete with the graph for attention
- **Better performance** by eliminating simulation recreation bugs
