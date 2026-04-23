import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify({ ok: status < 400, ...body }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Invalid token" }, 401);

    const { data: roleData } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) return json({ error: "Admin only" }, 403);

    const { error_report_id, hint } = await req.json();
    if (!error_report_id) return json({ error: "error_report_id required" }, 400);

    // Fetch the error
    const { data: errorReport } = await supabase
      .from("error_reports").select("*").eq("id", error_report_id).maybeSingle();
    if (!errorReport) return json({ error: "Error report not found" }, 404);

    // Best-effort guess of the file path from filename or stack
    const guessedPath = guessFilePath(errorReport.filename, errorReport.stack_trace);
    if (!guessedPath) {
      return json({ error: "Could not determine source file path from this error. Provide a hint." }, 400);
    }

    // Pull file from GitHub
    const GITHUB_PAT = Deno.env.get("GITHUB_PAT");
    const GITHUB_REPO = Deno.env.get("GITHUB_REPO"); // e.g. "owner/repo"
    if (!GITHUB_PAT || !GITHUB_REPO) {
      return json({ error: "GITHUB_PAT and GITHUB_REPO must be configured" }, 500);
    }

    const fileRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${guessedPath}`,
      { headers: { Authorization: `Bearer ${GITHUB_PAT}`, "User-Agent": "lovable-ai-fix" } },
    );
    if (!fileRes.ok) {
      const t = await fileRes.text();
      return json({ error: `GitHub fetch failed (${fileRes.status}): ${t.slice(0, 200)}` }, 500);
    }
    const fileMeta = await fileRes.json();
    const originalContent = atob(fileMeta.content.replace(/\n/g, ""));
    const originalSha = fileMeta.sha;

    // Ask AI for a full-file replacement
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY missing" }, 500);

    const systemPrompt = `You are a senior React/TypeScript engineer fixing a production frontend error.
You will receive: (1) the exact runtime error, (2) the full current source of the file most likely to contain the bug.
Your job: return a JSON object: { "explanation": string, "new_content": string }.

Rules:
- "new_content" MUST be the COMPLETE file with the bug fixed (not a diff).
- Preserve all existing functionality, imports, styling, and unrelated code.
- Use the project's existing patterns (Tailwind semantic tokens, shadcn/ui, supabase client from "@/integrations/supabase/client").
- If the file does not contain the bug, return { "explanation": "WRONG_FILE: <reason>", "new_content": "<original unchanged>" }.
- No markdown, no code fences — pure JSON.`;

    const userPrompt = `## Error
Type: ${errorReport.error_type}
Message: ${errorReport.error_message}
File: ${errorReport.filename}
Line: ${errorReport.line_number}
Stack:
${(errorReport.stack_trace || "").slice(0, 2000)}

${hint ? `## Admin hint\n${hint}\n` : ""}

## File: ${guessedPath}
\`\`\`
${originalContent}
\`\`\``;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      return json({ error: `AI gateway error (${aiRes.status}): ${t.slice(0, 300)}` }, 500);
    }
    const aiJson = await aiRes.json();
    const raw = aiJson.choices?.[0]?.message?.content || "{}";
    let parsed: { explanation: string; new_content: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      return json({ error: "AI returned invalid JSON" }, 500);
    }
    if (!parsed.new_content || !parsed.explanation) {
      return json({ error: "AI response missing fields" }, 500);
    }
    if (parsed.explanation.startsWith("WRONG_FILE")) {
      return json({ error: parsed.explanation }, 422);
    }

    // Stage the patch
    const { data: patch, error: insertErr } = await supabase
      .from("ai_code_patches").insert({
        error_report_id,
        file_path: guessedPath,
        original_sha: originalSha,
        original_content: originalContent,
        new_content: parsed.new_content,
        explanation: parsed.explanation,
        ai_model: "google/gemini-3-flash-preview",
        status: "proposed",
        created_by: user.id,
      }).select().single();

    if (insertErr) return json({ error: insertErr.message }, 500);
    return json({ patch });
  } catch (e) {
    console.error("propose-code-fix error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function guessFilePath(filename: string | null, stack: string | null): string | null {
  const candidates: string[] = [];
  if (filename) candidates.push(filename);
  if (stack) {
    const matches = stack.matchAll(/(?:src|supabase\/functions)\/[\w\-./]+\.(?:tsx?|jsx?)/g);
    for (const m of matches) candidates.push(m[0]);
  }
  for (const c of candidates) {
    const idx = c.indexOf("src/");
    if (idx >= 0) return c.slice(idx).split("?")[0].split(":")[0];
    const idx2 = c.indexOf("supabase/functions/");
    if (idx2 >= 0) return c.slice(idx2).split("?")[0].split(":")[0];
  }
  return null;
}
