

# Enhance 3D Knowledge Graph — Full Upgrade

## Summary
Replace the Helix layout with a force-directed physics simulation, add node sizing by connection count, tag filter chips, depth-of-field hop slider, double-click to open cards, and a screenshot export button. All changes in one file: `src/components/Graph3D.tsx`.

## Changes

### 1. Replace Helix with Force-Directed Layout
Remove the `helix` option. Add a `force` layout that runs a simple iterative force simulation (spring-attraction for linked nodes, repulsion between all nodes) computed in `useMemo` with ~80 iterations. This gives organic clustering where hubs pull together and isolated nodes drift apart. No external physics library needed — just a loop over positions.

### 2. Node Size by Connection Count
Scale each node's sphere radius proportionally to its number of connections (`linkedCards.length` + incoming links). Hub nodes become visibly larger (radius 0.35–0.8), making important nodes immediately obvious.

### 3. Edge Thickness by Shared Tags
When two connected nodes share tags, make the edge thicker (lineWidth 1–4) based on the number of shared tags. This visually encodes relationship strength.

### 4. Tag Filter Chips
Add a collapsible "Tags" section in the control panel. Extract all unique tags from cards, display as small clickable chips. When tags are selected, only nodes with those tags (and their direct connections) are shown; others are hidden entirely. A "Clear" button resets the filter.

### 5. Depth / Hop Slider
Add a slider (1–3 hops) that works with the focused node. After clicking a node, the slider controls how many connection hops away from it remain visible. Default: show all. When a node is focused and depth=1, only direct neighbors show; depth=2 includes neighbors-of-neighbors, etc.

### 6. Double-Click to Open Card
Add `onDoubleClick` to each node sphere that calls `onCardSelect`. Single click still does camera focus. This matches the intuitive "click to look, double-click to open" pattern.

### 7. Screenshot Export
Add a camera icon button in the control panel. On click, call `gl.domElement.toDataURL('image/png')` from the Canvas ref and trigger a download. Zero dependencies.

### 8. Layout Dropdown Update
- Remove "🧬 Helix"
- Add "🌐 Force-Directed"
- Keep Sphere, Cube, Category Layers

## Technical Details

**Force simulation** (computed once per card change, not per-frame):
```
for 80 iterations:
  - repulsion: each pair pushes apart (coulomb-like, capped)
  - attraction: linked pairs pull together (spring)
  - dampen velocities
```
Positions stored in the same `nodePositions` record. No animation of the simulation itself — just the final result.

**Screenshot**: Access the Canvas GL context via a `ref` on `<Canvas>`, then `canvas.toDataURL()`.

**Tag filter**: New state `selectedTags: Set<string>`. Cards are pre-filtered before passing to the Scene. The control panel renders tag chips from `useMemo` that extracts unique tags.

**Hop depth**: New state `hopDepth: number | null`. When a node is focused, compute reachable set via BFS up to `hopDepth` levels. Nodes outside the set get `isDimmed`.

## File
- `src/components/Graph3D.tsx` — all changes

