

# Changelog Timeline -- Landing Page Addition

## Overview

Add a beautiful, clean changelog page accessible from the landing page footer (next to "Terms"), displaying a vertical timeline of all PendragonX updates derived from the project's migration history and feature milestones.

## Changelog Data

Based on database migration timestamps and feature development history:

| Date | Update |
|------|--------|
| Sep 2, 2025 | **Project Launch** -- Core Zettelkasten card system, notes, notebooks, and authentication |
| Sep 7, 2025 | **Database Foundation** -- User preferences, profiles, file storage, and RLS security policies |
| Sep 26, 2025 | **Knowledge Graph** -- 2D/3D graph visualization, card linking, and Dewey/Luhmann organization |
| Sep 27, 2025 | **Calendar & Events** -- Calendar integration linked to cards and notes |
| Sep 29, 2025 | **AI Search** -- Vector embeddings and semantic search across knowledge base |
| Oct 1, 2025 | **File Manager** -- Document uploads (PDF, DOCX, XLSX) with built-in viewer |
| Oct 2, 2025 | **Recycle Bin** -- Soft-delete with configurable auto-cleanup (7/15/30/60 days) |
| Oct 3, 2025 | **AI Assistant** -- Context-aware AI chat using your own notes |
| Oct 5, 2025 | **Whiteboard** -- Infinite canvas with drawing tools, shapes, and sticky notes |
| Oct 7, 2025 | **Audio & Recording** -- Meeting recorder with AI transcription |
| Oct 18, 2025 | **Bullet Journal & Habits** -- Daily planning and habit tracking with streaks |
| Oct 20, 2025 | **Dashboard Widgets** -- Customizable drag-and-drop dashboard with 15+ widgets |
| Oct 24, 2025 | **Admin Panel** -- User management, content monitoring, security audit logs |
| Oct 25, 2025 | **Catalyst Writing Platform** -- Long-form writing with hierarchical chapters |
| Oct 26, 2025 | **Catalyst AI Tools** -- AI chapter generation, citation management, writing goals, export (PDF/DOCX/EPUB) |
| Oct 29, 2025 | **Mobile Optimization** -- Touch-optimized whiteboard, responsive layouts, PWA support |
| Nov 2, 2025 | **Theme System** -- 8 theme options with live preview and performance preferences |
| Nov 10, 2025 | **Encryption & Security** -- End-to-end encryption toggle, security activity log |
| Nov 11, 2025 | **Smart Linking** -- AI-powered content recommendations and similar content detection |
| Nov 24, 2025 | **Import System** -- Obsidian vault, Notion, Roam Research, and markdown import |
| Nov 25, 2025 | **Offline Mode** -- Intelligent caching, offline data manager, PWA install prompt |
| Dec 8, 2025 | **Workflow Automation** -- Automated workflows and agent pipeline builder |
| Dec 16, 2025 | **Landing Page Redesign** -- SEO optimization, FAQ schema, Open Graph images |
| Dec 20, 2025 | **Friends & Collaboration** -- Chat, contact sidebar, collaborative studio |
| Feb 5, 2026 | **Account Management Overhaul** -- Avatar editor, profile settings, debug logs |
| Feb 6, 2026 | **Subscription System** -- Stripe integration, premium tiers, card limits |
| Feb 9, 2026 | **Agents Feature** -- AI agent creation, pipeline builder, activity feed |
| Feb 11, 2026 | **Agent Command Center** -- Fleet dashboard with SVG status rings and unified timeline |
| Feb 15, 2026 | **Persistent Navigation** -- Shared AppLayout with consistent header/sidebar across all pages |
| Feb 16, 2026 | **Mind Map Studio** -- XMind-style mind mapping with minimap, 3 layout modes, context menus, and organic branches |
| Feb 16, 2026 | **Online/Offline Indicator** -- Green/amber status dot with pulse animation in header |

## Design

A dedicated `/changelog` page with a vertical timeline:

- Left side: Date pill (month + day + year)
- Center: Vertical line with dot connectors (primary color dot at each entry)
- Right side: Title (bold) + short description
- Alternating subtle background tints per year for visual grouping
- Scroll-animated entrance (staggered fade-in like the existing landing page sections)
- Mobile: Single-column layout with date above each entry

## File Changes

### 1. New file: `src/pages/Changelog.tsx`

A standalone page matching the landing page style (same header, footer, scroll animations). Contains:
- The timeline data array
- A vertical timeline component with dots, connecting lines, and staggered animations
- Responsive layout (side-by-side on desktop, stacked on mobile)
- Same Pendragon branding header as Landing page
- Footer with same links

### 2. Edit: `src/App.tsx`

Add a lazy-loaded route for `/changelog`:
```
const Changelog = lazy(() => import("./pages/Changelog"));
// Route: <Route path="/changelog" element={...} />
```

### 3. Edit: `src/pages/Landing.tsx`

Add a "Changelog" link in the footer nav (line 406-412), next to "Terms":
```
<button onClick={() => navigate('/changelog')} className="hover:text-foreground transition-colors">Changelog</button>
```

Also add "Changelog" to the landing page header nav for discoverability.

### 4. Minimal CSS in `src/index.css`

One utility class for the timeline connector line:
```css
.changelog-line {
  width: 2px;
  background: linear-gradient(to bottom, hsl(var(--primary)), hsl(var(--border)));
}
```

