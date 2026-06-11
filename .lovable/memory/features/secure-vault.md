---
name: Secure Vault
description: Device-bound, end-to-end encrypted password vault with WebAuthn PRF keys, TOTP, and ALICE silent OTP autofill bridge
type: feature
---
Routes: /vault.
Tables: `vault_items` (encrypted blob + iv, item_type login/note/card, host hint), `vault_passkeys` (credential_id, prf_salt).
Encryption: WebAuthn PRF extension → HKDF-SHA256 → AES-GCM-256. Key never leaves device. Server only sees ciphertext, label, host.
Auto-lock after 5 min idle. Multi-device by enrolling additional passkeys.
TOTP: RFC 6238 HMAC-SHA1, 6 digits, 30s. Generated in-browser from stored base32 secret.
ALICE bridge: `pendragonx-vault` BroadcastChannel + extension `vault-bridge.js` content script (injected on pendragonx.com / *.lovable.app). New agent action `fill_otp` calls extension → bridge → in-tab vault → returns code. Requires vault unlocked in an open tab. Never exposes TOTP secret outside the page.
Agent safety: still refuses `fill` on `[type=password]` and `[autocomplete^=cc-]`; `fill_otp` is the only sanctioned path for code fields.
