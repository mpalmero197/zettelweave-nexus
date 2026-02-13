

# Fix Online/Offline Status Indicator

## Problem
The small dot next to "PendragonX" in the header doesn't visually communicate the online/offline state. It uses `bg-foreground/40` (online) vs `bg-muted-foreground/20` (offline) -- both are faint grey tones that are nearly indistinguishable from each other.

## Solution
Change the dot colors to clearly communicate state:
- **Online**: Green dot (`bg-green-500`) with a subtle pulse animation
- **Offline**: Grey/amber dot (`bg-amber-500` or `bg-muted-foreground/50`)

## Changes

### `src/components/MinimalHeader.tsx`
Update the indicator dot (around line 73):
- Online: `bg-green-500` with a soft pulse glow
- Offline: `bg-amber-500` (amber signals degraded/cached mode)
- Slightly increase dot size from `h-1.5 w-1.5` to `h-2 w-2` for better visibility

The dot will also use `navigator.onLine` directly as a fallback so it works even without the full `useOfflineMode` hook's auth dependency, ensuring the indicator always reflects the browser's actual connectivity state regardless of login status.

