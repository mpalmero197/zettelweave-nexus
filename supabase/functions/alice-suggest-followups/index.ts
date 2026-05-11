// ALICE — proactive follow-up suggester.
// Given a freshly-created piece of user content (note, card, sticky, etc.)
// returns 0–3 structured suggestions: schedule an event, set a reminder,
// create a task, or flag a person to contact later. Pure JSON; no side
// effects — the client decides whether to act.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const SYSTEM = `You are ALICE, the writer's assistant inside PendragonX.
A user just created a new piece of content (a note, card, sticky, scratchpad, or similar).
Read it carefully and decide if it implies any time-bound or relational follow-up that the user would want help with.

Return STRICT JSON:
{
  "suggestions": [
    {
      "kind": "event" | "task" | "reminder" | "contact",
      "label": "short proposed action, <= 80 chars, in second person ('Schedule a call with ...')",
      "why": "one short sentence quoting/citing the trigger phrase from the content",
      "payload": {
        // for kind=event: { "title": str, "event_date": "YYYY-MM-DD", "event_time"?: "HH:MM", "duration_minutes"?: number, "description"?: str }
        // for kind=task or reminder: { "title": str, "due_date"?: "YYYY-MM-DD", "priority"?: "low|medium|high", "notes"?: str }
        // for kind=contact: { "title": "Call <name>" or "Reach out to <name>", "due_date"?: "YYYY-MM-DD", "notes"?: "include phone/email if present" }
      }
    }
  ]
}

Rules:
- Return at MOST 3 suggestions, ideally 0–1. Quality > quantity.
- Only suggest something if the content clearly hints at it (a date, a deadline, a phone number, "remind me", "follow up", "call X", "next Tuesday", "by Friday", "meeting", "appointment", etc.).
- If nothing is implied, return { "suggestions": [] }. Do NOT invent.
- For relative dates ("tomorrow", "next Friday"), resolve them against the user's local "today" string in the user message.
- Never include any prose outside the JSON. No markdown fences.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const contentType = String(body.contentType || "").slice(0, 40);
    const title = String(body.title || "").slice(0, 200);
    const content = String(body.content || "").slice(0, 4000);
    const timeZone = String(body.timeZone || "").slice(0, 60);

    if (!title && !content) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let localDate = "";
    if (timeZone) {
      try {
        localDate = new Intl.DateTimeFormat("en-US", {
          timeZone, weekday: "long", year: "numeric", month: "long", day: "numeric",
        }).format(new Date());
      } catch { /* ignore */ }
    }

    const userMessage =
      `Today is ${localDate || new Date().toISOString().slice(0, 10)} (user time zone: ${timeZone || "unknown"}).\n` +
      `New ${contentType || "item"} titled: "${title}"\n\nBody:\n${content || "(no body)"}`;

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ suggestions: [], error: "LOVABLE_API_KEY missing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${lovableKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      return new Response(JSON.stringify({ suggestions: [], error: `gateway ${aiRes.status}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const j = await aiRes.json();
    const text = j?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(text); } catch { parsed = { suggestions: [] }; }
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [];

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ suggestions: [], error: e?.message || "error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
