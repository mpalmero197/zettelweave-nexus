

# Complete Chat Feature Overhaul

## Overview
Rebuild the ChatPopup from a basic fixed-position card into a polished, modern messenger experience. The FloatingChatBubble panel also gets a visual refresh to match. All changes are CSS/component-level -- no database changes needed.

## What Changes

### 1. `src/components/friends/ChatPopup.tsx` -- Full Rewrite

**Current problems:**
- Generic Card layout with no visual personality
- No typing indicator or message status (sent/delivered/read)
- Messages re-fetch entirely after sending instead of optimistic update
- `onKeyPress` is deprecated (should be `onKeyDown`)
- ScrollArea ref doesn't work properly (ScrollArea wraps a viewport div)
- No date separators between messages from different days
- No empty state personality
- Fixed bottom-right position clashes with FloatingChatBubble

**New design:**
- Sleek messenger-style window with a subtle gradient header showing online status dot and "last seen" text
- Message bubbles with rounded tails (sent = primary gradient with slight rounded-br-sm, received = muted with rounded-bl-sm) for a WhatsApp/iMessage feel
- Date separator pills between message groups (e.g., "Today", "Yesterday", "Jan 12")
- Optimistic message sending: immediately append the message to local state, then confirm via DB
- Proper scroll-to-bottom using a sentinel div with `scrollIntoView`
- Auto-expanding textarea (up to 3 lines) instead of single-line input, for longer messages
- Subtle send button animation (scale on hover)
- Read receipts: double-check icon for read messages, single check for sent
- Typing indicator (3 animated dots) shown briefly after sending to feel alive
- Position offset to avoid overlapping the floating bubble
- Smooth open/close with CSS transition
- Cleanup realtime subscription on unmount (fix missing cleanup)

**Key UX innovations:**
- Messages group by sender: consecutive messages from the same person cluster without repeating the avatar, only showing time on the last message in the cluster
- Emoji-only messages render larger (text-2xl)
- Empty state shows a friendly illustration with the friend's avatar and "Start a conversation with [name]"

### 2. `src/components/FloatingChatBubble.tsx` -- Visual Polish

**Changes:**
- Replace the basic card panel with a cleaner, more compact design
- Message thread previews show relative timestamps ("2m ago", "1h ago")
- Add a subtle pulse animation to the unread badge
- Online friends show a green dot that gently pulses
- Smoother open/close transition (scale + opacity instead of just fade)
- Fix the N+1 query problem in `loadMessageThreads` (currently does individual profile lookups in a loop) -- batch the profile lookups into a single `.in()` query

### 3. Shared utilities

- Add a `formatRelativeTime` helper used by both components for consistent "2m ago" / "Yesterday" formatting
- Add a `groupMessagesByDate` helper to insert date separators
- Add a `isEmojiOnly` helper to detect emoji-only messages

## Technical Details

### Files to create:
| File | Purpose |
|------|---------|
| `src/utils/chatUtils.ts` | Shared helpers: `formatRelativeTime`, `groupMessagesByDate`, `isEmojiOnly` |

### Files to modify:
| File | Scope of change |
|------|----------------|
| `src/components/friends/ChatPopup.tsx` | Full rewrite -- new messenger UI |
| `src/components/FloatingChatBubble.tsx` | Visual polish + fix N+1 query |
| `src/index.css` | Add 2-3 small keyframe animations (typing dots, message slide-in) |

### No database changes needed
The existing `chat_messages` table with `sender_id`, `receiver_id`, `message`, `created_at`, `read_at` already supports everything planned.

### Performance considerations
- Optimistic updates eliminate the full message reload after sending
- Batched profile queries in FloatingChatBubble fix the N+1 problem
- CSS animations use `transform` and `opacity` only (GPU-accelerated, no layout thrashing)
- No new dependencies required

