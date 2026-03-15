

## Learning Hub UI Overhaul

### Problems Identified
1. **LearningHub.tsx**: Generic header, cramped 5-col tab bar (especially on the 448px viewport), no visual hierarchy
2. **E-Reader**: Minimal toolbar, no reading controls, hard-coded `h-[calc(100vh-12rem)]` doesn't maximize space, fullscreen mode lacks proper dark background/controls overlay
3. **Books section**: Dense card grid with tiny text, view toggle buttons feel disconnected, resources grid is plain
4. **Courses/Videos/Topics/Exams**: Each tab has inconsistent spacing and empty states

### Plan

#### 1. Redesign LearningHub.tsx — Tab Navigation
- Replace 5-col grid `TabsList` with a horizontally scrollable pill-style tab bar (works on 448px viewport)
- Add subtle icon + label with active indicator animation
- Remove the generic subtitle, make the header compact (per space-optimization memory)

#### 2. E-Reader Overhaul (LearningBooks.tsx reader section)
- **Immersive reader**: When in reader mode, use `fixed inset-0 z-50` with dark background to fill the entire viewport — not just `calc(100vh-12rem)`
- **Floating toolbar**: Semi-transparent top bar that auto-hides after 3s of inactivity, shows on mouse move/tap. Contains: back button, book title, fullscreen toggle
- **Better fullscreen**: The `fixed inset-0` approach already gives near-fullscreen; the native fullscreen button becomes a true edge-to-edge toggle
- **Loading state**: Show a skeleton/spinner overlay while iframe loads
- **Keyboard shortcut**: Escape key exits reader

#### 3. Books Search View Polish
- Larger cover images with aspect-ratio containers
- Source badge as a colored dot/icon instead of text badge to save space
- Cleaner card layout: cover on top, title/author below, action buttons as icon-only on hover
- Remove "Borrow" badges (per user's earlier request — only full-text free books)

#### 4. Books Resources View
- Render as a cleaner 2-column list with icons per category instead of card grid (less visual noise)

#### 5. Videos/Courses/Topics/Exams — Consistent empty states
- Unified empty state component with better illustrations
- Consistent search bar styling across all tabs

### Files to Modify
- `src/components/LearningHub.tsx` — scrollable tab bar, compact header
- `src/components/learning/LearningBooks.tsx` — immersive reader, card polish, resources cleanup
- `src/components/learning/LearningVideos.tsx` — minor spacing consistency
- `src/components/learning/LearningCourses.tsx` — minor spacing consistency  
- `src/components/learning/LearningExams.tsx` — minor spacing consistency
- `src/components/learning/LearningTopicMaps.tsx` — minor spacing consistency
- `src/index.css` — add reader auto-hide toolbar animation classes

