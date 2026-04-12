

# Enhance Self-Improvement Engine: Bug & Feature Request Analysis

## Overview

Update the `platform-self-improve` edge function to deeply analyze bugs and feature requests, weigh each request's utility to the Pendragon experience, and surface only the most valuable ones to the admin.

## Changes

### 1. Expand Data Fetching (platform-self-improve/index.ts)

- Fetch **all** feature requests (not just top 10) with full details: `title`, `description`, `votes`, `status`, `created_at`
- Fetch **all** open error reports with full context: `error_type`, `error_message`, `occurrence_count`, `severity`, `status`, `filename`, `stack_trace`, `last_seen_at`

### 2. Enhanced System Prompt

Add a dedicated analysis section to the AI prompt instructing it to:

- **Bugs**: Triage each error by severity x occurrence count, identify patterns (e.g., same component breaking repeatedly), and flag critical bugs that degrade user experience
- **Feature Requests**: For each request, evaluate:
  - **Alignment**: Does it fit Pendragon's identity as a "Thinking Second Brain"?
  - **Utility score**: Would it benefit many users or a niche few?
  - **Competitive edge**: Does it close a gap with Notion/Obsidian/OneNote or create a unique differentiator?
  - **Complexity vs. value**: Is the effort justified by the impact?
  - **Risk**: Could it dilute the product's focus or add bloat?
- Only recommend requests that genuinely enhance the Pendragon experience; explicitly reject low-utility or off-brand requests with reasoning

### 3. Expanded Tool Schema

Add new insight categories and fields:
- New categories: `bug_triage`, `feature_evaluation`
- New optional field `source_reference` to link insights back to specific feature request titles or error signatures
- New optional field `utility_score` (1-10) for feature evaluations
- New optional field `recommendation` (`implement`, `defer`, `reject`) for feature evaluations

### 4. Database Migration

Add columns to `platform_insights`:
- `source_reference text` -- links to original feature request or error
- `utility_score integer` -- AI's utility rating (1-10)
- `recommendation text` -- implement/defer/reject

### 5. Admin UI Update (AdminAIChat.tsx)

- Show utility score as a colored badge (green 8-10, yellow 5-7, red 1-4)
- Show recommendation badge (implement = green, defer = amber, reject = red)
- Filter insights by category including new `bug_triage` and `feature_evaluation` types
- Show `source_reference` as a subtitle on insight cards

## Technical Details

- The prompt will receive the full list of feature requests and errors, enabling the AI to cross-reference patterns (e.g., a heavily voted feature that would also fix a recurring bug)
- Utility scoring uses a 1-10 scale factoring in votes, alignment, and competitive positioning
- Only insights with `recommendation: 'implement'` or critical bugs are surfaced prominently; `defer`/`reject` items are shown in a collapsed section

## Files Modified

- **Migration**: Add `source_reference`, `utility_score`, `recommendation` columns to `platform_insights`
- **Edit**: `supabase/functions/platform-self-improve/index.ts` -- expanded data fetch, enhanced prompt, updated tool schema
- **Edit**: `src/components/admin/AdminAIChat.tsx` -- utility score badges, recommendation badges, category filters
- **Edit**: `src/integrations/supabase/types.ts` -- auto-updated after migration

