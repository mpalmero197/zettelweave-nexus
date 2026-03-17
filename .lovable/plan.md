

## Navigation Redesign: Top Bar with Category Dropdowns

### Analysis

The current navigation requires clicking a hamburger menu to open a Sheet sidebar every time you want to navigate — that's 2 clicks minimum for every action, and the menu items are hidden until opened. With 1112px of viewport width available, there's ample room for a top navigation bar with category dropdowns that surfaces all sections in a single click.

**Recommendation: Top bar with dropdown menus for desktop**, keeping the mobile FAB menu unchanged.

Rationale:
- **Discoverability**: Categories are always visible in the header — no hunting for the hamburger
- **Fewer clicks**: Hover/click a category to see its items, then one click to navigate (1-click vs 2-click)
- **Standard pattern**: Matches what users expect from productivity apps (Notion, Figma, Google Workspace)
- **Space efficient**: The h-10 header already exists; we fill it with useful navigation instead of empty space

### Design

```text
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo] PendragonX •  | Knowledge ▾ | Planner ▾ | Create ▾ | Tools ▾ |     [Agents] [Theme] [⚙] [Feedback] │
└─────────────────────────────────────────────────────────────────────┘

Knowledge ▾ dropdown:        Planner ▾ dropdown:       Create ▾ dropdown:        Tools ▾ dropdown:
┌──────────────────┐        ┌──────────────────┐      ┌──────────────────┐       ┌──────────────────┐
│ 📄 Cards         │        │ 📅 Calendar      │      │ 💡 Catalyst      │       │ 🎙 Recorder      │
│ 📊 Graph         │        │ 📓 Journal       │      │ 👥 Collab        │       │ 🗑 Recycle Bin    │
│ 📖 Notes         │        │ 🎯 Habits        │      │ 🎓 Learning Hub  │       │ 🐛 Debugger      │
│ 📁 Files         │        │ ✏️ Scratchpad    │      └──────────────────┘       └──────────────────┘
│ 🎨 Canvas Studio │        │ 📌 Sticky Notes  │
└──────────────────┘        └──────────────────┘
```

Footer items (Settings, Admin, Subscription, Sign Out) move to a user avatar/gear dropdown on the right side of the header.

### Files to Modify

**1. `src/components/AppLayout.tsx`**
- Remove the Sheet/hamburger sidebar trigger for desktop
- Import and render the new `TopNavBar` component in the header between logo and right actions
- Keep `MinimalSidebar` import only for the mobile Sheet (triggered from MobileNavigation FAB, not header)
- Move Settings/Admin/Subscription/SignOut into a user dropdown menu on the right

**2. `src/components/TopNavBar.tsx` (new file)**
- Renders 4 `DropdownMenu` components side by side: Knowledge, Planner, Create, Tools
- Each dropdown trigger is a compact button with label + chevron
- Each dropdown contains `DropdownMenuItem` entries with icon + label that call `onTabChange(tabId)`
- Hidden on mobile (`hidden md:flex`)
- Accepts `activeTab`, `onTabChange`, `isAdmin`, `hasPremium` props
- Active category gets a subtle underline/highlight when any of its children is active

**3. `src/components/UserMenu.tsx` (new file)**
- A dropdown triggered by a small gear or avatar icon on the right side of the header
- Contains: Settings, Subscription, Install App, Admin (if admin), Sign Out
- Replaces the footer section of MinimalSidebar for desktop

**4. `src/components/MinimalSidebar.tsx`**
- No structural changes — it remains as the mobile navigation content (used inside the FAB Sheet on mobile)

### Navigation Groups

| Category | Items |
|----------|-------|
| **Knowledge** | Dashboard, Cards, Graph, Notes & Notebooks, Files, Canvas Studio |
| **Planner** | Calendar, Journal, Habits, Scratchpad, Sticky Notes |
| **Create** | Catalyst, Collab, Learning Hub |
| **Tools** | Recorder, Recycle Bin, Debugger |
| **User Menu** (right) | Settings, Subscription, Install App, Admin, Sign Out |

### Key Details
- Dropdown menus use shadcn `DropdownMenu` components (already in the project)
- Each nav category button: `h-7 px-2 text-xs font-medium` to fit the compact h-10 header
- Active state: when any child tab is active, the parent category text gets `text-primary` color
- `Dashboard` is accessed via the logo click (already works) and also appears as first item in Knowledge dropdown
- Agents button stays as a standalone icon button on the right (premium gated)
- Mobile is completely unaffected — the FAB menu continues to handle all mobile navigation

