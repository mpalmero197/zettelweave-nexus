// ALICE auto-link: for each user's cards, propose connections.
// Mode (profiles.auto_link_mode):
//   - 'auto'    : write to linked_cards (skipping user-locked cards)
//   - 'suggest' : write to suggested_links (dotted lines in graph)
//   - 'manual'  : no-op
// Sources of links:
//   1. Embedding cosine similarity (>= SIM_THRESHOLD)
//   2. Dewey number prefix match (first 3 chars / category bucket)

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SIM_THRESHOLD = 0.78;
const MAX_LINKS_PER_CARD = 5;
const MAX_CARDS_PER_RUN = 200;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    let targetUserId: string | null = null;
    let forceMode: string | null = null;
    try {
      const body = await req.json();
      targetUserId = body?.user_id ?? null;
      forceMode = body?.mode ?? null;
    } catch { /* empty */ }

    // Resolve mode per user (default 'auto')
    const modeByUser = new Map<string, string>();
    async function getMode(uid: string): Promise<string> {
      if (forceMode) return forceMode;
      if (modeByUser.has(uid)) return modeByUser.get(uid)!;
      const { data } = await supabase
        .from("profiles").select("auto_link_mode").eq("user_id", uid).maybeSingle();
      const m = (data as any)?.auto_link_mode ?? "auto";
      modeByUser.set(uid, m);
      return m;
    }

    let q = supabase
      .from("zettel_cards")
      .select("id, user_id, number, content_embedding, auto_linked_at, updated_at, links_locked")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(MAX_CARDS_PER_RUN);
    if (targetUserId) q = q.eq("user_id", targetUserId);

    const { data: cards, error } = await q;
    if (error) throw error;

    let updated = 0;
    const errors: string[] = [];

    for (const card of cards ?? []) {
      const mode = await getMode(card.user_id);
      if (mode === "manual") continue;

      // For 'auto' we skip already-in-sync, locked cards stay locked.
      if (
        mode === "auto" &&
        !targetUserId &&
        card.auto_linked_at &&
        new Date(card.auto_linked_at).getTime() >= new Date(card.updated_at).getTime()
      ) continue;

      // 1) Embedding similarity
      const { data: similar, error: simErr } = await supabase.rpc(
        "find_similar_zettel_cards",
        { target_id: card.id, similarity_threshold: SIM_THRESHOLD, max_results: MAX_LINKS_PER_CARD },
      );
      if (simErr) { errors.push(`sim ${card.id}: ${simErr.message}`); continue; }
      const ids = new Set<string>((similar ?? []).map((s: any) => s.id));

      // 2) Dewey number prefix (first 3 chars) within same user
      if (card.number) {
        const prefix = String(card.number).slice(0, 3);
        const { data: byNum } = await supabase
          .from("zettel_cards")
          .select("id")
          .eq("user_id", card.user_id)
          .is("deleted_at", null)
          .neq("id", card.id)
          .like("number", `${prefix}%`)
          .limit(MAX_LINKS_PER_CARD);
        for (const r of byNum ?? []) ids.add((r as any).id);
      }

      const linkIds = Array.from(ids).slice(0, MAX_LINKS_PER_CARD);

      if (mode === "auto") {
        if (card.links_locked) continue;
        const { error: setErr } = await supabase.rpc("alice_set_auto_links", {
          _card_id: card.id, _link_ids: linkIds,
        });
        if (setErr) { errors.push(`set ${card.id}: ${setErr.message}`); continue; }
      } else {
        // suggest
        const { error: setErr } = await supabase.rpc("alice_set_suggested_links", {
          _card_id: card.id, _link_ids: linkIds,
        });
        if (setErr) { errors.push(`suggest ${card.id}: ${setErr.message}`); continue; }
      }
      updated++;
    }

    return new Response(
      JSON.stringify({ ok: true, scanned: cards?.length ?? 0, updated, errors: errors.slice(0, 10) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("alice-auto-link failed:", e);
    return new Response(JSON.stringify({ ok: false, error: e.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
