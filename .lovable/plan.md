# Game Plan: ALICE → Agentic Powerhouse

ALICE today is a single-turn assistant with ~55 well-scoped tools in `jarvis-chat`. She executes one tool at a time, has limited working memory beyond `save_memory`/`recall_memory`, and cannot run jobs that outlive the chat request. This plan upgrades her along five axes — **Planning, Execution, Memory, Perception, Autonomy** — in shippable phases.

## Phase 1 — Planner / Executor Loop (foundation)

Move from "one tool per turn" to a true agent loop using the AI SDK.

- Refactor `supabase/functions/jarvis-chat` to use `streamText` + `stopWhen: stepCountIs(50)` instead of the current manual loop.
- Split the model call: a **planner step** that emits a structured `plan` (Output.object: goal, steps[], success_criteria), then an **executor step** that runs tools, then a **critic step** that checks success_criteria and decides "done / retry / replan".
- Surface the live plan in the chat as a collapsible "ALICE is thinking…" card with per-step status (pending → running → done → failed). Reuses `AliceActionPlan.tsx`.
- Enable **parallel tool calls** when the model emits multiple in one step (already supported by the gateway; current code serializes them).

## Phase 2 — Durable Background Agents

Right now, closing the chat kills the work. Make long tasks survive.

- New table `alice_runs` (id, user_id, goal, plan jsonb, status, steps jsonb, result, created_at). GRANT + RLS per project conventions.
- New edge function `alice-run-step` invoked by `run-scheduled-triggers` (already cron'd) to advance pending runs one step at a time, with a max wall-clock per invocation.
- `start_background_task` tool: ALICE hands off "research X and save a card", "monitor topic Y for a week", or "draft chapter 3 overnight" to a run; user sees it in **AlicePulseFeed** with progress + cancel.
- Wire completion into the existing engagement-nudges/web-push pipeline so finished runs notify the user.

## Phase 3 — Deeper Memory (RAG over everything she's done)

Today `save_memory` is keyword-y. Make ALICE remember her own work.

- New table `alice_episodic_memory` (user_id, run_id, summary, embedding vector(384), tags, created_at). Reuse the HuggingFace `all-MiniLM-L6-v2` embedding provider already in the project.
- After every completed run / significant chat turn, summarize → embed → insert.
- New tool `recall_episodic` that does cosine search before the planner runs, so ALICE always has "what did I do for this user before?" context.
- Auto-link episodic memories to the relevant Zettel cards / notebooks so the knowledge graph reflects her work.

## Phase 4 — Perception Upgrades

Make ALICE see what the user sees.

- Extend `useScreenContext` to optionally capture the visible DOM outline (route, current selection, focused item id) every N seconds and stash it in a ref. Send a compact snapshot with each chat turn.
- New tool `look_at_screen` returning the snapshot, so the model can ask "what is the user currently doing?" instead of guessing.
- For voice mode: keep the existing recording overlay; add **interim transcript streaming** into the planner so ALICE can start tool calls before the user finishes speaking.

## Phase 5 — Self-Critique & Auto-Improvement

Close the loop with the existing self-improvement engine.

- After each run, the critic step writes a short post-mortem (what worked / what failed / which tool was missing) into `platform_self_improve` queue.
- Daily 6 AM job (already exists) clusters these into proposed new tools or prompt tweaks — the same pattern Pendragon already uses for SEO/AEO self-improvement, just pointed at ALICE.
- Add an admin "ALICE Lab" panel in the existing Admin Console that lists proposed prompt/tool changes for one-click apply.

## Phase 6 — Safety Rails

More power = more guardrails.

- Mark every mutating tool (`delete_content_item`, `update_content_item`, `create_checkout`, etc.) with `needsApproval` when invoked inside a background run (interactive chat keeps current behavior).
- Per-run budget: max steps, max tool calls, max tokens. Cancel + notify on overrun.
- Per-tool rate limits in `_shared` to prevent runaway loops billing the gateway.

## Technical Details

- **Files touched (Phase 1):** `supabase/functions/jarvis-chat/index.ts` (loop rewrite to AI SDK `streamText`), `src/hooks/useJarvis.ts` (consume `parts[]` stream), `src/components/alice/AliceActionPlan.tsx` (live status), `src/components/jarvis/JarvisChat.tsx` (render plan card).
- **New edge functions:** `alice-run-step`, `alice-plan`, `alice-critic`.
- **New tables:** `alice_runs`, `alice_episodic_memory` (with pgvector). Both need explicit `GRANT` + RLS scoped to `auth.uid()`.
- **Model choices:** keep `google/gemini-3-flash-preview` for executor; use `google/gemini-2.5-pro` for planner + critic where reasoning matters.
- **No breaking changes** to current tool signatures; the loop just calls them differently.

## Suggested Sequencing

1. Phase 1 (planner/executor loop + parallel tools) — biggest perceived intelligence jump, ~1 build.
2. Phase 3 (episodic RAG memory) — compounds value of Phase 1.
3. Phase 2 (durable background runs) — unlocks "agent that works while you sleep".
4. Phase 4, 5, 6 in any order after that.

Tell me which phase to start with — I'd recommend Phase 1 + a slice of Phase 3 together.
