

# Living Platform: Self-Improvement Engine + SEO Assistant

## Overview

Two interconnected features that make Pendragon feel "alive":

1. **Scheduled Self-Improvement Edge Function** (`platform-self-improve`) -- runs daily in the background, analyzes the platform's health, content, features, and competitive positioning vs Notion/Obsidian/OneNote, then stores actionable improvement suggestions in a new `platform_insights` table.

2. **Enhanced Admin AI Assistant** -- add SEO analysis to quick prompts and enrich the system prompt with competitive intelligence and SEO context. Surface the auto-generated insights as a "Platform Pulse" panel alongside the chat.

---

## Step 1: Database -- `platform_insights` Table

Create a migration with:

```sql
create table public.platform_insights (
  id uuid primary key default gen_random_uuid(),
  category text not null, -- 'seo', 'feature_gap', 'ux', 'performance', 'competitive', 'growth'
  title text not null,
  description text not null,
  priority text default 'medium', -- 'critical', 'high', 'medium', 'low'
  competitor_reference text, -- 'notion', 'obsidian', 'onenote', null
  status text default 'new', -- 'new', 'reviewed', 'implemented', 'dismissed'
  metadata jsonb default '{}',
  created_at timestamptz default now(),
  reviewed_at timestamptz
);

alter table public.platform_insights enable row level security;

create policy "Admins can manage insights"
  on public.platform_insights for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));
```

## Step 2: Edge Function -- `platform-self-improve`

Create `supabase/functions/platform-self-improve/index.ts`:

- Uses service role key (scheduled, no JWT)
- Gathers platform metrics: user count, content counts (cards, notes, catalyst docs, mind maps), feature request themes, error trends, SEO config (sitemap pages, meta tags, llms.txt status)
- Sends a structured prompt to Gemini asking it to act as a **product strategist and SEO consultant** comparing Pendragon against Notion, Obsidian, and OneNote
- Prompt instructs the AI to return structured JSON via tool calling with 5-8 insights across categories: `seo`, `feature_gap`, `ux`, `performance`, `competitive`, `growth`
- Each insight includes: title, description, priority, competitor_reference
- Inserts new insights into `platform_insights`, skipping duplicates by checking title similarity
- Caps at 8 insights per run

The prompt will include real platform data (user count, feature list, content volume, recent feature requests, current SEO setup) and ask the AI to think like a PM competing with Notion/Obsidian/OneNote.

## Step 3: Schedule the Function

Add a `pg_cron` job to run `platform-self-improve` once daily at 6:00 AM UTC.

## Step 4: Enhanced Admin AI Chat

**AdminAIChat.tsx changes:**

- Add new quick prompts:
  - `SEO audit` -- "Analyze my current SEO setup (meta tags, sitemap, robots.txt, llms.txt, structured data) and suggest improvements to rank higher than Notion and Obsidian for 'AI second brain' keywords."
  - `Competitive analysis` -- "Compare Pendragon's current feature set against Notion, Obsidian, and OneNote. What key features am I missing? Where do I have an advantage?"
  - `Growth strategy` -- "Based on current user metrics and content patterns, suggest growth strategies to increase user acquisition and retention."

- Enrich the system prompt in `admin-ai-assistant/index.ts` with:
  - Current SEO config summary (sitemap URL count, robots.txt rules, llms.txt presence)
  - Feature request themes (top 5 most-voted)
  - Recent `platform_insights` (last 10 unreviewed)
  - Explicit competitive context paragraph about Notion/Obsidian/OneNote feature sets

**New "Platform Pulse" panel** in AdminAIChat:
- When no chat is active, show a card grid of recent unreviewed `platform_insights`
- Each card shows category badge, priority indicator, title, truncated description, and competitor reference
- Actions: "Mark Reviewed", "Dismiss", "Ask AI about this" (sends insight as chat prompt)
- Pulsing dot animation on the header when new insights exist

## Step 5: Update `supabase/config.toml`

Register `platform-self-improve` with `verify_jwt = false`.

---

## Technical Details

- The self-improve function uses Lovable AI Gateway with `google/gemini-3-flash-preview` and structured output via tool calling to get clean JSON insights
- SEO suggestions will reference actual current config (robots.txt rules, sitemap pages, meta tag patterns) rather than generic advice
- Competitive analysis is grounded in real feature comparisons (e.g., "Notion has native databases; Pendragon has Zettelkasten cards -- suggest bridging features")
- The Platform Pulse panel replaces the empty state (currently just quick prompts) with a living feed of AI-generated improvement ideas
- Insights are deduplicated by checking if a similar title already exists in the last 7 days

