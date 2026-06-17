// ALICE Repair-Macro-Step
// Called by the extension runner when a macro step fails to find its element.
// Receives the failed step + a live DOM snapshot of interactive elements on
// the current page, asks Gemini for a corrected step (or a pause), persists
// the fix back into alice_macros.steps so future runs don't need repair.
//
// Rate-limited to alice_macros.repair_count <= 6 per macro.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const MODEL = "google/gemini-2.5-flash";
const MAX_REPAIRS = 6;

interface CandidateEl {
  tag: string;
  id?: string;
  name?: string;
  type?: string;
  role?: string;
  ariaLabel?: string;
  placeholder?: string;
  text?: string;
  selector: string;
}

interface RepairRequest {
  macro_id: string;
  step_index: number;
  step: any;
  page: { url: string; title?: string; elements: CandidateEl[] };
  last_error?: string;
}

async function askGemini(req: RepairRequest): Promise<any> {
  const system = `You are ALICE, a browser-automation repair specialist.
A macro step failed to find its target element. Given the step's INTENT and a live snapshot of interactive elements visible on the page right now, return a SINGLE corrected step that the runner will execute.

RULES:
- Output ONLY valid JSON, no prose. Shape: { "action": "...", "selector": "...", "value": "...", "text": "...", "prompt": "...", "note": "why this fix" }
- Pick selectors from the snapshot's "selector" field verbatim when possible.
- Prefer stable selectors: #id, [name="..."], [aria-label="..."], button text.
- If no element matches the intent, return an action="pause" with a short prompt asking the user to do the step manually.
- Never invent selectors that aren't in the snapshot.
- Keep "value" identical to the failed step when it's a fill/type, including {{vault.*}} or {{var.*}} tokens (the runner resolves them).`;

  const user = `FAILED STEP:
${JSON.stringify(req.step, null, 2)}

LAST ERROR: ${req.last_error || "(none)"}

CURRENT PAGE:
URL: ${req.page.url}
Title: ${req.page.title || ""}

VISIBLE INTERACTIVE ELEMENTS (max 80):
${JSON.stringify(req.page.elements, null, 2)}`;

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
  if (!parsed.action) throw new Error("Repair returned invalid step JSON");
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

    const body = (await req.json().catch(() => ({}))) as Partial<RepairRequest>;
    if (!body.macro_id || typeof body.step_index !== "number" || !body.step || !body.page) {
      return new Response(JSON.stringify({ error: "macro_id, step_index, step, page are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: macro, error: mErr } = await supabase
      .from("alice_macros")
      .select("id, user_id, steps, repair_count")
      .eq("id", body.macro_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (mErr || !macro) {
      return new Response(JSON.stringify({ error: "Macro not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((macro.repair_count || 0) >= MAX_REPAIRS) {
      return new Response(JSON.stringify({ error: "Repair limit reached for this macro" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cap snapshot size to keep prompt sane.
    const trimmed: RepairRequest = {
      macro_id: body.macro_id,
      step_index: body.step_index,
      step: body.step,
      page: {
        url: String(body.page.url || "").slice(0, 500),
        title: String(body.page.title || "").slice(0, 200),
        elements: (Array.isArray(body.page.elements) ? body.page.elements : []).slice(0, 80),
      },
      last_error: body.last_error ? String(body.last_error).slice(0, 500) : undefined,
    };

    const fixed = await askGemini(trimmed);

    const steps = Array.isArray(macro.steps) ? [...macro.steps as any[]] : [];
    if (body.step_index >= 0 && body.step_index < steps.length) {
      steps[body.step_index] = fixed;
    }
    await supabase
      .from("alice_macros")
      .update({
        steps,
        repair_count: (macro.repair_count || 0) + 1,
      })
      .eq("id", macro.id);

    return new Response(JSON.stringify({ ok: true, step: fixed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
