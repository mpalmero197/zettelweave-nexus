// ALICE Router — classifies each turn and picks a Gemini tier for it.
//
// Tiers:
//   quick_answer → gemini-3.1-flash-lite  (cheapest, chat-y one-liners)
//   research     → gemini-3-flash-preview (default, web/knowledge lookups)
//   reasoning    → gemini-3.1-pro-preview (multi-step analysis, planning)
//   agentic      → gemini-3.5-flash       (tool-heavy navigation / macros)
//
// Zero deps, safe to import from any Deno edge function.

export type AliceTier = "quick_answer" | "research" | "reasoning" | "agentic";

export const ALICE_MODELS: Record<AliceTier, string> = {
  quick_answer: "google/gemini-3.1-flash-lite",
  research: "google/gemini-3-flash-preview",
  reasoning: "google/gemini-3.1-pro-preview",
  agentic: "google/gemini-3.5-flash",
};

export interface RouteDecision {
  tier: AliceTier;
  model: string;
  reason: string;
  signals: string[];
}

const REASONING_TRIGGERS = [
  "compare", "analyze", "analyse", "explain why", "step by step",
  "outline", "synthesize", "synthesise", "evaluate", "trade-off",
  "tradeoff", "pros and cons", "design ", "architect", "debug",
  "diagnose", "deep dive", "reason ", "why does", "why is",
  "plan ", "planning", "strategy",
];

const RESEARCH_TRIGGERS = [
  "search", "google", "look up", "find ", "news", "latest",
  "today", "current", "who is", "what is", "recent", "price of",
  "weather", "recipe", "citation", "source", "reference",
];

const AGENTIC_TRIGGERS = [
  "open ", "navigate", "go to", "show me my", "create ", "add ",
  "delete ", "schedule ", "remind me", "start timer", "pomodoro",
  "record ", "macro", "automate", "run agent",
];

const QUICK_TRIGGERS = [
  "hi", "hey", "hello", "thanks", "thank you", "ok", "okay",
  "yes", "no", "cool", "nice", "got it",
];

/**
 * Classify a user turn and pick the tier/model to serve it with.
 * `forceTier` from the caller (e.g. explicit "deep think" toggle) wins.
 */
export function routeAliceTurn(opts: {
  userMessage: string;
  forceTier?: AliceTier | null;
  hasAttachments?: boolean;
}): RouteDecision {
  const raw = (opts.userMessage || "").trim();
  const m = raw.toLowerCase();
  const signals: string[] = [];

  if (opts.forceTier) {
    return {
      tier: opts.forceTier,
      model: ALICE_MODELS[opts.forceTier],
      reason: `Caller forced ${opts.forceTier}`,
      signals: ["force"],
    };
  }

  const wordCount = raw ? raw.split(/\s+/).length : 0;
  const questionMarks = (raw.match(/\?/g) || []).length;

  // Very short + friendly → quick tier (skip the expensive models).
  if (wordCount <= 4 && QUICK_TRIGGERS.some((t) => m === t || m.startsWith(t + " "))) {
    signals.push("short_greeting");
    return {
      tier: "quick_answer",
      model: ALICE_MODELS.quick_answer,
      reason: "Short conversational turn",
      signals,
    };
  }

  // Long, multi-step, or reasoning-flagged → reasoning tier.
  if (raw.length > 400) signals.push("long_prompt");
  if (questionMarks >= 2) signals.push("multi_question");
  if (/\b(1\.|2\.|3\.)\s/.test(raw)) signals.push("numbered_list");
  if (REASONING_TRIGGERS.some((t) => m.includes(t))) signals.push("reasoning_verb");
  if (signals.some((s) =>
    s === "long_prompt" || s === "multi_question" ||
    s === "numbered_list" || s === "reasoning_verb"
  )) {
    return {
      tier: "reasoning",
      model: ALICE_MODELS.reasoning,
      reason: `Reasoning signals: ${signals.join(", ")}`,
      signals,
    };
  }

  // Agentic (create/navigate/schedule/automate) → agentic tier for tool loops.
  if (AGENTIC_TRIGGERS.some((t) => m.includes(t))) {
    signals.push("agentic_verb");
    return {
      tier: "agentic",
      model: ALICE_MODELS.agentic,
      reason: "Action / navigation intent",
      signals,
    };
  }

  // Research intent → research tier.
  if (RESEARCH_TRIGGERS.some((t) => m.includes(t))) {
    signals.push("research_verb");
    return {
      tier: "research",
      model: ALICE_MODELS.research,
      reason: "Information-seeking intent",
      signals,
    };
  }

  // Very short prompts without triggers → quick.
  if (wordCount <= 6 && !opts.hasAttachments) {
    signals.push("short_prompt");
    return {
      tier: "quick_answer",
      model: ALICE_MODELS.quick_answer,
      reason: "Short prompt, no complex signals",
      signals,
    };
  }

  // Default: research tier — Gemini 3 Flash is the balanced default.
  signals.push("default");
  return {
    tier: "research",
    model: ALICE_MODELS.research,
    reason: "Balanced default",
    signals,
  };
}

/** A compact trace record surfaced to the client for the "How ALICE thought" panel. */
export interface AliceTrace {
  tier: AliceTier;
  model: string;
  reason: string;
  signals: string[];
  steps: number;
  tools_called: string[];
  started_at: string;
  finished_at?: string;
  duration_ms?: number;
}

export function newTrace(decision: RouteDecision): AliceTrace {
  return {
    tier: decision.tier,
    model: decision.model,
    reason: decision.reason,
    signals: decision.signals,
    steps: 0,
    tools_called: [],
    started_at: new Date().toISOString(),
  };
}

export function finalizeTrace(t: AliceTrace): AliceTrace {
  const finished = Date.now();
  t.finished_at = new Date(finished).toISOString();
  try { t.duration_ms = finished - new Date(t.started_at).getTime(); } catch { /* ignore */ }
  return t;
}
