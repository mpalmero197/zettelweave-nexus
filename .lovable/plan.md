
# ALICE Automation Expansion

Two-part build: **(A) ALICE as a real tool-calling agent inside the app**, **(B) Web Macro recorder & replayer via the existing Toolbox extension**. Both gated by an explicit "Approve before any write or external action" policy.

---

## Part A — ALICE Tool-Calling Agent (in-app)

### A1. Agent core
- New edge function `alice-agent` using AI SDK `streamText` + Gemini 3 Flash, with `stopWhen: stepCountIs(50)` for multi-step loops.
- The existing ALICE chat UI calls this function instead of any single-shot prompt.
- Server-side system prompt teaches ALICE: who the user is, what tools exist, the approval policy, and that risky actions must be proposed via `propose_action` rather than executed.

### A2. Tools (AI SDK `tool({ inputSchema, execute })` registered per category)

**Content CRUD** (all scoped to `auth.uid()`):
- `create_card`, `update_card`, `delete_card`, `link_cards`
- `create_note`, `update_note`, `delete_note`, `move_note_to_notebook`, `create_notebook`
- `create_sticky_note`, `update_sticky_note`
- `create_task`, `update_task`, `complete_task`, `create_subtask`
- `create_calendar_event`, `update_event`, `delete_event`
- `create_reminder`, `create_habit`, `log_habit_completion`

**Research & synthesis**:
- `web_search` (Firecrawl), `scrape_url` (Firecrawl markdown), `summarize_url` (scrape → Gemini summary → save as card/note), `generate_study_guide` (existing edge fn), `generate_mock_exam` (existing), `draft_catalyst_chapter` (existing).

**Discovery / read tools** (no approval needed):
- `search_my_content` (cards/notes/tasks via Postgres ILIKE + embedding RPC), `get_item`, `list_today_agenda`, `list_overdue_tasks`, `find_similar` (uses `find_similar_zettel_cards`).

**Scheduling & triggers**:
- `schedule_task` — stores in new `alice_scheduled_tasks` table (cron expression or one-shot); cron job dispatches due rows to `alice-agent` with a saved prompt.
- `create_trigger` — event-based ("when a card with tag X is created, do Y"); evaluated by lightweight pg trigger that inserts into `alice_task_queue`.

**Multi-step workflows**:
- `save_workflow` — captures the current tool-call sequence as a reusable named workflow in `alice_workflows`.
- `run_workflow` — replays a saved workflow with new parameters; the agent fills `{{slots}}` from the user's request.

**Meta / control**:
- `propose_action` — for any destructive or external tool, ALICE calls this first. It writes a row to `alice_pending_actions` and returns a token. The UI shows an Approve/Reject card. On approve, server re-invokes the agent with `approved_action_token` and executes.
- `report_progress` — streams milestone text to the UI without ending the turn.

### A3. Approval flow (ties to your "ask before any write or external action" choice)
- Tools are tagged `safety: "read" | "write" | "external"`.
- `write` and `external` tools never `execute` directly — their `execute` returns a `proposal` object. ALICE surfaces them through `propose_action`. UI renders an inline approval card in the chat (compact diff: title, target item, new values).
- One-click **Approve** triggers `alice-confirm-action` edge fn, which validates the token, runs the action, returns the result to the agent loop.
- "Approve all in this run" toggle per session for power use.

### A4. Background runs
- Extends the existing `alice_runs` table: a run can be **scheduled**, **triggered**, or **manual**.
- `alice-run-step` already exists — repurpose it as the worker that pulls from `alice_task_queue` (already partially modeled by `alice_scheduled_triggers`) and invokes `alice-agent`.

### A5. Tables
- `alice_pending_actions` — token, user_id, tool_name, args (jsonb), proposal_summary, status (pending/approved/rejected/expired), expires_at.
- `alice_workflows` — name, description, steps (jsonb array of tool calls with slot placeholders), created_by, last_run_at.
- `alice_scheduled_tasks` — name, prompt, cron_expr or run_at, enabled, last_run_at, owner.
- Indexes on (user_id, status), (user_id, run_at).
- RLS: owner-only; `service_role` for the agent function.

