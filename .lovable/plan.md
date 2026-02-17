

# Admin Panel -- Premium Overhaul

## Overview

Transform the current Admin panel from a functional but basic dashboard into a polished, premium command center that is powerful on desktop and fully usable on mobile. The overhaul focuses on three pillars: a responsive layout with a mobile-friendly navigation drawer, a redesigned page shell with a unified header and command palette, and visual polish across all sub-pages to match the project's premium glassmorphic aesthetic.

## Current Problems

- **No mobile layout**: The sidebar is a fixed 256px div with no responsive behavior -- it's unusable on small screens
- **AdminSidebar collapses to 64px but has no mobile drawer mode**: On phones, the sidebar simply squishes content
- **Admin.tsx has no top header bar**: No breadcrumbs, no quick actions, no search across admin sections
- **AdminOverview uses mock chart data**: The "Weekly Activity" chart is hardcoded Monday-Sunday values, not real data
- **Duplicate analytics logic**: `AnalyticsDashboard.tsx` and `AdminOverview.tsx` fetch the same data independently -- AnalyticsDashboard is unused
- **No command palette or quick navigation**: Admins must click through sidebar to reach sections
- **Inconsistent section headers**: Some sections have styled headers, others don't
- **SecurityMonitor is basic**: Just shows raw JSON event details with no formatting
- **No real-time indicators**: No live status dots, no auto-refresh, no "last updated" timestamps
- **ContentModeration page title says "Content Stats" in sidebar but component name is "ContentModeration"** -- confusing naming

## Architecture Changes

### 1. Responsive Admin Shell (`Admin.tsx` rewrite)

Replace the current simple `flex` layout with a proper responsive shell:

```text
Desktop (>= 1024px):
+----------+--------------------------------------------------+
| Sidebar  | Header: breadcrumb + search + quick actions       |
| (240px)  |--------------------------------------------------|
|          | Content area (scrollable)                         |
|          |                                                   |
+----------+--------------------------------------------------+

Mobile (< 1024px):
+--------------------------------------------------+
| Header: hamburger + title + quick actions        |
|--------------------------------------------------|
| Content area (scrollable)                         |
|                                                   |
+--------------------------------------------------+
[Sheet drawer slides in from left when hamburger tapped]
```

**Key changes**:
- Add a top header bar with: hamburger menu (mobile), breadcrumb trail, search input (filters sections by name), refresh button, and user avatar
- On mobile, sidebar becomes a Sheet (Radix drawer) that slides in from the left
- Add keyboard shortcut `Ctrl+K` to open a command palette dialog for quick section jumping
- Add "last refreshed" timestamp in the header
- Remove `AnalyticsDashboard.tsx` (unused duplicate)

### 2. AdminSidebar Overhaul (`AdminSidebar.tsx` rewrite)

- Remove the self-managed collapsed state -- the parent now controls visibility via Sheet on mobile and fixed sidebar on desktop
- Add section badges showing counts (e.g., "3 new" next to Error Reports, pending count next to Feature Requests)
- Add a mini status row at the top showing system health (green/yellow/red dot)
- Keep the Privacy Notice footer
- Add smooth transitions between sections using CSS transitions

### 3. AdminOverview Enhancement

- Replace the hardcoded `activityData` array with real data queried from `zettel_cards`, `notes`, and `profiles` tables grouped by day for the past 7 days
- Add a "Platform Health" status strip at the top showing: DB status, Auth status, Edge Functions, Storage -- all as small colored dots with labels
- Add a "Quick Actions" row with buttons: Run Cleanup, Export Data, View Audit Log, Check Security
- Add auto-refresh every 60 seconds with a subtle indicator

### 4. Sub-Page Visual Polish

Apply consistent styling across all admin sub-pages:

**Consistent Section Header Pattern**: Every section gets a standard header component with icon, title, description, and action buttons (refresh, export, etc.) -- extracted into a shared `AdminSectionHeader` component.

**SecurityMonitor Upgrade**:
- Format `event_details` JSON into readable key-value rows instead of raw JSON dump
- Add event type filter dropdown
- Add severity-based color coding
- Show user email instead of user_id (already done in AdminAuditLog, bring pattern here)

**UserManagement Mobile Fix**:
- On mobile, convert the table to a card-based list view (each user as a card with stacked info)
- The current 8-column table is unreadable on mobile

