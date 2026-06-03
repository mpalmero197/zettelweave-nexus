import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callAI(apiKey: string, messages: any[]) {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      temperature: 0.5,
      max_tokens: 2048,
    }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const pageText: string = String(body.text || "").slice(0, 18000);
    const pageUrl: string = String(body.url || "");
    const pageTitle: string = String(body.title || "Untitled page");

    if (pageText.length < 50) {
      return new Response(JSON.stringify({ error: "Not enough text on this page to summarize." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `Summarize the following web page into a concise knowledge card in Markdown.

Title: ${pageTitle}
URL: ${pageUrl}

Page content:
"""
${pageText}
"""

Return ONLY this structure:
## TL;DR
(2-3 sentences)

## Key Points
- bullet
- bullet
- bullet (5-8 total)

## Notable Quotes / Facts
- ...

## Source
[${pageTitle}](${pageUrl})`;

    const summary = await callAI(apiKey, [
      { role: "system", content: "You write tight, faithful summaries of web pages. Never invent facts." },
      { role: "user", content: prompt },
    ]);

    const admin = createClient(supabaseUrl, serviceKey);
    const cardNumber = `WEB-${Date.now().toString(36).toUpperCase()}`;
    const title = pageTitle.length > 120 ? pageTitle.slice(0, 117) + "…" : pageTitle;

    const { data: card, error: insErr } = await admin
      .from("zettel_cards")
      .insert({
        user_id: user.id,
        title,
        content: summary,
        category: "reference",
        tags: ["web-clip", "summary"],
        number: cardNumber,
        description: pageUrl ? `Summarized from ${pageUrl}` : "Summarized web page",
      })
      .select("id, number, title")
      .single();

    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, card }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("summarize-page-to-card error", e);
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
