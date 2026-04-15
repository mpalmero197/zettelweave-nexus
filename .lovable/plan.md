

## Plan: Fix 6 Bugs

### 1. Fix Organization Method Edge Function (non-2xx error)

**Root cause**: The `ai-reorganize-cards` and `ai-categorize-card` edge functions return non-2xx status codes (429, 402, 500) which causes `supabase.functions.invoke()` to throw, discarding the response body. The client never sees the specific error message.

**Fix**: Update both edge functions to always return status 200 with `{ ok: false, error: "..." }` for error cases. Update the client-side `handleReorganizeCards` in `Index.tsx` to check `data.ok === false` or `data.error`.

**Files**: `supabase/functions/ai-reorganize-cards/index.ts`, `src/pages/Index.tsx`

### 2. Fix Organization Method Dialog Immediately Closing

**Root cause**: The `OrganizationMethodDialog` uses a `Dialog` with `isOpen` state, but clicking on `Card` elements inside the dialog triggers click propagation that closes it. The `Card` `onClick` sets `selectedMethod` but the dialog's `onOpenChange` also fires from the same interaction.

**Fix**: Add `e.stopPropagation()` to card clicks and ensure the dialog `onOpenChange` handler preserves open state during method selection.

**Files**: `src/components/OrganizationMethodDialog.tsx`

### 3. Fix Smart Linking Assistant

**Root cause**: The `suggest-smart-links` edge function returns non-2xx on errors, causing the same Supabase SDK issue. Also, the function uses `SUPABASE_SERVICE_ROLE_KEY` with user-passed auth header which can cause auth conflicts.

**Fix**: Update the edge function to return 200 with structured `{ ok, suggestions, error }` responses. Fix auth to use anon key + token-based `getUser()`.

**Files**: `supabase/functions/suggest-smart-links/index.ts`, `src/components/SmartLinkingSidebar.tsx`

### 4. Fix Knowledge Chat Button Not Working

**Root cause**: `AppLayout.tsx` `handleTabChange` (lines 101-134) does not include `"knowledge-chat"` in its switch cases. It falls through to the `default` which navigates to `/app` but never dispatches the tab change event.

**Fix**: Add `"knowledge-chat"` to the list of valid tabs in the switch statement.

**Files**: `src/components/AppLayout.tsx`

### 5. Add Search Option to Desktop Header

**Root cause**: The desktop header in `AppLayout.tsx` has no Search button. There's a `search` tab in `Index.tsx` but no way to access it from the persistent desktop header.

**Fix**: Add a Search icon button to the desktop header actions in `AppLayout.tsx` that dispatches the `search` tab change.

**Files**: `src/components/AppLayout.tsx`

### 6. Fix AI Modify Not Creating Cards When Combining Notes

**Root cause**: The `AIModifySidebar` `applyResult` function (line 139-157) only updates existing items — it has no logic to create a new card when combining multiple items. When the AI returns a combined result, it tries to update the first item but doesn't create a new card.

**Fix**: Add a "Save as New Card" button alongside the "Apply" action when the instruction involves combining. When a result's `changes` mentions combining or when multiple items were selected, offer a "Create Card" option that calls `supabase.from('zettel_cards').insert(...)`.

**Files**: `src/components/ai-modify/AIModifySidebar.tsx`

### 7. Fix FloatingChatBubble Crash (Bonus — from console logs)

**Root cause**: `Cannot read properties of null (reading 'substring')` — in `loadMessageThreads`, `msg.sender_id` can be null for system messages, causing `uid` to be null and `uid.substring(0,6)` to crash.

**Fix**: Add null guard for sender_id in the message thread loop.

**Files**: `src/components/FloatingChatBubble.tsx`

### Summary of Files to Edit

| File | Changes |
|------|---------|
| `supabase/functions/ai-reorganize-cards/index.ts` | Return 200 for all responses |
| `supabase/functions/suggest-smart-links/index.ts` | Return 200 for all responses, fix auth |
| `src/pages/Index.tsx` | Handle `data.error` from reorganize |
| `src/components/OrganizationMethodDialog.tsx` | Fix dialog closing on card click |
| `src/components/SmartLinkingSidebar.tsx` | Handle structured error responses |
| `src/components/AppLayout.tsx` | Add `knowledge-chat` to tab switch, add Search button |
| `src/components/ai-modify/AIModifySidebar.tsx` | Add "Create Card" option for combined results |
| `src/components/FloatingChatBubble.tsx` | Null guard for sender_id |

