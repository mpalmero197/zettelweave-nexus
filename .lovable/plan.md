

## Fix: More Books + Learning Path Mind Maps Not Displaying

### Problem 1: Too Few Books
Line 209 of `LearningBooks.tsx` hard-caps results at 12: `const parsed = accessFiltered.slice(0, 12)`. The API already fetches 100 results, but they get truncated before display.

### Problem 2: Learning Path Mind Maps Show as One Card
The `saveAsMindMap` function in `LearningTopicMaps.tsx` saves data as `{ nodes: [rootNode], edges: [] }` — an **array** with nested `children`. But MindMap's `handleLoadMap` expects `mapData.nodes` to be a **flat object/dictionary** keyed by node ID (e.g. `{ "root": {...}, "node-1": {...} }`). The mismatch means only one entry (array index "0") is processed, and its children are lost since the mind map uses `parentId` references, not nested children.

### Changes

**`src/components/learning/LearningBooks.tsx`**:
- Increase the display limit from 12 to 40 books
- Add a "Load More" button or pagination so users can browse beyond the initial batch

**`src/components/learning/LearningTopicMaps.tsx`**:
- Rewrite `saveAsMindMap` to flatten the hierarchical topic map into the flat `Record<string, MindMapNode>` format that MindMap expects
- Each node needs: `id`, `text`, `x`, `y`, `notes`, `parentId` (instead of nested `children`)
- The root node gets `parentId: null`, all others reference their parent's ID
- Generate edges array from parent-child relationships

