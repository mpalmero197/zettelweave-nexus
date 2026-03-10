

## Redesign Mobile Navigation: FAB Menu Replacing Bottom Bar + Hamburger

### Current State
- A full-width bottom tab bar with 4 primary tabs + "More" button
- A hamburger menu in the header opens a Sheet with the full `MinimalSidebar` (all sections + sign out, settings, subscription, install, admin)
- The bottom bar duplicates some sidebar items but misses: Graph, Agents, Install App, Subscription, Debugger, Sign Out

### Plan

**1. Replace bottom bar with a Floating Action Button (FAB)**

Replace `MobileNavigation` entirely. Instead of a 5-tab bottom bar, render a single FAB (bottom-right corner, above safe area) that opens a full-screen or near-full-screen Sheet from the bottom.

**2. Comprehensive mobile menu content**

When the FAB is tapped, a bottom Sheet slides up containing ALL navigation organized in categorized sections matching the sidebar:

- **Quick Access** (grid row): Dashboard, Cards, Notes, Calendar, Search
- **Knowledge**: Graph, Files, Canvas Studio
- **Planner**: Journal, Habits, Scratchpad, Sticky Notes
- **Create & Collaborate**: Catalyst, Collab, Recorder
- **Automation**: Agents (with PRO badge if not premium)
- **System**: Recycle Bin, Debugger
- **Footer row**: Install App, Subscription, Settings, Sign Out

Each item shows icon + label in a grid layout (4 columns). Active tab is highlighted. Sign Out uses destructive styling.

**3. Remove hamburger menu from mobile header**

In `AppLayout.tsx`, conditionally hide the hamburger `Sheet`/`SheetTrigger` on mobile (hide with `hidden md:block` or check `useIsMobile`). The header on mobile will just show logo + search/theme buttons. All navigation responsibility moves to the FAB menu.

**4. FAB design**

- Fixed position `bottom-6 right-4`, `z-50`
- 56px round button with a `LayoutGrid` or `Menu` icon
- Animates to an `X` when menu is open
- Subtle shadow and primary color background

### Files to Modify
- `src/components/MobileNavigation.tsx` — Full rewrite: FAB + comprehensive Sheet menu
- `src/components/AppLayout.tsx` — Hide hamburger on mobile, pass `onSignOut`/`onAccountSettings`/`navigate` props to MobileNavigation

