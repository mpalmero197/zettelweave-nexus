
# Feature Trim + Speed Overhaul

## Part 1 — Feature removals & merges

### Knowledge Graph
- **Remove**: 3D graph view, orbital model, mobile-optimized graph variant. Delete `three`, `three-stdlib`, `@react-three/fiber`, `@react-three/drei`, `3d-force-graph` from bundle.
- **Keep**: 2D star-schema graph only, lazy-loaded behind explicit "Open Graph" button (no eager mount).
- **Files**: delete `KnowledgeGraph3D.tsx`, `OrbitalGraph.tsx`, `MobileGraph*.tsx`, related hooks. Strip graph routes/tabs that auto-mount.

### Linked Items panel (new)
- New `LinkedItemsPanel.tsx` rendered in NoteViewer, CardViewer, and Catalyst sidebar.
- Sections: **Backlinks** (notes/cards linking here, with ~100-char snippet), **Outgoing links** (wikilinks resolved), **Sibling cards** (same Dewey category), **Related by tag**.
- Single batched RPC `get_linked_items(item_id, item_type)` returning all four buckets in one round-trip.

### Notifier consolidation
- Merge `alice-proactive-notifier`, `alice-proactive-pulse`, `generate-daily-briefing`, `daily-report`, `send-engagement-nudges` into **one** scheduled edge function `unified-notifier` running once at 6 PM CT.
- Single `in_app_notifications` write path; drop `alice_pulses` + `daily_briefings` cron triggers.
- Keep tables for history; remove duplicate widgets from dashboard.

### Mind Map Generator
- Remove standalone tool/route. Move "Generate Mind Map" as a button inside Canvas Studio (already unified per memory).
- Delete `MindMapGenerator.tsx` page; keep `generate-mindmap` edge fn (called from Canvas).

### Marketing Funnel Quiz
- Remove from Landing page entirely. Delete `MarketingQuiz.tsx`, route, `quiz_funnel_leads` writes (keep table for historical data).

## Part 2 — Speed overhaul

### Bundle splitting
- Route-level: every page already lazy via `React.lazy` — audit and add `prefetch` hints only for likely-next routes.
- Feature-level lazy chunks:
  - `editor` chunk: all `@tiptap/*` extensions, `lowlight`, `RichTextEditor` — only loaded when editor mounts.
  - `pdf` chunk: `jspdf`, `html2canvas`, `pdf-lib` — only on export.
  - `graph` chunk: 2D graph + `react-force-graph-2d`.
  - `canvas` chunk: `fabric`, canvas drawing tools.
  - `media` chunk: recorder/transcribe UI.
- Update `vite.config.ts` `manualChunks` to add: `editor-vendor`, `pdf-vendor`, `graph-vendor`, `canvas-vendor`, `chart-vendor` (recharts).

### AppLayout slimming
- Defer ALICE floating button, presence subscription, item-sharing realtime, focus sidebar, cookie consent, push notifications until after first interaction (`requestIdleCallback`).
- Move `CosmicBackground` to CSS-only gradient by default; animated aurora only when Low Power Mode is OFF *and* user has been idle past first paint.
- Remove duplicate `MobileDetector` wrapping (currently nested twice in App.tsx).

### Query batching
- New RPC `get_workspace_bootstrap(user_id)` returning in one round-trip: profile, subscription, dashboard_layout, user_preferences, unread notification count, recent items (top 10 per type). Replaces 6+ parallel queries on app mount.
- Drop the 3s extension polling on web app (only run inside extension context — web app already has realtime).
- Realtime: subscribe to a single multiplexed channel, not one per table.

### Virtualized lists
- Add `@tanstack/react-virtual` to NotesWorkspace list, CardsWorkspace list, Search results, Notifications, ALICE chat history.
- Threshold: virtualize when list > 50 items.

### Image optimization
- Add `vite-imagetools` plugin.
- Convert hero/landing images to AVIF + WebP with `<picture>` fallbacks.
- Add `loading="lazy"` + explicit `width`/`height` to all `<img>` (CLS fix).
- Preload only the LCP hero image with `fetchpriority="high"`.

### Misc speed wins
- Drop `next-themes` system check on every page (read once at bootstrap).
- Replace heavy `recharts` charts on admin with `chartist`-style SVG mini-charts where possible (or keep lazy).
- Add `<link rel="preconnect">` for Supabase + Lovable AI gateway in `index.html`.
- Service worker: cache `/assets/*` immutable, network-first for HTML.
- Tree-shake `lucide-react` icon imports already named imports — verify, no barrel.

## Part 3 — Execution order (so preview never breaks)

```text
1. vite.config.ts manualChunks + preconnects
2. AppLayout slimming + dedupe MobileDetector
3. Delete 3D graph + orbital + mobile graph files; strip routes
4. Remove Mind Map Generator route; remove Marketing Quiz
5. Build Linked Items panel + RPC migration
6. Wire Linked Items into Note/Card viewers
7. Consolidate notifiers (new unified-notifier fn, disable old crons)
8. Add workspace-bootstrap RPC + replace parallel queries
9. Editor lazy-chunk: dynamic-import RichTextEditor in viewers
10. Virtualize Notes/Cards/Search lists
11. vite-imagetools + landing image conversion
12. Remove dead deps: three, @react-three/*, 3d-force-graph
13. Update memory index (remove deprecated features)
```

## Out of scope
- No data deletion (quiz_funnel_leads, alice_pulses tables remain for history).
- No changes to writing/editor UX, ALICE personality, or visual design.
- No subscription/pricing changes.

## Estimated impact
- Initial JS bundle: ~−40% (three.js + extra graphs + quiz removed, editor lazy).
- TTI on `/app/hub`: ~50% faster after bootstrap RPC + AppLayout defer.
- Tab switches inside app: near-instant after virtualization + chunk split.
