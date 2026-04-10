

# Fix Push Notifications — Actually Deliver Them

## Root Cause

The `send-reminders` edge function **never sends push notifications**. Lines 59-65 contain only a placeholder comment and a `console.log("Would send push to...")`. The VAPID private key was never configured, and no Web Push protocol implementation exists in the function.

The client-side subscription code works (registers service worker, subscribes to push, saves endpoint to DB), but the server never sends anything to those endpoints.

## Fix

### 1. Generate and Store VAPID Keys
- Generate a proper VAPID key pair
- Store `VAPID_PRIVATE_KEY` as a Supabase Edge Function secret
- Update the `VAPID_PUBLIC_KEY` in `useNotifications.ts` to match the generated pair (the current one is a placeholder that may not match any private key)

### 2. Implement Web Push Delivery in `send-reminders`
Replace the placeholder with actual Web Push protocol calls. Deno edge functions can send push notifications using raw `fetch()` with JWT signing — no npm library needed. The implementation will:
- Sign a VAPID JWT using the private key
- Encrypt the payload using the subscriber's `p256dh` and `auth` keys (ECDH + HKDF + AES-GCM per RFC 8291)
- POST the encrypted payload to each subscription endpoint
- Handle expired/invalid subscriptions (delete them on 404/410 responses)

### 3. Ensure Cron Job Is Running
Verify the `pg_cron` schedule for `send-reminders` is active and firing every minute.

## Files to Modify

| File | Change |
|---|---|
| `supabase/functions/send-reminders/index.ts` | Replace placeholder with actual Web Push delivery using VAPID signing and payload encryption |
| `src/hooks/useNotifications.ts` | Update `VAPID_PUBLIC_KEY` to match the generated key pair |

## Technical Note
Web Push payload encryption (RFC 8291) requires ECDH key agreement + HKDF + AES-128-GCM. Deno's `crypto.subtle` API supports all the needed primitives natively, so no external dependencies are required beyond the standard Web Crypto API.

