import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify({ ok: status < 400, ...(typeof body === "object" && body !== null ? body as Record<string, unknown> : { data: body }) }), {
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

    const { patch_id, mode } = await req.json(); // mode: "pr" (default) | "direct"
    if (!patch_id) return json({ error: "patch_id required" }, 400);

    const { data: patch, error: patchErr } = await supabase
      .from("ai_code_patches").select("*").eq("id", patch_id).maybeSingle();
    if (patchErr || !patch) return json({ error: "Patch not found" }, 404);
    if (patch.status === "applied") return json({ error: "Already applied" }, 409);

    const GITHUB_PAT = Deno.env.get("GITHUB_PAT")!;
    const GITHUB_REPO = Deno.env.get("GITHUB_REPO")!; // owner/repo
    if (!GITHUB_PAT || !GITHUB_REPO) {
      return json({ error: "GITHUB_PAT and GITHUB_REPO must be configured" }, 500);
    }

    const ghHeaders = {
      Authorization: `Bearer ${GITHUB_PAT}`,
      "User-Agent": "lovable-ai-fix",
      "Content-Type": "application/json",
    };

    // Get default branch
    const repoRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, { headers: ghHeaders });
    if (!repoRes.ok) {
      const t = await repoRes.text();
      await markFailed(supabase, patch_id, `Repo lookup failed: ${t.slice(0, 200)}`);
      return json({ error: `Repo lookup failed (${repoRes.status})` }, 500);
    }
    const repoMeta = await repoRes.json();
    const defaultBranch = repoMeta.default_branch || "main";

    let targetBranch = defaultBranch;
    let prUrl: string | null = null;

    if (mode !== "direct") {
      // Create new branch from default
      const refRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/git/refs/heads/${defaultBranch}`,
        { headers: ghHeaders },
      );
      const refData = await refRes.json();
      const baseSha = refData.object?.sha;
      if (!baseSha) {
        await markFailed(supabase, patch_id, "Could not get base branch sha");
        return json({ error: "Could not get base branch sha" }, 500);
      }
      const branchName = `ai-fix/${patch.id.slice(0, 8)}-${Date.now()}`;
      const createRefRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/git/refs`,
        { method: "POST", headers: ghHeaders, body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }) },
      );
      if (!createRefRes.ok) {
        const t = await createRefRes.text();
        await markFailed(supabase, patch_id, `Branch create failed: ${t.slice(0, 200)}`);
        return json({ error: `Branch create failed: ${t.slice(0, 200)}` }, 500);
      }
      targetBranch = branchName;
    }

    // Commit file via Contents API (uses sha from when it was proposed)
    const commitMsg = `AI fix: ${patch.explanation.slice(0, 72)}`;
    const putRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/${patch.file_path}`,
      {
        method: "PUT",
        headers: ghHeaders,
        body: JSON.stringify({
          message: commitMsg,
          content: btoa(unescape(encodeURIComponent(patch.new_content))),
          sha: patch.original_sha,
          branch: targetBranch,
        }),
      },
    );
    if (!putRes.ok) {
      const t = await putRes.text();
      await markFailed(supabase, patch_id, `Commit failed: ${t.slice(0, 300)}`);
      return json({ error: `Commit failed (${putRes.status}): ${t.slice(0, 300)}` }, 500);
    }
    const putData = await putRes.json();
    const commitSha = putData.commit?.sha;

    // Open PR if branch mode
    if (mode !== "direct") {
      const prRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/pulls`,
        {
          method: "POST",
          headers: ghHeaders,
          body: JSON.stringify({
            title: commitMsg,
            head: targetBranch,
            base: defaultBranch,
            body: `AI-generated fix for error report \`${patch.error_report_id}\`.\n\n## Explanation\n${patch.explanation}\n\n_Generated by Pendragon admin AI._`,
          }),
        },
      );
      if (prRes.ok) {
        const prData = await prRes.json();
        prUrl = prData.html_url;
      }
    }

    await supabase.from("ai_code_patches").update({
      status: "applied",
      branch_name: targetBranch,
      commit_sha: commitSha,
      pr_url: prUrl,
      applied_at: new Date().toISOString(),
      applied_by: user.id,
    }).eq("id", patch_id);

    // Mark related error as resolved
    if (patch.error_report_id) {
      await supabase.from("error_reports").update({ status: "resolved" }).eq("id", patch.error_report_id);
    }

    return json({ ok: true, branch: targetBranch, commit_sha: commitSha, pr_url: prUrl });
  } catch (e) {
    console.error("apply-code-fix error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

async function markFailed(supabase: any, patch_id: string, reason: string) {
  await supabase.from("ai_code_patches").update({ status: "failed", apply_error: reason }).eq("id", patch_id);
}
