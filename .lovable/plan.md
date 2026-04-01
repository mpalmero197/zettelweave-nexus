

# Make the Focus/Pomodoro Sidebar More Comprehensive

## Current State
The sidebar has: timer ring, work/short-break/long-break modes, task list with priorities, linked cards/notes, drag reorder, DND mode, cycle counter, and a reading view. Desktop lacks custom duration picker (mobile has it). No session history, goals, stats, ambient sounds, or session notes.

## Plan

### 1. Add Custom Duration Picker (Desktop)
Add the same duration selector chips (15, 20, 25, 30, 45, 60 min) that mobile already has, placed below the mode buttons. Clicking the timer display toggles the picker.

### 2. Add Daily Focus Stats Panel
A collapsible stats section between the timer and task list showing:
- **Sessions completed today** (count + mini progress bar toward daily goal)
- **Total focus minutes today**
- **Current streak** (consecutive days with at least 1 session)
- **Daily goal ring** (e.g., "4/8 sessions")

Persist stats in localStorage keyed by date.

### 3. Add Session History Log
A collapsible "Session Log" section at the bottom showing the last ~10 completed sessions with: timestamp, duration, mode, and which task was active. Stored in localStorage.

### 4. Add Daily Goal Setting
A small editable target (default: 8 sessions/day). Shown as a subtle progress indicator in the stats panel. Persisted in localStorage.

### 5. Add Auto-Start Toggle
An option to automatically start the next session (work → break → work) after a 5-second countdown, with a cancel button. Small toggle in the timer controls area.

### 6. Add Ambient Sound Selector
A minimal dropdown with 4-5 built-in ambient options using Web Audio API oscillators/noise generators:
- None, White Noise, Brown Noise, Rain (synthesized), Binaural Focus
Plays only during work sessions. Volume slider. No external audio files needed.

### 7. Add Session Notes
When a work session completes, show a small optional text input to jot a quick note about what was accomplished. Notes are saved to the session history log.

## Files to Edit
- `src/components/focus-sidebar/useFocusState.ts` — Add stats tracking, session history, daily goal, auto-start logic
- `src/components/focus-sidebar/FocusSidebar.tsx` — Add custom duration chips, stats panel, session log, ambient sound selector, auto-start toggle, session notes prompt
- `src/components/focus-sidebar/FocusTimerRing.tsx` — Add daily goal ring overlay (optional secondary ring)
- `src/components/focus-sidebar/MobileFocusSheet.tsx` — Mirror new features (stats, session log, ambient sounds)

## Technical Approach
- All new state persisted via the existing localStorage mechanism in `useFocusState`
- Ambient sounds via `OscillatorNode` / `AudioContext` — zero external dependencies
- Session history capped at 50 entries, auto-pruned
- Stats computed from session history on render (no separate tracking needed)
- Auto-start uses a 5-second `setTimeout` with visual countdown in the timer ring area

