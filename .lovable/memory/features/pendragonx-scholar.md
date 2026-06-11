---
name: PendragonX Scholar
description: In-app learning center with isolated sandbox, 4-format lessons, ALICE Deep Dive, cosmetic badges, and fully automated curriculum sync
type: feature
---

# PendragonX Scholar

`/scholar` route. Teaches every PendragonX capability with 4 formats per lesson: written, video, guided walkthrough, ALICE-led chat.

## Architecture
- **Capability registry** at `src/lib/scholar/registry.ts` — single source of truth. **Any new PendragonX feature MUST add an entry here** with `surfaceFiles[]` so the sync engine knows what to read.
- **Edge function** `scholar-curriculum-sync` uses Gemini-3-flash to regenerate `written_md`, `walkthrough_json`, and `alice_system_prompt` for any lesson missing content (or for `slugs[]` passed in body). Should be scheduled nightly + invoked on-demand from Admin.
- **Sandbox tables**: `sandbox_notebooks`, `sandbox_notes`, `sandbox_zettel_cards` — owner-only RLS, fully isolated. Seeded by `seed_sandbox()` RPC with a fantasy-author starter set.
- **Progress/Badges/Points** tables are cosmetic only (no functional unlocks). Ranks: Apprentice → Scribe (100) → Adept (250) → Loremaster (500) → Grand Pendragon (1000). 10 pts per format completed.

## UI surfaces
- `/scholar` — home with rank/progress/next-lesson + module grid
- `/scholar/lesson/:slug` — tabbed player (Read/Watch/Walk/ALICE)
- `/scholar/sandbox` — isolated playground (uses `SandboxProvider`)
- `/scholar/alice` — ALICE Deep Dive capability grid

## Rules
- Never store videos automatically — admins attach `video_url` manually per lesson.
- Sandbox writes NEVER go to live tables. The `SandboxProvider` is the only entry point and forces `source = "sandbox"`.
- When adding a new feature elsewhere in PendragonX, add its registry entry AND trigger `scholar-curriculum-sync` so the lesson stays accurate.
