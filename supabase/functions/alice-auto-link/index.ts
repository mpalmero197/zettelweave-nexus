// ALICE auto-link: for each user's cards that aren't user-locked,
// find top-K similar cards via embedding cosine and update linked_cards.
// Skips cards whose links are user-modified (links_locked=true).

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
    // Optional: a specific user can be requested (manual trigger from UI)
    let targetUserId: string | null = null;
    try {
      const body = await req.json();
      targetUserId = body?.user_id ?? null;
    } catch { /* empty body ok */ }

    // Pull candidate cards: not locked, has embedding, recently changed or never auto-linked
    let q = supabase
      .from("zettel_cards")
      .select("id, user_id, content_embedding, auto_linked_at, updated_at")
      .eq("links_locked", false)
      .not("content_embedding", "is", null)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(MAX_CARDS_PER_RUN);

    if (targetUserId) q = q.eq("user_id", targetUserId);

    const { data: cards, error } = await q;
    if (error) throw error;

    let updated = 0;
    const errors: string[] = [];

    for (const card of cards ?? []) {
      // Skip if auto_linked_at >= updated_at (already in sync)
      if (
        !targetUserId &&
        card.auto_linked_at &&
        new Date(card.auto_linked_at).getTime() >= new Date(card.updated_at).getTime()
      ) continue;

      // Use the existing similarity RPC
      const { data: similar, error: simErr } = await supabase.rpc(
        "find_similar_zettel_cards",
        {
          target_id: card.id,
          similarity_threshold: SIM_THRESHOLD,
          max_results: MAX_LINKS_PER_CARD,
        },
      );
      if (simErr) { errors.push(`sim ${card.id}: ${simErr.message}`); continue; }

      const linkIds = (similar ?? []).map((s: any) => s.id);

      const { error: setErr } = await supabase.rpc("alice_set_auto_links", {
        _card_id: card.id,
        _link_ids: linkIds,
      });
      if (setErr) { errors.push(`set ${card.id}: ${setErr.message}`); continue; }

      updated++;
    }

    return new Response(
      JSON.stringify({ ok: true, scanned: cards?.length ?? 0, updated, errors: errors.slice(0, 10) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("alice-auto-link failed:", e);
    return new Response(JSON.stringify({ ok: false, error: e.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
