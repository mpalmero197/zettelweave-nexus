

# Fix: Plugins Button Not Working on Mobile

## Root Cause
In `src/components/AppLayout.tsx`, the `handleTabChange` function uses a switch statement to handle tab navigation. The `'plugins'` case is **missing** from the list of recognized tabs (line 99-125). When "Plugins" is tapped, it falls through to the `default` case which navigates to `/app` but never dispatches the `app-tab-change` custom event — so the tab never actually switches.

## Fix
Add `'plugins'` to the switch statement's list of cases in `handleTabChange`.

### File: `src/components/AppLayout.tsx`
Add `case "plugins":` alongside the other tab cases (around line 120, before the comment `// These are all tabs within /app`).

Single-line change. No other files affected.

