

# Replace Plugin Hub with Integrations Hub

## What Changes

Remove all 22 utility plugins (Calculator, Regex Tester, Pomodoro, etc.) and replace the "Plugins" tab with an **Integrations Hub** — a directory of third-party services users can connect to sync their data with PendragonX.

## Integrations to Include

Each integration card shows: service name, icon, description, connection status, and a connect/disconnect button.

| Integration | What It Does | Implementation |
|---|---|---|
| **Google Calendar** | Two-way sync: PendragonX calendar events appear in Google Calendar and vice versa | OAuth via edge function; Google Calendar API |
| **Notion** | Import Notion pages/databases into Zettelcards and notebooks | Notion API via edge function; export token |
| **Obsidian** | Import/export Obsidian vault folders (.md files) as notes | Local file picker (already partially exists in Import Studio) |
| **OneNote** | Import OneNote sections and pages | Microsoft Graph API via edge function |
| **Google Drive** | Attach and sync files from Google Drive | Google Picker API + Drive API |
| **OneDrive** | Attach and sync files from OneDrive | Already partially built (`oneDriveImport.ts`) |
| **Evernote** | Import Evernote `.enex` exports | Already built (`evernoteImport.ts`) — surface it here |
| **Todoist** | Sync tasks between PendragonX Task Manager and Todoist | Todoist REST API via edge function |
| **Slack** | Send notes/cards to Slack channels; receive Slack messages as notes | Slack connector (available in workspace) |
| **Zapier / Webhooks** | Provide a webhook URL for custom automations | Inbound webhook edge function |

## Plan

### 1. Delete All Utility Plugin Files
- Remove all 22 files in `src/components/plugins/plugins/`
- Remove `src/components/plugins/types.ts` (old plugin type)
- Rewrite `src/components/plugins/PluginHub.tsx` → `src/components/integrations/IntegrationsHub.tsx`

### 2. Create Integrations Hub UI
- New `IntegrationsHub` component with a grid of integration cards
- Each card: service logo/icon, name, description, status badge (Connected / Not Connected / Coming Soon)
- "Connect" button opens a setup dialog specific to each integration
- "Coming Soon" badge for integrations not yet fully wired (users see what's planned)
- Search and category filter (Productivity, Storage, Communication, Import/Export)

### 3. Create Integration Types
- New `src/components/integrations/types.ts` with `Integration` interface (id, name, description, icon, category, status, setupComponent)

### 4. Database: `user_integrations` Table
- Stores which integrations each user has connected
- Columns: `id`, `user_id`, `integration_id`, `access_token` (encrypted), `refresh_token`, `config` (jsonb), `connected_at`, `status`
- RLS: users can only see/manage their own integrations

### 5. Initial Working Integrations (Phase 1)
These will be fully functional on launch:
- **Obsidian Vault Import** — reuse existing file import logic, wrapped in a nice UI
- **Evernote Import** — surface the existing `.enex` parser
- **OneDrive** — surface existing `oneDriveImport.ts`
- **Webhooks** — create an inbound webhook edge function that accepts JSON payloads and creates notes/cards

### 6. "Coming Soon" Integrations
The remaining integrations (Google Calendar, Notion API, OneNote, Google Drive, Todoist, Slack) will show as "Coming Soon" cards. Each requires OAuth setup that the user would need API credentials for — these can be built incrementally.

### 7. Update Navigation
- Rename sidebar item from "Plugins" → "Integrations" with a `Plug` icon
- Update `AppLayout.tsx`, `Index.tsx`, `MinimalSidebar.tsx`
- Update Landing page and Changelog references from "plugins" to "integrations"

## Files to Create/Modify

| Action | File |
|---|---|
| **Delete** | All 22 files in `src/components/plugins/plugins/` |
| **Delete** | `src/components/plugins/types.ts` |
| **Delete** | `src/components/plugins/PluginHub.tsx` |
| **Create** | `src/components/integrations/IntegrationsHub.tsx` |
| **Create** | `src/components/integrations/types.ts` |
| **Create** | `src/components/integrations/IntegrationCard.tsx` |
| **Create** | `src/components/integrations/WebhookSetupDialog.tsx` |
| **Create** | `src/components/integrations/ObsidianImportDialog.tsx` |
| **Create** | `supabase/migrations/...user_integrations.sql` |
| **Modify** | `src/pages/Index.tsx` — swap PluginHub for IntegrationsHub |
| **Modify** | `src/components/MinimalSidebar.tsx` — rename tab |
| **Modify** | `src/components/AppLayout.tsx` — rename tab |
| **Modify** | `src/pages/Landing.tsx` — update copy |
| **Modify** | `src/pages/Changelog.tsx` — update references |

