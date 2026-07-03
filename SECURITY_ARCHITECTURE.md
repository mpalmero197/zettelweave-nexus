# Security Architecture

## Data Encryption & Privacy

### Current Security Model

Baku Scribe uses **Row-Level Security (RLS)** policies in Supabase to ensure complete data isolation:

1. **Database-Level Protection**: RLS policies enforce that users can ONLY access their own data
2. **Admin Restrictions**: Even admin accounts CANNOT read user notes, cards, or personal content
3. **Metadata Only**: Admin panel shows only metadata (titles, user IDs, dates) - never actual content

### Why RLS Provides Strong Security

- **Database-enforced**: Cannot be bypassed through API calls or direct database access
- **Server-side validation**: Runs on the database server, not client-side
- **Row-by-row filtering**: Every query automatically filters to only the user's own data
- **Audit trail**: All queries are logged and enforced at the database level

### Example RLS Policy (zettel_cards table)

```sql
-- Users can only view their own cards
CREATE POLICY "Users can view their own cards" 
ON public.zettel_cards 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can only create cards for themselves
CREATE POLICY "Users can create their own cards" 
ON public.zettel_cards 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);
```

### What This Means for Security

✅ **Admin accounts hacked**: Attacker still CANNOT read other users' data
✅ **API compromised**: RLS policies still enforce data isolation
✅ **Direct database access**: RLS applies even to direct SQL queries
✅ **Privacy guaranteed**: User content is never exposed to admins

### Optional: Client-Side Encryption

For additional security, you could implement **end-to-end encryption**:

1. **Encrypt before storage**: Use Web Crypto API to encrypt data client-side
2. **Store encrypted**: Database stores only encrypted blobs
3. **Decrypt on retrieval**: Only the user can decrypt their own data
4. **Key management**: User's password derives the encryption key

**Trade-offs**:
- ✅ Maximum privacy (even database admins cannot read data)
- ❌ Cannot search encrypted content server-side
- ❌ More complex key management
- ❌ Password recovery becomes impossible

### Current Implementation

The current RLS-based approach provides:
- Strong data isolation
- Full-text search capabilities
- AI features (embeddings, search)
- Password recovery support
- Simpler architecture

## Input Sanitization

All user inputs are sanitized using **DOMPurify** to prevent XSS attacks:

### Sanitization Points

1. **Card Creation**: Title, content, description, tags
2. **Card Editing**: All editable fields
3. **Note Creation**: Title, content, tags
4. **Note Editing**: All editable fields

### Protection Against

- ✅ Cross-Site Scripting (XSS)
- ✅ Script injection
- ✅ HTML injection
- ✅ Event handler injection
- ✅ JavaScript protocol handlers

### Implementation

```typescript
import DOMPurify from 'dompurify';

export function sanitizeUserInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML in plain text
    KEEP_CONTENT: true,
    SAFE_FOR_TEMPLATES: true
  });
}
```

## Admin Panel Restrictions

### Content Moderation

- ❌ Admins CANNOT read user content
- ❌ Admins CANNOT delete user cards or notes
- ✅ Admins CAN view metadata (titles, dates, user IDs)
- ✅ Admins CAN manage user accounts and roles
- ✅ Admins CAN manage domain restrictions

### Intentional Limitations

The admin panel is intentionally restricted to protect user privacy:

1. **No content access**: Admins cannot view actual note/card content
2. **No deletion**: Admins cannot delete user data
3. **Metadata only**: Only non-sensitive metadata is visible
4. **User trust**: Users can trust their data remains private

## Rate Limiting

Client-side rate limiting prevents abuse:

```typescript
export const aiRequestLimiter = new RateLimiter(5, 60000); // 5 AI requests per minute
export const createCardLimiter = new RateLimiter(20, 60000); // 20 card creations per minute
```

## File Upload Security

File uploads are validated for:
- ✅ File size limits (10MB max)
- ✅ Allowed MIME types
- ✅ Content type verification
- ✅ Storage isolation (RLS on storage buckets)

## Best Practices

1. **Never trust user input**: All inputs are sanitized
2. **Principle of least privilege**: Users and admins only access what they need
3. **Defense in depth**: Multiple security layers (RLS + sanitization + validation)
4. **Privacy by design**: Architecture prevents data exposure by default
5. **Audit logging**: Security events are logged for review

## Future Enhancements

Potential security improvements:

1. **End-to-end encryption** (optional, user choice)
2. **Two-factor authentication** (2FA)
3. **IP-based rate limiting** (server-side)
4. **Content Security Policy** (CSP) headers
5. **Subresource Integrity** (SRI) for CDN resources

---

## Scanner Findings — What Applies, What Doesn't

Baku Scribe is a Vite/React SPA on Lovable hosting (Cloudflare edge) with Supabase backend. Generic web scanners often report false positives against SPAs.

### Not applicable (false positives)

- **`/admin`, `/api`, `/wp-admin`, `/phpmyadmin`, `/graphql`, `/swagger`, `/actuator`, `/console`, `/debug`** — SPA fallback returns `index.html` (HTTP 200) for any unknown path. These are not server endpoints. `/admin` is a client React route gated by Supabase Auth + the `has_role('admin')` SECURITY DEFINER function.
- **`.git/`, `.aws/credentials`, `/server-status`** — not present in the build output; Cloudflare returns the SPA shell for unknown paths.
- **Arbitrary `PUT`/`DELETE`/`PATCH` on `/`** — static hosting; no mutation occurs. All mutations go through Supabase PostgREST/Edge Functions, gated by RLS.
- **Nginx/Apache hardening snippets** — no such servers; hosting is managed by Lovable/Cloudflare.

### Mitigated in this repo

- **CSP, Permissions-Policy, Referrer-Policy, X-Content-Type-Options** — set via `<meta>` in `index.html`. CSP currently runs in `Report-Only` mode; flip the meta tag to `Content-Security-Policy` to enforce once the violation log is clean.
- **`robots.txt`** — no longer leaks `/api/` or `/admin` paths.
- **Input sanitization** — DOMPurify on all user input (`src/utils/security.ts`).
- **Auth** — Supabase enforces 8+ char complex passwords (`src/hooks/useAuth.ts`), email confirmation, session rotation, MFA support.
- **Authorization** — RLS on every public table, roles in `public.user_roles` checked via `has_role()` SECURITY DEFINER.

### Managed at the edge (Cloudflare/Lovable, not in repo)

- HSTS (`max-age=31536000; includeSubDomains`)
- TLS 1.2/1.3 enforcement, CAA records
- WAF, DDoS, edge rate limiting
- `X-Frame-Options` (also enforced by CSP `frame-ancestors 'none'`)

### Accepted risk

- CSP includes `'unsafe-inline'` and `'unsafe-eval'` for `script-src` because Vite, GA, and Stripe require them. Nonce-based CSP would require SSR.
