// Scholar curriculum sync — regenerates lesson content from the capability registry.
// Triggered nightly via cron and on-demand from Admin → Scholar.
//
// For v1 this function uses Gemini to draft a written lesson + 3-step walkthrough +
// ALICE system prompt for each capability whose lesson is missing or stale.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type Capability = {
  slug: string;
  module_slug: string;
  title: string;
  summary: string;
};

async function generateLesson(cap: Capability) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: "You generate concise, friendly tutorial content for Baku Scribe users. Output strict JSON only.",
        },
        {
          role: "user",
          content: `Capability: ${cap.title}\nSummary: ${cap.summary}\n\nReturn JSON with keys:\n- written_md: a 150-250 word markdown lesson (use ## headers, bullet lists, one tip blockquote)\n- walkthrough: array of 3-5 objects { content: string } describing what to click/try in the sandbox\n- alice_prompt: a short system prompt (2-3 sentences) telling ALICE to teach this capability and answer learner questions.\n\nReturn JSON only, no markdown fences.`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Gateway error: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content ?? "{}";
  const clean = raw.replace(/^```json\n?/, "").replace(/```$/, "").trim();
  return JSON.parse(clean);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const body = await req.json().catch(() => ({}));
  const forceSlugs: string[] | undefined = body.slugs;

  // Read lessons that need (re)generation: missing written_md, or specific slugs.
  const query = supabase.from("scholar_lessons").select("slug, module_slug, title, summary, written_md, walkthrough_json, version");
  const { data: lessons, error } = forceSlugs?.length
    ? await query.in("slug", forceSlugs)
    : await query;

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const updated: string[] = [];
  const failed: { slug: string; error: string }[] = [];

  for (const lesson of lessons ?? []) {
    const needsGen = forceSlugs?.length
      ? true
      : !lesson.written_md || (Array.isArray(lesson.walkthrough_json) && lesson.walkthrough_json.length === 0);
    if (!needsGen) continue;

    try {
      const gen = await generateLesson({
        slug: lesson.slug, module_slug: lesson.module_slug, title: lesson.title, summary: lesson.summary ?? "",
      });
      const { error: upErr } = await supabase.from("scholar_lessons").update({
        written_md: gen.written_md ?? lesson.written_md,
        walkthrough_json: gen.walkthrough ?? [],
        alice_system_prompt: gen.alice_prompt ?? null,
        generated_at: new Date().toISOString(),
        model: "google/gemini-3-flash-preview",
        version: (lesson as any).version ? (lesson as any).version + 1 : 1,
      }).eq("slug", lesson.slug);
      if (upErr) throw upErr;
      updated.push(lesson.slug);
    } catch (e) {
      failed.push({ slug: lesson.slug, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return new Response(JSON.stringify({ updated, failed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
