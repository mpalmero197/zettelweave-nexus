# Baku Scribe — Improvement Pass, Phase 1

Scope-5 pass, shipped in phases. This plan is **Phase 1 only** — the biggest visible wins for ALICE intelligence + latency. Phases 2 and 3 are listed at the bottom so you know what's coming.

---

## Phase 1 — What ships now

### A. ALICE: reasoning + planning core

1. **Introduce a router layer** (`supabase/functions/_shared/alice-router.ts`)
   - Classifies each ALICE turn into: `quick_answer` | `research` | `reasoning` | `agentic`.
   - Picks the model: `gemini-3.1-flash-lite` for quick, `gemini-3-flash-preview` for standard, `gemini-3.1-pro-preview` for reasoning/multi-step.
   - Emits the choice in the response payload so we can observe/tune it.

2. **New `alice-plan` step in `jarvis-chat`** (thin addition, not a rewrite)
   - Before answering complex asks, ALICE produces an internal JSON plan: `{goal, subtasks[], tools[], stop_conditions}`.
   - Subtasks execute in parallel where independent (search + memory recall + card lookup fire concurrently instead of serially).
   - A `self_check` pass validates the draft answer against the plan's stop conditions before returning; if a stop condition fails, one repair pass is allowed.

3. **Trace surface in the chat UI**
   - Collapsible "How ALICE thought about this" panel under each answer showing: model tier used, plan steps, tools called, sources cited. Off by default; toggle in Settings → ALICE.

### B. Smarter web research

4. **Upgrade `web-search` ranking** (function already scores trust + position; extend it)
   - Add explicit **recency tiers**: `fresh <7d`, `recent <90d`, `evergreen`, `stale >2y`. Query intent detects whether recency is required (news/prices/versions) vs. evergreen (definitions/history) and re-weights accordingly.
   - Add **authority signals** beyond the current allowlist: DOI presence, HTTPS, canonical URL match, and downgrade for AI-content farms and syndicated reposts.
   - Return a `confidence` value per result (0–1) and an overall `answer_confidence` on the response.

5. **Force citation discipline in ALICE answers**
   - System prompt update: every factual claim gets an inline `[n]` marker tied to a source; if ALICE cannot cite, it says so instead of speculating.
   - Sources rendered as a numbered list with domain, date, and trust tier badge.

### C. Latency — AI responses

6. **Route by task, not by default**
   - Short chat prompts (< ~40 tokens) → `gemini-3.1-flash-lite`.
   - Standard writer suggestions/cards → `gemini-3-flash-preview` (unchanged).
   - Reasoning/planning/synthesis → `gemini-3.1-pro-preview` only when the router asks for it.

7. **Stream everything user-facing**
   - Convert `ai-assistant-chat`, `jarvis-chat`, `ai-modify-content`, `catalyst-ai-enhance-content` to `streamText` via the AI SDK and stream through `toUIMessageStreamResponse`. Removes the "wait for full response" pause.

### D. Latency — backend

8. **Parallelize edge-function DB fanout**
   - Audit `daily-report`, `platform-self-improve`, `alice-proactive-pulse`, `synthesize-master-document`: replace sequential per-user loops with `Promise.all` batches of 10.
   - Add an in-memory LRU (per invocation) for repeated profile/preference reads inside a loop.

9. **Cache web-search + embedding calls**
   - New `search_cache` table keyed on `sha256(query_normalized)` with a 15-minute TTL; identical queries within the window skip Google/SerpAPI.
   - Embedding cache keyed on `sha256(text)` with 7-day TTL to skip re-embedding unchanged cards/notes.

### E. Latency — perceived speed

10. **Optimistic UI on saves**
    - Cards, notes, and Catalyst documents: apply local mutation immediately, reconcile on server confirm, rollback + toast on failure.

11. **Kill blocking spinners in the editor**
    - Replace full-screen spinners in Catalyst and the card editor with inline skeleton rows and a subtle top progress bar (already used elsewhere).

12. **Prefetch on hover**
    - Sidebar nav, card list, and notebook spines prefetch their route chunk + first data query on `mouseenter` (150ms debounce).

---

## Technical details

- **Router**: pure TS, no new deps. Lives in `supabase/functions/_shared/alice-router.ts`, called from `jarvis-chat` and `ai-assistant-chat`.
- **Streaming**: adopt AI SDK (`npm:ai`, `npm:@ai-sdk/openai-compatible`) via the existing `_shared/ai-gateway.ts` pattern already used in newer functions. Replace raw `fetch` to the gateway.
- **Caches**: two new tables (`search_cache`, `embedding_cache`) with `GRANT`s to `service_role` only, RLS enabled, cleanup cron every 6h. No user data cached — only content hashes and results.
- **Trace panel**: new `AliceTrace.tsx` component; data flows from a new `trace` field on the streamed response.
- **Optimistic UI**: use existing React Query mutations; add `onMutate` / `onError` rollback handlers on the 3 mutation hooks (`useCardMutations`, `useNoteMutations`, `useCatalystSaveDocument`).
- **Prefetch**: small `usePrefetchOnHover(routePath, queryKey)` hook wrapping `queryClient.prefetchQuery` + `import()` of the route module.

## What's explicitly OUT of Phase 1

- No UI redesign, no new feature surfaces beyond the trace panel toggle.
- No changes to memory/RAG recall depth (that's Phase 2).
- No changes to proactive nudges (Phase 2).
- No bundle-size / route-splitting audit (Phase 3).

## Phase 2 (next turn, if approved)
- Deeper memory: episodic recall trace, "why retrieved" scoring, longer context windows for reasoning tier.
- Proactive quality: tie every ALICE nudge to a concrete recent signal + one-click action.
- Tool-calling refactor: convert ad-hoc tool dispatch in `jarvis-chat` to AI SDK `tool()` primitives with `stopWhen(stepCountIs(50))`.

## Phase 3
- Route-level code-splitting audit + prefetch strategy across the app.
- Manual-chunk tuning in `vite.config.ts` (editor, pdf, canvas, chart).
- Defer non-critical edge-function calls behind `requestIdleCallback`.

## Risks
- **Model-tier routing** can misclassify — mitigated by trace panel showing the tier and a manual override in Settings.
- **Streaming migration** touches auth-gated functions — will preserve existing auth checks (added in the previous security pass).
- **Caches** add two tables; cleanup cron is required to keep them bounded.

Approve to start with **Phase 1, section A (router + plan step + trace panel)** first, or tell me to reorder.
