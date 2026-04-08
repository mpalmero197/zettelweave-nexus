

# Add Pendragon Platform Report to Admin Console

## Summary
Create a new "Platform Report" edge function that uses AI to analyze the Pendragon website itself (features, gaps, improvements) rather than user content. Add a new admin tab with a "Run Report" button, a schedule timer, and a copyable output box (text or JSON).

## What You'll Get
- A new "Platform Report" tab in the Admin Console sidebar under System
- A button to manually trigger the report
- A scheduler input so you can set when it auto-runs (e.g. daily at 6 PM CT)
- The report output displayed in a text area with copy buttons for plain text and JSON formats

## Changes

### 1. New Edge Function: `supabase/functions/platform-report/index.ts`
- Analyzes Pendragon's feature set by querying database metadata: table counts, edge function count, feature requests, error reports, user growth, agent types, plugin count, storage buckets, etc.
- Sends this platform telemetry to the AI with a prompt asking it to identify missing features, underused capabilities, UX gaps, and improvement recommendations
- Returns the report as both structured JSON and markdown text
- No JWT required (admin-only invocation from client with auth check)

### 2. New Admin Component: `src/components/admin/PlatformReport.tsx`
- "Run Report" button that invokes `platform-report` edge function
- Loading state with spinner while report generates
- Schedule section: an input for cron time (hours/minutes picker) with a "Save Schedule" button that updates a `pg_cron` job via an RPC or direct insert
- Output area: a large read-only textarea showing the report
- Two copy buttons: "Copy as Text" and "Copy as JSON"
- Stores the last report in component state (no persistence needed beyond the session)

### 3. Admin Nav Update: `src/components/admin/adminNavItems.ts`
- Add `{ id: 'report', label: 'Platform Report', icon: FileSearch }` as a sub-item under the "System" group

### 4. Admin Page Update: `src/pages/Admin.tsx`
- Add case `'system-report'` to `renderContent()` switch to render `<PlatformReport />`

### 5. Edge Function Config: `supabase/config.toml`
- Add `[functions.platform-report]` with `verify_jwt = false`

## Technical Details

**Edge function prompt strategy**: Instead of analyzing user cards, the function queries aggregate platform data:
- `SELECT count(*) FROM information_schema.tables WHERE table_schema='public'`
- Count of edge functions from a hardcoded list or config
- Feature request trends (`SELECT status, count(*) FROM feature_requests GROUP BY status`)
- Error report severity distribution
- Agent type usage stats
- User count and growth

The AI prompt asks: "You are a platform architect. Analyze this SaaS product's infrastructure and feature set. Identify gaps, redundancies, underused features, missing integrations, and prioritized improvement recommendations."

**Schedule**: Simple time picker stored in localStorage for now. The actual cron job was already created; the UI just lets the admin adjust the preferred time visually. A future iteration could update the cron schedule via an RPC.

**Copy formats**: Text = raw markdown from AI. JSON = parsed sections `{ overview, gaps, recommendations, priorities }` extracted by the AI in a structured response.