### A6. UI additions in the existing ALICE panel
- **Action cards** in chat: Approve / Reject / Edit-then-approve.
- **Workflows tab**: list saved workflows, run/edit/delete, "Record from this conversation" button (saves the current run's tool sequence).
- **Schedule tab**: simple list of scheduled prompts with next-run time.

---

## Part B — Web Macro Recorder & Replayer (Toolbox extension)

### B1. Recorder (content.js + side panel)
- Add a **"Teach ALICE"** button in the extension side panel: starts recording on the active tab.
- Content script attaches listeners for `click`, `input`, `change`, `submit`, `keydown` (Enter only), `scroll` (throttled), and `beforeunload`.
- For each event, capture: timestamp, URL, a **resilient selector** (priority order: `data-testid` → unique `id` → `aria-label` + role → CSS path with `:nth-of-type` → text-content fallback for buttons/links), element role, and value if input. Store in `chrome.storage.session` while recording.
- A floating in-page badge ("Recording — N steps") with **Pause / Stop**.
- On Stop: prompt user for **task name** and optional description; POST steps to Supabase `alice_macros` (jsonb steps array) via the extension's existing Supabase client.

### B2. Replayer
- Side panel lists saved macros for the signed-in user. Each has Run / Edit / Delete.
- "Run" sends a message to background → background opens the macro's start URL → injects a runner content script that walks the steps, with per-step wait-for-selector (default 8s timeout), human-ish delays (50-200ms), and a small overlay showing progress ("Step 3/12 — clicking 'Submit'").
- If a selector misses, runner falls back to text-match; if that fails, it pauses and shows a "Selector broke — click the element you meant" recovery UI that patches the step in place.

### B3. ALICE integration
- New tool `run_web_macro({ name })` in the agent. Because it's an **external** action, it goes through `propose_action`. On approval, the web app pushes a `run_macro` realtime message on `user:{id}:macros`; the extension subscribes and triggers the run.
- New tool `list_web_macros()` (read) so ALICE can answer "what can you do for me?".
- When a macro completes (or fails), the extension writes a row to `alice_macro_runs` with status + screenshot (optional `captureVisibleTab`). ALICE reads the result and reports back in chat.

### B4. Tables
- `alice_macros` — name, description, start_url, steps (jsonb), owner, created_at.
- `alice_macro_runs` — macro_id, status, started_at, ended_at, error, screenshot_path (storage).
- Storage bucket `alice-macros` (private) for optional screenshots.
- RLS: owner-only; extension authenticates as the user (already does for sync).

### B5. Safety
- Macros never store typed values for fields marked `type="password"` or with `autocomplete="current-password"`.
- A blocklist of always-skip domains (banking by default, user-editable).
- First replay of a macro always requires explicit approval (per the policy), even after a session "approve all".

---

## Part C — Out of scope (deliberately)
- Server-side Playwright / headless replay (you chose extension-only).
- Cross-device macro replay (lives in your browser).
- ALICE writing prose into your notes without permission.

## Technical details

**Files added (estimated):**
- `supabase/functions/alice-agent/index.ts` + `_shared/tools/*.ts` per category
- `supabase/functions/alice-confirm-action/index.ts`
- `supabase/functions/alice-dispatch-scheduled/index.ts` (cron-invoked)
- `src/components/alice/ApprovalCard.tsx`, `AliceWorkflowsTab.tsx`, `AliceScheduleTab.tsx`
- `extension/recorder.js`, `extension/runner.js`, `extension/macros-ui.html/.js`
- Migrations for the 5 new tables + RLS + grants

**Reused:**
- `alice_runs`, `alice_episodic_memory`, `alice_actions`, `find_similar_zettel_cards`, Firecrawl connector, Lovable AI gateway, pg_cron, existing extension Supabase session.

**Build order:**
1. Migrations (5 tables, indexes, RLS, grants)
2. `alice-agent` edge fn with read-only tools + `propose_action` skeleton
3. Wire ALICE chat UI to new agent + Approval Card component
4. Add write tools (CRUD) behind the proposal flow
5. Research tools (Firecrawl + summarize) behind the proposal flow
6. Workflows save/run + Workflows tab
7. Scheduling + dispatch cron + Schedule tab
8. Extension recorder + Teach ALICE button
9. Extension replayer + macros list UI
10. `run_web_macro` tool + realtime channel + result reporting

**Risks called out:**
- Long agent loops can burn AI credits. Cap at 50 steps + per-user daily token budget.
- Selector fragility on macros — mitigated by the resilient selector strategy + interactive recovery.
- Approval fatigue — mitigated by "approve all in this run" and a per-tool always-allow list in Settings.
