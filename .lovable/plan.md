# Site Issue Backlog (by priority)

Findings below come from Project monitoring, the security scanner, the database linter, and a code scan of card-creation paths. We'll fix them one at a time, top down, and re-verify each before moving on.

## P0 — Security / data exposure

**1. Anyone signed in can read every user's deck share codes**
The share-code policy on the live-deck sharing table only checks that a code has not expired, with nothing tying the row to the requester. Any signed-in user can list all active share codes and use them to view and press buttons on other people's decks.
Fix: remove the blanket read policy and resolve share codes through a security-definer function that requires the exact code, plus an owner-only read policy.

## P1 — Broken user-facing behavior

**2. "Save as card" under an ALICE chat reply fails with a duplicate-key error**
The chat message action still inserts a card with a hard-coded card number, so it hits the unique-number constraint as soon as the user has an existing card. It is the main way to save a reply as a card.
Fix: route it through the existing retry helper used everywhere else.

**3. Quick-create card path still passes a hard-coded number**
The workspace quick-create uses the retry helper but hands it the same fixed number, so it depends entirely on the retry loop instead of generating a unique number up front.
Fix: have the helper own number generation so no caller passes a fixed value.

## P2 — Auth hardening (config, no code)

**4. Leaked-password protection is disabled** — enable it so compromised passwords are rejected at signup and password change.

**5. Postgres has pending security patches** — schedule the database upgrade from the Supabase dashboard.

## P3 — Database hygiene

**6. ~22 security-definer functions are callable by signed-in users**
Each needs a judgment call: the ones intentionally exposed (role checks, share-code resolution, error reporting) stay; internal cron/admin helpers should have EXECUTE revoked from the signed-in role.
Fix: audit the list, revoke where the function is not meant to be called from the client.

**7. One table has row-level security on but no policies**
Effectively unreadable through the API. Either add the intended policies or confirm it is service-role-only by design.

## Notes

- Items 4 and 5 are dashboard settings; I'll point you at them rather than change code.
- Item 6 is the largest and least urgent; it is a review pass, not a single edit.

## Proposed order

1 → 2 → 3 → 4/5 (your action) → 7 → 6

Confirm this order (or tell me to start elsewhere) and I'll begin with the deck-share policy.
