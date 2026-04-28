# Autonomous SEO/AEO Self-Improvement Engine

## What it does

PendragonX wakes up every 24 hours, researches the latest SEO/AEO best practices using Perplexity (real-time web search), and automatically applies the changes it can do safely on its own. Anything that requires editing React component code is queued for one-click admin approval — never auto-merged.

## Why a two-track system

Auto-applying arbitrary code changes to a live writer-focused product is dangerous (broken builds, wrong content, stale advice). Instead we split improvements into two tracks:

- **Auto-applied (safe)** — data-only changes the engine writes directly to Supabase: meta tag overrides, JSON-LD blobs, `llms.txt`/`llms-full.txt` content, sitemap entries, FAQ entries, redirect rules. The frontend reads these on load.
- **Queued for review (risky)** — code changes (new components, refactors). These become entries in the existing `platform_insights` table tagged `aeo_proposal` and surface in the admin Self-Improvement panel with a "Propose code fix" button that hands off to the existing `propose-code-fix` → GitHub PR pipeline.

## How the daily run works

```text
                cron (3 AM UTC, daily)
                          |
                          v
        +----------------------------------+
        |  seo-aeo-self-improve edge fn   |
        +----------------------------------+
                          |
         1. Perplexity research (sonar-pro)
            "What are the latest SEO/AEO
             techniques in the last 7 days?"
                          |
         2. Diff against applied_techniques
            table to skip what we already did
                          |
         3. Lovable AI classifies each new
            technique:
              - safe_data  -> auto-apply
              - code_change -> queue insight
              - skip        -> log + ignore
                          |
         4a. SAFE_DATA path
             -> write to seo_overrides /
                seo_jsonld / seo_llms_txt
             -> regenerate /llms.txt route
             -> append to sitemap
                          |
         4b. CODE_CHANGE path
             -> insert platform_insights row
                category='aeo_proposal'
                          |
         5. Log run to seo_improvement_runs
            (techniques found, applied, queued)
```

## What can be auto-applied (safe)

1. **Meta tag overrides** — title, description, keywords per route. `SEOHead` already supports overrides; we add a Supabase-backed override layer it merges in.
2. **JSON-LD additions** — new schema types (e.g. WebApplication, Course, VideoObject). The new `SchemaInjector` component reads from a `seo_jsonld` table.
3. **`llms.txt` / `llms-full.txt` updates** — currently static files; we move serving to a Supabase-backed edge function so the engine can rewrite them.
4. **Sitemap entries** — new routes, `<lastmod>` refreshes, priority tweaks.
5. **FAQ entries** — appended to a `seo_faq_entries` table consumed by the `FAQBlock` component (auto-generates FAQPage JSON-LD).
6. **Robots directives** — additive only (never disallow without admin approval).

## What gets queued (never auto-merged)

- Adding new React components or pages
- Changing semantic HTML structure of existing components
- Modifying the routing tree
- Anything touching authentication, payments, or user data
- Anything the AI classifier rates `confidence < 0.8` for safety

## Admin controls

A new "SEO/AEO Engine" tab in the Admin Console shows:

- Last run timestamp + next scheduled run
- Toggle: enable/disable autonomous mode
- Toggle per category: meta tags / JSON-LD / llms.txt / sitemap / FAQ
- "Run now" button
- History table: every technique discovered, source URL, action taken, rollback button
- Pending queued code-change proposals with one-click "Propose fix" → existing PR flow
- One-click rollback for any auto-applied change (reverts the row)

## Rollback safety

Every auto-applied change writes a `before` snapshot to `seo_change_log`. The admin panel exposes a "Revert" button per change. Bulk "Revert last 24h" available.

## Frequency & rate-limiting

- Cron runs once per 24h at 3 AM UTC (off-peak)
- Hard cap: max 5 auto-applied changes per run (prevent runaway)
- Hard cap: max 10 queued proposals per run
- If `platform_insights` already has >20 unreviewed `aeo_proposal` rows, skip the queueing step

## Technical implementation

### New tables (migration)

- `seo_improvement_runs` — `id, started_at, finished_at, techniques_found, applied_count, queued_count, error, raw_research jsonb`
- `seo_applied_techniques` — `id, technique_signature (unique), title, description, source_url, action_type, applied_at` (dedup key so we never re-apply)
- `seo_overrides` — `id, route_pattern, field (title|description|keywords|og_image), value, active, created_at`
- `seo_jsonld` — `id, route_pattern, schema_type, schema_json jsonb, active, created_at`
- `seo_faq_entries` — `id, route_pattern, question, answer, sort_order, active`
- `seo_llms_content` — singleton row, `id, llms_txt text, llms_full_txt text, updated_at`
- `seo_change_log` — `id, applied_technique_id, table_name, row_id, before jsonb, after jsonb, reverted_at`
- `seo_engine_settings` — singleton, `enabled bool, categories jsonb (per-category toggles), last_run_at`

All RLS: admin-only read/write via existing `is_admin()` function. Frontend reads `seo_overrides`/`seo_jsonld`/`seo_faq_entries`/`seo_llms_content` via a public read policy (or via a public edge function so anon clients don't need direct access).

### New edge functions

- `seo-aeo-self-improve` — main daily worker. Calls Perplexity for research, Lovable AI for classification, writes results.
- `serve-llms-txt` — public function that returns the current `seo_llms_content.llms_txt` as `text/plain`. Add a redirect from `/llms.txt` to this function (or update the static file generator).
- `serve-sitemap` — same pattern, returns dynamically generated `sitemap.xml`.

### Existing code touched

- `src/components/SEOHead.tsx` — fetches `seo_overrides` for current route on mount, merges over defaults.
- `src/components/seo/SchemaInjector.tsx` — supports loading additional schemas from `seo_jsonld`.
- `src/components/seo/FAQBlock.tsx` — accepts `seo_faq_entries` rows.
- `src/pages/Admin.tsx` — new "SEO Engine" tab using existing admin tab pattern.
- `index.html` — `<link rel="alternate" href="/llms.txt">` stays; the file becomes dynamic.

### New admin component

- `src/components/admin/SeoEnginePanel.tsx` — settings, run history, applied changes, queued proposals, rollback buttons.

### Cron

Scheduled via `pg_cron` calling `net.http_post` to the edge function (using the daily-report pattern already in the project). 3 AM UTC.

### Secrets

`PERPLEXITY_API_KEY` is already configured. `LOVABLE_API_KEY` already configured. No new secrets needed.

### Memory updates

Add `mem://features/seo-aeo-self-improvement-engine` describing the autonomous engine, two-track design, admin controls, and the technique-dedup signature pattern. Update index.

## Out of scope (explicit)

- Auto-editing React component code (always queued, never merged without admin)
- Auto-changing pricing, copy in landing hero, or anything user-facing-marketing
- Auto-creating routes
- Disabling existing SEO behavior (additive-only by default)
