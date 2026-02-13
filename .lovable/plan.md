

# Collab Hub -- Premium Overhaul

## Vision

Transform the current fragmented Collab feature (5-tab panel with redundant search/discover tabs, bulky user cards, and a separate floating chat bubble) into a sleek, unified **Collab Studio** with a modern messenger-inspired layout. Think Discord's clean sidebar meets iMessage's conversational polish -- all CSS-driven, lightweight, no new dependencies.

## Current Problems

- **Too many tabs** (5): Friends, Discover, Messages, Requests, Search -- "Discover" and "Search" do essentially the same thing
- **Bulky user cards** with excessive whitespace, rings, gradients, and hover animations that feel heavy
- **Large header area** (status + visibility settings) takes 40% of above-the-fold space before any content
- **FloatingChatBubble** duplicates friends/messages/requests logic from FriendsPanel
- **No inline chat** -- clicking "Chat" opens a separate floating popup, breaking flow
- **Empty states** are oversized (400px height placeholders)

## New Architecture

A two-column layout inside the collab tab:

```text
+---------------------------+----------------------------+
|     Contact Sidebar       |       Chat / Detail        |
|  (240px, collapsible)     |       (flex-1)             |
|                           |                            |
|  [Search input]           |  [Chat header]             |
|  --- Online ---           |  [Messages area]           |
|  * Alice (online)         |  [Input bar]               |
|  * Bob (busy)             |                            |
|  --- Offline ---          |                            |
|  * Charlie                |  -- or --                  |
|                           |                            |
|  [Requests badge: 2]     |  [Welcome / empty state]   |
|  [Discover people]        |                            |
+---------------------------+----------------------------+
```

### Left Sidebar
- **Compact search bar** at top with instant filtering
- **Friends list** grouped by status (online first, then offline) -- each row is a slim 48px-tall item, not a full card
- **Notification pills**: small badge counts for pending requests and message requests
- **Bottom actions**: "Discover People" button and a compact status/visibility row
- Clicking a friend opens their chat inline on the right

### Right Panel
- **Inline chat** (replaces the ChatPopup floating window when inside the collab tab)
- When no chat is selected: a clean welcome state with "Select a conversation or discover new people"
- **Requests overlay**: a slide-in sheet triggered from the sidebar badge, showing pending/sent requests compactly

### Key Design Decisions
- **No new dependencies** -- pure CSS Grid + existing shadcn components
- **Merge Discover + Search** into a single "Discover" sheet/drawer accessible from sidebar
- **Keep FloatingChatBubble** for when user is on other tabs (it already works independently)
- **Stagger-free rendering** -- remove per-item animation delays that cause jank with many friends

## File Changes

### 1. New: `src/components/friends/CollabStudio.tsx`
The main orchestrator component replacing the current `FriendsPanel` usage in the collab tab. Contains:
- Two-column CSS Grid layout
- Manages selected friend state and inline chat
- Renders `ContactSidebar` + inline `ChatPane`
- Status/visibility controls in a compact bottom bar

### 2. New: `src/components/friends/ContactSidebar.tsx`
Slim sidebar with:
- Search input that filters friends list in real-time (no server call for filtering existing friends)
- Friends grouped by online/offline with compact 48px rows
- Badge indicators for pending requests and unread messages
- "Discover" button opening the discover sheet

### 3. New: `src/components/friends/ChatPane.tsx`
Inline chat panel (reuses logic from ChatPopup but rendered inline, not as a fixed popup):
- Same message loading, real-time subscription, optimistic sending
- Adapts to fill the right column instead of being a fixed-position popup
- Keeps message clustering, emoji detection, read receipts, date separators

### 4. New: `src/components/friends/DiscoverSheet.tsx`
A slide-over sheet combining the old "Discover" and "Search" tabs:
- Search input with server-side search
- Browse all visible users
- Send friend request / message request actions
- Compact user rows (not full cards)

### 5. New: `src/components/friends/RequestsSheet.tsx`
A slide-over sheet for viewing and managing:
- Received friend requests (accept/decline)
- Received message requests (accept & chat / decline)
- Sent requests (cancel)

### 6. Modify: `src/pages/Index.tsx`
- Replace `<FriendsPanel>` with `<CollabStudio>` in the collab tab
- Remove the separate `<ChatPopup>` rendering for `activeChatFriend` when on collab tab (chat is now inline)

### 7. Modify: `src/components/friends/FriendsPanel.tsx`
- Keep the file but deprecate -- all logic moves to the new components
- Or delete entirely if CollabStudio fully replaces it

### 8. Modify: `src/index.css`
- Add minimal CSS for the two-column grid layout and contact row hover states
- Keep existing chat animations (they're already clean)

### 9. Keep unchanged: `src/components/FloatingChatBubble.tsx`
- Continues to work independently for chat access from non-collab tabs
- No changes needed

## Visual Design Principles

- **48px contact rows**: Avatar (32px) + name + status dot + unread badge -- no cards, no rings, no gradients
- **Glassmorphic sidebar**: `bg-card/80 backdrop-blur-sm border-r border-border/50`
- **Smooth transitions**: `transition-colors duration-150` on hover, no staggered animation delays
- **Compact status bar**: status dropdown + visibility toggle in a single 40px-tall bottom bar
- **Empty states**: max 200px tall, subtle icon + single line of text
- **Responsive**: On mobile (< 768px), sidebar collapses to icons-only or becomes a bottom sheet

