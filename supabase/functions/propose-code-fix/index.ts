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
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

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

    const { error_report_id, hint, file_path_override } = await req.json();
    if (!error_report_id) return json({ error: "error_report_id required" }, 400);

    const { data: errorReport } = await supabase
      .from("error_reports").select("*").eq("id", error_report_id).maybeSingle();
    if (!errorReport) return json({ error: "Error report not found" }, 404);

    const GITHUB_PAT = Deno.env.get("GITHUB_PAT");
    const GITHUB_REPO = (Deno.env.get("GITHUB_REPO") || "").trim()
      .replace(/^https?:\/\/github\.com\//, "")
      .replace(/\.git$/, "")
      .replace(/\/$/, "");
    if (!GITHUB_PAT || !GITHUB_REPO) {
      return json({ error: "GITHUB_PAT and GITHUB_REPO must be configured (format: owner/repo)" }, 500);
    }
    if (!/^[^/]+\/[^/]+$/.test(GITHUB_REPO)) {
      return json({ error: `GITHUB_REPO must be "owner/repo", got "${GITHUB_REPO}"` }, 500);
    }

    const ghHeaders = { Authorization: `Bearer ${GITHUB_PAT}`, "User-Agent": "lovable-ai-fix" };

    // Resolve default branch
    const repoRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, { headers: ghHeaders });
    if (!repoRes.ok) {
      const t = await repoRes.text();
      return json({
        error: `Cannot access repo "${GITHUB_REPO}" (${repoRes.status}). Check GITHUB_REPO + PAT scope (Contents: read). ${t.slice(0, 150)}`,
      }, 500);
    }
    const repoMeta = await repoRes.json();
    const defaultBranch = repoMeta.default_branch || "main";

    // Build candidate paths
    const candidates = file_path_override
      ? [String(file_path_override).trim()]
      : guessFilePaths(errorReport.filename, errorReport.stack_trace);

    if (candidates.length === 0) {
      return json({
        error: `Could not determine source file path from this error. Filename was "${errorReport.filename ?? "(none)"}". Provide a file_path_override (e.g. "src/components/Foo.tsx").`,
      }, 400);
    }

    // Try each candidate against the default branch
    let originalContent = "";
    let originalSha = "";
    let resolvedPath = "";
    const tried: string[] = [];
    for (const path of candidates) {
      tried.push(path);
      const fileRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${encodeURI(path)}?ref=${encodeURIComponent(defaultBranch)}`,
        { headers: ghHeaders },
      );
      if (fileRes.ok) {
        const fileMeta = await fileRes.json();
        if (fileMeta.content) {
          originalContent = atob(fileMeta.content.replace(/\n/g, ""));
          originalSha = fileMeta.sha;
          resolvedPath = path;
          break;
        }
      }
    }
    if (!resolvedPath) {
      return json({
        error: `File not found in ${GITHUB_REPO}@${defaultBranch}. Tried:\n  - ${tried.join("\n  - ")}\nProvide a file_path_override matching the path in your repo.`,
      }, 404);
    }

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

## File: ${resolvedPath}
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

    const { data: patch, error: insertErr } = await supabase
      .from("ai_code_patches").insert({
        error_report_id,
        file_path: resolvedPath,
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

function guessFilePaths(filename: string | null, stack: string | null): string[] {
  const candidates = new Set<string>();
  const add = (raw: string) => {
    let c = raw.split("?")[0].split("#")[0];
    // strip line:col
    c = c.replace(/:\d+:\d+$/, "").replace(/:\d+$/, "");
    // strip leading origin
    c = c.replace(/^https?:\/\/[^/]+\//, "");
    // strip Vite asset prefixes
    c = c.replace(/^@fs\//, "").replace(/^@id\//, "");
    // ignore bundled assets
    if (/\/assets\/.*-[a-f0-9]{6,}\.(js|css)$/i.test(c)) return;
    const srcIdx = c.indexOf("src/");
    const fnIdx = c.indexOf("supabase/functions/");
    if (srcIdx >= 0) candidates.add(c.slice(srcIdx));
    else if (fnIdx >= 0) candidates.add(c.slice(fnIdx));
    else if (/^(src|supabase)\//.test(c)) candidates.add(c);
  };
  if (filename) add(filename);
  if (stack) {
    const re = /(?:src|supabase\/functions)\/[\w\-./]+\.(?:tsx?|jsx?|mjs)/g;
    for (const m of stack.matchAll(re)) add(m[0]);
  }
  return [...candidates];
}
