
### 1. Performance Optimizations (React Rendering & State)
Currently, several major performance bottlenecks exist in the core views that can cause unnecessary re-renders and UI sluggishness as the user accumulates content:
- **Memoize Heavy Computations**: In `src/pages/Index.tsx`, computations like `displayedCards` are calculated on *every single render*. I will wrap these operations in `useMemo` so they only recalculate when their specific dependencies (`filteredCards`, `cardSearch`, `cardSort`, etc.) change.
- **Stable References**: Handler functions passed to cards (like `handleUpdateCard`, `handleDeleteCard`) will be wrapped in `useCallback` to prevent child components from seeing them as "new" props on every render.
- **Component Memoization**: I will wrap heavily repeated components, particularly `ZettelCard`, in `React.memo()` so they only re-render when their specific data changes, vastly improving scroll and typing performance.

### 2. Global Space Optimization & Layout Tightening
Following the global space optimization mandate, I will audit and tighten the UI to maximize screen real estate, particularly for writers:
- **Reduce Wasted Whitespace**: Audit padding and margins across the main shell, dashboard grids, and container elements to eliminate unnecessary vertical gaps.
- **Header & Navigation Density**: Ensure sticky headers and navigation bars take up the minimum required vertical height without sacrificing touch targets, particularly on mobile views.

### 3. Premium Module Visual Polish
Aligning with the "magazine-style" visual hierarchy:
- **Glassmorphic Consistency**: Review and refine the `backdrop-blur` and semi-transparent border utilities (`border-border/60`, `bg-background/95`) to ensure a unified, high-performance premium feel across all toolbars and sticky elements.
- **Typography Refinements**: Subtle tweaks to font weights, letter spacing, and contrast ratios on secondary text to enhance readability for long-form writers.

### 4. SEO & Semantic Structural Integrity
- Ensure the structural layout strictly follows the AEO/SEO guidelines, ensuring valid HTML5 landmarks (e.g., verifying that all content sits properly within a `<main>` tag and logical `<section>` tags are used for different modules).

Would you like me to begin implementing these performance and UI/UX refinements?
