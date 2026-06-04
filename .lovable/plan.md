
## Context

This is a Vite/React SPA hosted on Lovable (Cloudflare edge), with Supabase as the backend. Most of the pasted findings come from a generic web scanner and **do not apply** to this stack:

- No Nginx/Apache to configure (Lovable hosting is managed).
- `/admin`, `/api`, `/wp-admin`, `/phpmyadmin`, `/graphql`, `/swagger`, `/actuator`, `.git`, `.aws/credentials`, `/server-status` — the scanner reports these as "accessible" because the SPA returns `index.html` (HTTP 200) for **every** unknown path (SPA fallback). They are not real endpoints. `/admin` is a client-side React route already gated by Supabase auth + `has_role('admin')` RLS.
- HTTP `PUT/DELETE/PATCH` on `/` "succeed" for the same reason — static hosting returns the SPA shell. There is no server route to mutate.
- TLS, HSTS, SPF, CAA, WAF, rate limiting — handled by Cloudflare/Lovable infrastructure, not editable from the repo.
- Auth/session/MFA/password policy — already provided by Supabase Auth (this project uses it).

What we **can** meaningfully improve from this codebase:

## Plan

### 1. Add real security response headers via `index.html` meta + edge

Add the following via `<meta http-equiv>` in `index.html` (the only mechanism available without server config):
- `Content-Security-Policy` — scoped to actually-used origins: `self`, Supabase (`*.supabase.co`), Lovable Cloud, Google Fonts, Stripe, YouTube/Vimeo embeds, ipapi/Open-Meteo/Nominatim, HuggingFace, Open Library/Gutenberg. Start with `Content-Security-Policy-Report-Only` so we can verify nothing breaks before enforcing.
- `Referrer-Policy: strict-origin-when-cross-origin` (confirm/keep).
- `X-Content-Type-Options: nosniff`.
- `Permissions-Policy: camera=(self), microphone=(self), geolocation=(self), interest-cohort=(), payment=(self), usb=()` — note we keep `camera/mic` as `self` because Recorder Studio uses them, and `payment=self` for Stripe.

Note: `X-Frame-Options`, `HSTS`, and `frame-ancestors` cannot be set via `<meta>` — those must remain on Cloudflare. I'll document this in `SECURITY_ARCHITECTURE.md`.

### 2. Tighten `public/robots.txt`

Remove the `Disallow: /api/` and `Disallow: /admin` lines (they leak the existence of those client routes without providing security). Keep crawler allow/deny logic for legitimate SPA routes.

### 3. Sanitize CSP in `src/utils/security.ts`

The existing `setSecurityHeaders()` injects an outdated, overly permissive CSP at runtime (allows `'unsafe-eval'`, no `frame-ancestors`, etc.) and is never called. Either remove it or replace its body with a no-op + comment pointing to the meta tag (single source of truth).

### 4. Document the real model in `SECURITY_ARCHITECTURE.md`

Add a "Why scanner findings don't apply" section explaining SPA fallback behavior, where headers actually come from (Cloudflare), how Supabase Auth + RLS provides the real authorization boundary, and which findings are accepted-risk vs. mitigated.

### 5. Supabase-side checks (read-only verification)

Run `supabase--linter` and `security--run_security_scan` to confirm no real RLS/grant gaps. Address only what they flag — no speculative migrations.

### Out of scope (explicitly not doing)

- Nginx/Apache snippets — no such server exists.
- Blocking `/admin`, `/api`, etc. — these are SPA client routes, not server endpoints; the meaningful protection is Supabase RLS, which is already in place.
- HSTS/CAA/SPF/WAF/TLS — infrastructure-level, configured outside this repo.
- MFA/password policy changes — already enforced via `useAuth.ts` (8+ chars, complexity) and Supabase; tightening further is a separate UX decision.

### Technical details

Files to edit:
- `index.html` — add `<meta http-equiv="Content-Security-Policy-Report-Only" content="...">` and `<meta http-equiv="Permissions-Policy" ...>`.
- `public/robots.txt` — drop `Disallow: /api/` and `Disallow: /admin`.
- `src/utils/security.ts` — neutralize `setSecurityHeaders()`.
- `SECURITY_ARCHITECTURE.md` — append scanner-findings + headers section.

After ~1 week of monitoring CSP report-only violations, flip to enforcing `Content-Security-Policy` in a follow-up change.
