# Autonomous Browser Agent for ALICE

Turn ALICE from a record-and-replay macro player into a real browser agent that can be told "set up OAuth for Notion" and will research it, draft a plan, get your one-time approval, then drive the browser herself.

## What changes for you

1. You type a goal in chat: *"Connect my Notion workspace for OAuth"* or *"Click through the GitHub repo settings and enable Issues"*.
2. ALICE researches it (web search + reading the live page) and shows a plain-English action plan with Approve / Modify / Cancel buttons.
3. After approval, the extension drives the page: scrolling, clicking, typing, navigating across tabs. A small overlay shows the current step and a Stop button.
4. When she reaches a **password field** she stops and hands control to you. When she reaches an **OAuth "Allow / Authorize" consent button** she clicks it herself.
5. She reports back in chat with what she did, any errors, and what she learned for next time.

## How it works

```text
Chat goal ──► alice-plan-task (edge fn)
              ├─ web_search for provider docs
              ├─ reads live DOM snapshot from extension
              └─ outputs ALICE_PLAN block (existing approval UI)
                          │
                  You click Approve
                          │
                          ▼
              alice-agent-step (edge fn, loop)
              ├─ receives current page snapshot
              ├─ picks next action: click / fill / scroll / navigate / wait / done
              ├─ flags password fields → pause + notify
              └─ returns action to extension runner
                          │
                          ▼
              extension/runner.js executes,
              snapshots new page, posts back
              (loop until done or paused)
```

### Pieces being built / changed

**Edge functions (new):**
- `alice-plan-task` — takes a goal + optional page snapshot, calls Lovable AI (gemini-3-flash) with web_search tool, returns an `ALICE_PLAN` the existing approval UI already renders.
- `alice-agent-step` — the per-step "decide next action" loop. Given the goal, plan, history, and current DOM snapshot, returns one structured action `{action, selector, value, reasoning, sensitive?}`. Uses gemini-2.5-pro for reasoning.

**Extension (`extension/`):**
- `agent.js` (new) — content script that snapshots a compact, LLM-friendly view of the page (visible text + interactive elements with stable selectors), executes one action, snapshots again, posts back. Detects `input[type=password]` and stops the loop with a "needs you" signal.
- `background.js` — adds an "agent run" message channel separate from macros, plus a context-menu entry "Ask ALICE to do this here".
- `runner.js` — reused for the actual click/fill/scroll primitives.
- Mirror updates copied into `public/chrome-extension/` and manifest bumped to 1.13.0.

**App UI:**
- `src/components/alice/AliceAgentRun.tsx` — live progress card in chat: current step, page title, "Resume after I log in" button, "Stop" button.
- `useJarvis` already routes `client_actions`; add `alice:agent_start` and `alice:agent_paused` handlers.
- The existing `AliceActionPlan` Approve/Modify/Cancel UI is reused — no new approval pattern.

**Database (one new table):**
- `alice_agent_runs` — `id, user_id, goal, plan jsonb, status (planning|awaiting_approval|running|paused_for_user|succeeded|failed|cancelled), history jsonb[], current_url, paused_reason, created_at, updated_at`. RLS scoped to `auth.uid()`. GRANTs to `authenticated` + `service_role`.

### Safety rules baked in

- **Never types into `input[type=password]`** — always pauses and notifies you, regardless of what the plan says.
- **Stops before any payment form field** (`autocomplete*="cc-"`, Stripe iframes) and asks for explicit re-approval.
- **Single-tab scope per run** unless the plan explicitly opens a new tab; cross-origin nav requires re-snapshot before next action.
- **Hard cap**: 40 steps per run, 8s timeout per action, user can hit Stop at any time.
- **Audit log**: every action stored in `alice_agent_runs.history` so you can replay or review what she did.

### Out of scope for this pass

- No autonomous *purchases* or *form submissions involving money* — those will always re-prompt.
- No headless/background runs — the agent only acts in a tab you can see, so you can intervene.
- No re-running OAuth flows after consent — once tokens are issued, the existing `oauth-callback` flow takes over.

## Technical notes

- DOM snapshot format: array of `{idx, tag, role, text, name, selector, visible, type?}` capped at ~120 interactive nodes; full visible text truncated to ~6k chars. This keeps each LLM call cheap and fast.
- Selectors prefer `data-testid` → `id` → role+name → stable CSS path; never raw nth-child chains.
- The "research" tool ALICE uses for OAuth setup is `web_search` already available in `supabase/functions/web-search` — wired in as a tool call inside `alice-plan-task`.
- Mirrors the existing `alice_macros` / `alice_macro_runs` shape so the Macros panel can later show agent runs in a unified history view.

Approve to build, or tell me what to change (e.g. tighter safety, different model, also support running while you're away).
