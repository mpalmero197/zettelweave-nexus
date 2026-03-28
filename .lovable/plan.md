

# Mobile Focus Mode — Compact Pomodoro Overlay

## Problem
The Focus Sidebar is desktop-only (hidden behind `md:flex` on the header button, and renders as a full-height 300px-wide panel that covers the entire mobile screen). Users need a lightweight way to run Pomodoro sessions on mobile that works **alongside** other apps — meaning it should be minimal, non-blocking, and usable in a split-screen or quick-glance pattern.

## Design

A **two-layer mobile experience**:

1. **Persistent Mini Pill** — A small floating pill (like a music player mini-bar) fixed at the top of the screen showing: timer countdown, active task name, and play/pause. Always visible when a focus session is active. Tapping it expands to the full view.

2. **Full Mobile Focus Sheet** — A bottom Sheet (85vh) opened either from the mini pill tap or from the FAB menu. Contains the timer, task list with linked cards/notes, and controls — all touch-optimized with 44px+ targets.

```text
┌─────────────────────────┐
│ ⏱ 18:42 · Write draft ▶│  ← Mini pill (fixed top, only when timer active)
├─────────────────────────┤
│                         │
│    [Rest of app]        │
│                         │
└─────────────────────────┘

Tap pill → opens:
┌─────────────────────────┐
│  ──── (drag handle)     │
│                         │
│      ⏱ 18:42            │  ← Large timer ring
│   Focus · Short · Long  │
│   [  ▶ Start  ] [↺]    │
│                         │
│  ─── Priority Tasks ─── │
│  ☑ Write draft    ●red  │  ← Active task highlighted
│    📎 Card: Research    │  ← Linked items inline
│    📎 Note: Outline     │
│  ☐ Review PR      ●yel │
│  ☐ Email team     ●grn │
│                         │
└─────────────────────────┘
```

## Changes

### 1. Add Focus entry to Mobile FAB menu
**File**: `src/components/MobileNavigation.tsx`
- Add a "Focus" item with the `Focus` icon to the Planner section of the SECTIONS array

### 2. Create Mobile Focus Sheet component
**File**: `src/components/focus-sidebar/MobileFocusSheet.tsx` (new)
- Bottom-anchored Sheet (85vh) with the same `useFocusState` hook
- Touch-optimized layout: large timer ring at top, mode buttons, play/pause/reset
- Active task name displayed prominently below timer
- Simplified task list: shows tasks with checkboxes, priority dots, linked card/note count
- Tapping a task's linked items expands inline to show them (same `FocusTaskList` but with larger touch targets)
- Add task input at bottom with larger hit area

### 3. Create Floating Mini Pill
**File**: `src/components/focus-sidebar/FocusMiniPill.tsx` (new)
- Only renders on mobile AND when a focus session is running (`isRunning === true`)
- Fixed position at top of screen (below header, `top: 3rem`)
- Shows: timer countdown (MM:SS), truncated active task title, play/pause button
- Tap anywhere on the pill (except play/pause) opens the full Mobile Focus Sheet
- Subtle glassmorphic style matching the sidebar aesthetic
- Pulses gently during work mode (same `focus-pulse` animation)

### 4. Wire into AppLayout
**File**: `src/components/AppLayout.tsx`
- Import and render `FocusMiniPill` (it self-manages visibility based on mobile + running state)
- The existing desktop `FocusSidebar` stays unchanged
- Pass a shared mechanism: the mini pill and mobile sheet both use `useFocusState` which reads from localStorage, so they share state automatically

### 5. Adjust existing FocusSidebar for mobile
**File**: `src/components/focus-sidebar/FocusSidebar.tsx`
- On mobile, don't render the full sidebar at all (return null when `isMobile`)
- Mobile users use the Sheet + Mini Pill instead

## Technical Details

- **State sharing**: `useFocusState` persists to localStorage, so the mini pill and sheet both read the same state. No prop drilling needed — each component instantiates the hook independently.
- **No new dependencies**: Uses existing Sheet, Button, Checkbox components
- **Touch targets**: All interactive elements ≥ 44px height on mobile
- **Works alongside other apps**: The mini pill is compact enough for split-screen use; the sheet dismisses easily with a swipe down

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/focus-sidebar/MobileFocusSheet.tsx` | Full mobile focus view as bottom Sheet |
| `src/components/focus-sidebar/FocusMiniPill.tsx` | Floating mini timer pill for mobile |

### Files to Edit
| File | Changes |
|------|---------|
| `src/components/focus-sidebar/FocusSidebar.tsx` | Return null on mobile |
| `src/components/MobileNavigation.tsx` | Add Focus item to Planner section |
| `src/components/AppLayout.tsx` | Import and render FocusMiniPill |

