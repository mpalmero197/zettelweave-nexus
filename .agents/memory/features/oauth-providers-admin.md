---
name: OAuth Providers Admin
description: Admin-only DB-backed OAuth credential store for Google/Microsoft/Notion with self-serve setup UI and instructions
type: feature
---
OAuth provider credentials (Google, Microsoft 365, Notion) are managed from Admin Panel → Security → OAuth Providers, NOT from Supabase env vars.

- Table: `oauth_provider_configs` (provider PK, client_id, client_secret, enabled). Admin-only RLS via `is_admin()`. Service role used by edge functions. `__state__` row holds an auto-generated HMAC signing secret.
- Edge functions: `oauth-admin-config` (admin CRUD, never returns secrets, logs to security_audit_log), `oauth-providers-status` (public list of enabled providers), `oauth-start`/`oauth-callback` read from DB via `_shared/oauth-config-store.ts` (env vars only as legacy fallback).
- IntegrationsHub uses `useEnabledOAuthProviders` hook — connector cards (notion, google-drive/calendar/keep, outlook/outlook-cal/onedrive/onenote) auto-switch from file-import to one-click OAuth when admin enables the underlying provider.
- Each provider in the admin panel has step-by-step setup instructions with live console links and the shared redirect URI displayed prominently with a Copy button.
