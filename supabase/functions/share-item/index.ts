import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SHAREABLE_TYPES = ["zettel_card", "note", "file", "mind_map", "catalyst_document", "sticky_note", "scratchpad"] as const;
type ItemType = typeof SHAREABLE_TYPES[number];

const TABLE_BY_TYPE: Record<ItemType, string> = {
  zettel_card: "zettel_cards",
  note: "notes",
  file: "files",
  mind_map: "mind_maps",
  catalyst_document: "catalyst_documents",
  sticky_note: "sticky_notes",
  scratchpad: "scratchpad_notes",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const ownerId = userData.user.id;

    const body = await req.json();
    const { recipient_ids, item_type, item_id, permission = "view", share_mode = "collaborate", message } = body || {};

    if (!Array.isArray(recipient_ids) || recipient_ids.length === 0) {
      return new Response(JSON.stringify({ error: "recipient_ids required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!SHAREABLE_TYPES.includes(item_type)) {
      return new Response(JSON.stringify({ error: "Invalid item_type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!item_id) {
      return new Response(JSON.stringify({ error: "item_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!["view", "edit"].includes(permission) || !["copy", "collaborate"].includes(share_mode)) {
      return new Response(JSON.stringify({ error: "Invalid permission/mode" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch the source item via user client (verifies ownership via RLS)
    const tableName = TABLE_BY_TYPE[item_type as ItemType];
    const { data: sourceItem, error: srcErr } = await userClient
      .from(tableName)
      .select("*")
      .eq("id", item_id)
      .maybeSingle();

    if (srcErr || !sourceItem) {
      return new Response(JSON.stringify({ error: "Item not found or access denied" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: any[] = [];
    const errors: any[] = [];

    for (const recipientId of recipient_ids) {
      // Verify friendship
      const { data: isFriend } = await admin.rpc("are_friends", { _user_id_1: ownerId, _user_id_2: recipientId });
      if (!isFriend) {
        errors.push({ recipient_id: recipientId, error: "Not friends" });
        continue;
      }

      let clonedItemId: string | null = null;

      if (share_mode === "copy") {
        // Deep clone: strip id/timestamps, set new owner
        const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = sourceItem as any;
        const cloned = { ...rest, user_id: recipientId };
        const { data: clone, error: cloneErr } = await admin.from(tableName).insert(cloned).select("id").single();
        if (cloneErr) {
          errors.push({ recipient_id: recipientId, error: cloneErr.message });
          continue;
        }
        clonedItemId = clone.id;
      }

      const { data: share, error: shareErr } = await admin
        .from("shared_items")
        .upsert({
          owner_id: ownerId,
          recipient_id: recipientId,
          item_type,
          item_id,
          permission,
          share_mode,
          status: "accepted",
          message: message || null,
          cloned_item_id: clonedItemId,
        }, { onConflict: "owner_id,recipient_id,item_type,item_id,share_mode" })
        .select()
        .single();

      if (shareErr) {
        errors.push({ recipient_id: recipientId, error: shareErr.message });
        continue;
      }

      // Notification
      const itemTitle = (sourceItem as any).title || (sourceItem as any).name || (sourceItem as any).file_name || "an item";
      await admin.from("in_app_notifications").insert({
        user_id: recipientId,
        title: share_mode === "copy" ? `📨 You received a copy of "${itemTitle}"` : `🤝 ${permission === "edit" ? "Edit" : "View"} access shared: "${itemTitle}"`,
        body: message || null,
        item_type,
        item_id: clonedItemId || item_id,
      });

      results.push(share);
    }

    return new Response(JSON.stringify({ shared: results, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("share-item error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
