

# Fix Remaining Null Reference Errors in Chrome Extension

## Problem
The `updateAuthUI` function was patched with null checks, but two other functions still access DOM elements without guards:

1. **`handleLogin`** (lines 85-123) -- accesses `auth-email`, `auth-password`, `auth-error`, and `login-btn` elements without null checks on `.value`, `.style`, `.disabled`, `.textContent`
2. **`syncFromCloud`** (lines 158-208) -- accesses `sync-status` without null checks on `.textContent` and `.className`

## Fix

### `public/chrome-extension/popup.js`

**`handleLogin` function:** Add null guards before accessing `.value`, `.style`, `.disabled`, and `.textContent` on all four DOM elements (`auth-email`, `auth-password`, `auth-error`, `login-btn`). Use optional chaining and early returns where elements are missing.

**`syncFromCloud` function:** Add null guard for `sync-status` element before setting `.textContent` and `.className`.

This is a straightforward defensive-coding pass -- same pattern already applied to `updateAuthUI`.

