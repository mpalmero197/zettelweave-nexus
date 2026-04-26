import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(
    JSON.stringify({
      ok: status < 400,
      ...(typeof body === "object" && body !== null ? (body as Record<string, unknown>) : { data: body }),
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );

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

    const { patch_id } = await req.json();
    if (!patch_id) return json({ error: "patch_id required" }, 400);

    const { data: patch, error: patchErr } = await supabase
      .from("ai_code_patches").select("*").eq("id", patch_id).maybeSingle();
    if (patchErr || !patch) return json({ error: "Patch not found" }, 404);
    if (patch.status !== "applied") return json({ error: "Patch is not applied" }, 409);
    if (patch.original_content == null) {
      return json({ error: "Cannot undo: original content was not stored" }, 400);
    }

    const GITHUB_PAT = Deno.env.get("GITHUB_PAT")!;
    const GITHUB_REPO = Deno.env.get("GITHUB_REPO")!;
    if (!GITHUB_PAT || !GITHUB_REPO) {
      return json({ error: "GITHUB_PAT and GITHUB_REPO must be configured" }, 500);
    }

    const ghHeaders = {
      Authorization: `Bearer ${GITHUB_PAT}`,
      "User-Agent": "lovable-ai-fix",
      "Content-Type": "application/json",
    };

    const repoRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}`, { headers: ghHeaders });
    if (!repoRes.ok) return json({ error: `Repo lookup failed (${repoRes.status})` }, 500);
    const defaultBranch = (await repoRes.json()).default_branch || "main";

    const isPrMode = !!patch.pr_url && patch.branch_name && patch.branch_name !== defaultBranch;
    let undoSummary = "";

    if (isPrMode) {
      // Close the PR (if still open) and delete the feature branch
      const prMatch = String(patch.pr_url).match(/\/pull\/(\d+)/);
      if (prMatch) {
        const prNumber = prMatch[1];
        await fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls/${prNumber}`, {
          method: "PATCH",
          headers: ghHeaders,
          body: JSON.stringify({ state: "closed" }),
        });
        undoSummary = `Closed PR #${prNumber}`;
      }
      const delRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/git/refs/heads/${patch.branch_name}`,
        { method: "DELETE", headers: ghHeaders },
      );
      if (delRes.ok || delRes.status === 422) {
        undoSummary += `${undoSummary ? "; " : ""}Deleted branch ${patch.branch_name}`;
      }
    } else {
      // Direct-to-main: write a revert commit restoring original_content
      // Get current sha of the file on default branch
      const fileRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${patch.file_path}?ref=${defaultBranch}`,
        { headers: ghHeaders },
      );
      if (!fileRes.ok) {
        const t = await fileRes.text();
        return json({ error: `File lookup failed: ${t.slice(0, 200)}` }, 500);
      }
      const fileData = await fileRes.json();
      const currentSha = fileData.sha;

      const putRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/${patch.file_path}`,
        {
          method: "PUT",
          headers: ghHeaders,
          body: JSON.stringify({
            message: `Revert AI fix: ${String(patch.explanation).slice(0, 60)}`,
            content: btoa(unescape(encodeURIComponent(patch.original_content))),
            sha: currentSha,
            branch: defaultBranch,
          }),
        },
      );
      if (!putRes.ok) {
        const t = await putRes.text();
        return json({ error: `Revert commit failed: ${t.slice(0, 300)}` }, 500);
      }
      const putData = await putRes.json();
      undoSummary = `Reverted ${patch.file_path} on ${defaultBranch} (${putData.commit?.sha?.slice(0, 7)})`;
    }

    await supabase.from("ai_code_patches").update({
      status: "reverted",
      apply_error: null,
    }).eq("id", patch_id);

    if (patch.error_report_id) {
      await supabase.from("error_reports").update({ status: "open" }).eq("id", patch.error_report_id);
    }

    return json({ ok: true, summary: undoSummary });
  } catch (e) {
    console.error("undo-code-fix error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});
