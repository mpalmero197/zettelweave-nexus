// ALICE Research-and-Build-Macro
// Given a user goal (e.g. "open a Chase checking account") and an optional
// target_url, gathers steps via Firecrawl search/scrape, asks Gemini to
// distill them into an ordered macro with pause-for-user breakpoints,
// inserts the macro into alice_macros, and returns the saved row.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

const MODEL = "google/gemini-2.5-flash";

interface Step {
  action: "navigate" | "click" | "fill" | "select" | "press_enter" | "submit" | "wait" | "pause";
  selector?: string;
  text?: string;
  value?: string;
  url?: string;
  ms?: number;
  prompt?: string; // for pause
  sensitive?: boolean;
  note?: string;
}

async function firecrawlSearch(query: string) {
  if (!FIRECRAWL_API_KEY) return [];
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: 4,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });
    if (!r.ok) return [];
    const j = await r.json();
    const arr = Array.isArray(j?.data) ? j.data
      : Array.isArray(j?.web?.results) ? j.web.results
      : [];
    return arr.slice(0, 4).map((x: any) => ({
      url: x.url,
      title: x.title,
      markdown: (x.markdown || x.content || "").slice(0, 4000),
    }));
  } catch { return []; }
}

async function firecrawlScrape(url: string) {
  if (!FIRECRAWL_API_KEY) return null;
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return { url, markdown: (j?.markdown || j?.data?.markdown || "").slice(0, 6000) };
  } catch { return null; }
}

async function planMacro(goal: string, targetUrl: string | undefined, research: any[]): Promise<{
  name: string; description: string; start_url: string; target_domain?: string; tags: string[]; steps: Step[];
}> {
  const context = research.map((r, i) =>
    `### Source ${i + 1}: ${r.title || r.url}\n${r.url}\n\n${r.markdown}`
  ).join("\n\n---\n\n");

  const system = `You are ALICE, a browser-automation planner.
Given a user goal and research sources, produce a single JSON object describing a step-by-step macro a Chrome extension will execute in a real browser tab.

CRITICAL RULES:
- start_url MUST be a real, verifiable URL drawn from the research (or the provided target_url). NEVER invent URLs.
- For any step requiring the USER's personal info (name, SSN, password, address, email, payment, photo upload, identity verification, CAPTCHAs, OTP codes), emit a step with action="pause" and a short "prompt" telling the user what to enter, plus an optional "selector" that highlights the field. DO NOT use action="fill" for personal data.
- Use action="click" for buttons/links, "fill" for non-sensitive defaults, "navigate" only to change URL.
- Prefer simple, stable CSS selectors (id, name, [aria-label], role, text). Provide "text" as a fallback for clicks.
- Keep steps under 20. Be conservative — pause whenever in doubt.
- Output ONLY valid JSON, no prose. Shape:
{
  "name": "string (<= 80 chars)",
  "description": "1-sentence summary",
  "start_url": "https://...",
  "target_domain": "example.com",
  "tags": ["banking", "onboarding"],
  "steps": [ { "action": "...", ... } ]
}`;

  const user = `USER GOAL: ${goal}
${targetUrl ? `PREFERRED START URL: ${targetUrl}` : ""}

RESEARCH SOURCES:
${context || "(no research available — use general best-known steps and pause for every field)"}`;

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error(`LLM error ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const raw = j?.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(raw);
  if (!parsed.start_url || !Array.isArray(parsed.steps)) {
    throw new Error("Planner returned invalid macro JSON");
  }
  return parsed;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const goal = String(body.goal || "").trim();
    const targetUrl = body.target_url ? String(body.target_url).trim() : undefined;
    if (!goal) {
      return new Response(JSON.stringify({ error: "goal is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Research
    const research: any[] = [];
    if (targetUrl) {
      const s = await firecrawlScrape(targetUrl);
      if (s) research.push(s);
    }
    const searchHits = await firecrawlSearch(`${goal} step by step site instructions`);
    research.push(...searchHits);

    // 2. Plan
    const plan = await planMacro(goal, targetUrl, research);

    // 3. Insert
    const { data, error } = await supabase.from("alice_macros").insert({
      user_id: user.id,
      name: String(plan.name || goal).slice(0, 200),
      description: String(plan.description || "").slice(0, 500),
      start_url: plan.start_url,
      steps: plan.steps,
      target_domain: plan.target_domain || null,
      tags: Array.isArray(plan.tags) ? plan.tags.slice(0, 10) : [],
      goal,
      source: "researched",
      enabled: true,
    }).select("*").single();
    if (error) throw error;

    return new Response(JSON.stringify({
      ok: true,
      macro: data,
      sources: research.map((r) => ({ url: r.url, title: r.title })),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