**FeatureRequestsPanel Enhancement**:
- Add vote count sorting
- Add a compact/expanded view toggle

**SystemSettings Enhancement**:
- Add a "System Uptime" indicator (time since page load, simple client-side counter)
- Format the system info section as a clean key-value grid

### 5. Command Palette (`AdminCommandPalette.tsx` -- new component)

A dialog triggered by `Ctrl+K` or a search icon in the header:
- Lists all admin sections with icons
- Fuzzy-filter as you type
- Arrow keys + Enter to navigate
- Uses the existing `cmdk` package (already installed)

## File Changes

### New Files

1. **`src/components/admin/AdminSectionHeader.tsx`** (~40 lines)
   Shared header component accepting: icon, title, description, and action buttons slot. Used by every sub-page for visual consistency.

2. **`src/components/admin/AdminCommandPalette.tsx`** (~80 lines)
   Command palette using `cmdk`. Lists all admin sections. Triggered by Ctrl+K or search icon.

3. **`src/components/admin/AdminMobileNav.tsx`** (~60 lines)
   Sheet-based mobile navigation drawer. Wraps the sidebar nav items in a Radix Sheet that slides from the left.

### Modified Files

4. **`src/pages/Admin.tsx`** (major rewrite)
   - Add responsive shell with header bar
   - Add mobile Sheet drawer integration
   - Add breadcrumb trail
   - Add command palette
   - Add auto-refresh timer for overview
   - Remove unused imports

5. **`src/components/admin/AdminSidebar.tsx`** (moderate rewrite)
   - Extract nav items into a shared constant exportable for command palette
   - Remove self-managed collapse logic (parent controls now)
   - Add notification badges (fetched via props)
   - Simplify to a pure nav list component usable both in sidebar and mobile drawer

6. **`src/components/admin/AdminOverview.tsx`** (moderate edit)
   - Replace hardcoded `activityData` with real database queries grouped by day
   - Add platform health status strip
   - Add quick action buttons row
   - Add "last updated" timestamp display

7. **`src/components/admin/SecurityMonitor.tsx`** (moderate edit)
   - Add event type filter dropdown
   - Format event_details as readable key-value pairs instead of raw JSON
   - Resolve user_id to email using the same pattern as AdminAuditLog

8. **`src/components/admin/UserManagement.tsx`** (moderate edit)
   - Add responsive card-based view for mobile (detect with `useIsMobile` hook)
   - On mobile: render each user as a card instead of a table row
   - Keep desktop table view unchanged

9. **`src/components/admin/FeatureRequestsPanel.tsx`** (minor edit)
   - Add sort-by-votes toggle button
   - Use AdminSectionHeader for consistent styling

10. **`src/components/admin/SystemSettings.tsx`** (minor edit)
    - Use AdminSectionHeader for consistent styling
    - Clean up the system info grid layout

11. **`src/components/admin/ContentModeration.tsx`** (minor edit)
    - Use AdminSectionHeader for consistent styling

12. **`src/components/admin/AdminAuditLog.tsx`** (minor edit)
    - Use AdminSectionHeader for consistent styling
    - On mobile: convert table rows to card layout

13. **`src/components/admin/DomainManagement.tsx`** (minor edit)
    - Use AdminSectionHeader
    - On mobile: convert table to card layout

14. **`src/components/admin/ErrorReportsPanel.tsx`** (minor edit)
    - Use AdminSectionHeader

15. **Delete `src/components/admin/AnalyticsDashboard.tsx`**
    - Unused duplicate of AdminOverview

## Technical Details

- **No new dependencies**: Uses existing `cmdk`, `@radix-ui/react-dialog`, Sheet, and all UI primitives already installed
- **Mobile detection**: Uses existing `useIsMobile()` hook from `src/hooks/use-mobile.tsx`
- **No database changes**: All data comes from existing tables and RPCs
- **Performance**: No new heavy libraries. Charts remain recharts (already loaded). Command palette uses cmdk (already installed). Mobile card views use simple CSS grid/flex
- **Keyboard shortcuts**: `Ctrl+K` / `Cmd+K` for command palette, registered via `useEffect` event listener on the Admin page only
- **Real activity data**: Query `zettel_cards` and `notes` grouped by `date_trunc('day', created_at)` for the past 7 days, using existing Supabase client queries with `.gte()` and client-side grouping (no new database functions needed)

