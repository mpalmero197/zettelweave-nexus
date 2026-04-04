

# Enhance the 3D Knowledge Graph

## Current Gaps
- All nodes are the same blue color regardless of category
- No hover tooltip / detail preview
- No particle effects on edges
- No bloom/glow post-processing
- No starfield or atmospheric background
- No click-to-focus camera animation
- No auto-rotate toggle
- Connections are plain static lines

## Plan

### 1. Category-Colored Nodes with Glow
Map each Dewey category to a distinct color (using the existing category CSS vars). Add emissive glow to all nodes, stronger for highlighted/search matches. Use `MeshPhysicalMaterial` for a glassy, reflective look instead of `meshStandardMaterial`.

### 2. Hover Tooltip with Card Preview
On pointer hover, show an HTML overlay (using drei's `Html` component) displaying the card title, category name, tag badges, and a truncated content preview. Fades in/out smoothly.

### 3. Click-to-Focus Camera Animation
When a node is clicked, smoothly animate the camera to orbit around that node (lerp camera target). Add a "Reset View" button to return to default position.

### 4. Bloom Post-Processing
Add `@react-three/postprocessing` with `Bloom` effect for a neon glow on emissive node materials and connection lines. Subtle but impactful.

### 5. Animated Edge Particles
Replace static lines with animated dashed lines (using `LineDashedMaterial` with animated dash offset) to show "flow" between connected nodes.

### 6. Starfield Background
Add drei's `Stars` component for an ambient cosmic particle background behind the graph.

### 7. Auto-Rotate Toggle
Add an auto-rotate button to the controls panel. When enabled, the graph slowly spins for a showcase effect.

### 8. Neighborhood Highlight
On node hover, highlight all directly connected nodes and dim everything else, making the local cluster pop.

## Files to Edit
- `src/components/Graph3D.tsx` — All visual and interaction improvements

## Dependencies
- `@react-three/postprocessing` — for Bloom effect (will need to install)

## Technical Notes
- Category color map: 10 distinct hues mapped from the Dewey `000`–`900` ranges
- `Html` from drei renders React DOM inside the 3D scene for tooltips
- Bloom uses `UnrealBloomPass` under the hood, configured with low intensity for subtlety
- Camera animation via `useFrame` lerping `controls.target` and `camera.position`

