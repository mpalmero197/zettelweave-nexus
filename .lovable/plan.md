

# Fix Push Notifications — Actually Deliver Them

## What's Wrong
The `send-reminders` edge function fetches push subscriptions but never sends anything — it just logs "Would send push to..." No VAPID keys exist in the project secrets.

## Plan

### Step 1: Generate VAPID Key Pair
Run a script to generate an ECDSA P-256 key pair. Output the public key (URL-safe base64, 65 bytes uncompressed) and private key (URL-safe base64, 32 bytes raw). These are standard Web Push VAPID keys.

### Step 2: Store VAPID Private Key as Secret
Use the `add_secret` tool to store `VAPID_PRIVATE_KEY` in Supabase Edge Function secrets.

### Step 3: Update Client Public Key
Replace the placeholder `VAPID_PUBLIC_KEY` in `src/hooks/useNotifications.ts` with the matching generated public key.

### Step 4: Implement Web Push in `send-reminders/index.ts`
Rewrite the placeholder (lines 59-65) with actual Web Push delivery using Deno's native `crypto.subtle`:

- **VAPID JWT signing**: Create a JWT with `aud` = push service origin, `sub` = `mailto:` contact, signed with the VAPID private key (ES256)
- **Payload encryption** (RFC 8291): ECDH key agreement with subscriber's `p256dh` key, derive content encryption key via HKDF, encrypt with AES-128-GCM
- **Delivery**: POST encrypted payload to each subscription endpoint with proper `Authorization`, `Crypto-Key`, `Encryption`, and `Content-Encoding` headers
- **Cleanup**: Delete subscriptions that return 404 or 410 (expired/unsubscribed)

### Step 5: Deploy and Verify
Deploy the updated edge function and test by invoking it via `curl_edge_functions`.

## Files to Modify

| File | Change |
|---|---|
| `supabase/functions/send-reminders/index.ts` | Replace placeholder with full Web Push delivery implementation |
| `src/hooks/useNotifications.ts` | Update `VAPID_PUBLIC_KEY` constant to match generated key |

## Technical Detail

All cryptographic operations use Deno's built-in Web Crypto API — no npm dependencies needed:
- `crypto.subtle.importKey` for ECDSA P-256 and HKDF
- `crypto.subtle.sign` for VAPID JWT (ES256)
- `crypto.subtle.generateKey` for ephemeral ECDH key pair
- `crypto.subtle.deriveBits` for shared secret
- `crypto.subtle.encrypt` for AES-128-GCM payload encryption

