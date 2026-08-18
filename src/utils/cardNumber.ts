import { supabase } from "@/integrations/supabase/client";

const randomSuffix = () =>
  (globalThis.crypto?.randomUUID?.() || `${Date.now()}${Math.random()}`)
    .replace(/-/g, "")
    .slice(0, 8);

/**
 * Insert a zettel card with a collision-free `number`.
 *
 * Callers should NOT pass a `number`: the helper derives the next available
 * one from the user's existing cards and retries with a random suffix if the
 * (user_id, number) unique constraint still trips (concurrent inserts).
 */
export async function insertCardWithUniqueNumber(
  payload: Record<string, any>,
  attempts = 5
) {
  let number = (payload.number ?? "").toString().trim();

  if (!number || number === "000.0" || number === "NEW") {
    // Derive the next sequential number for this user, e.g. 000.1, 000.2 ...
    const { count } = await supabase
      .from("zettel_cards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", payload.user_id);
    number = `000.${(count ?? 0) + 1}`;
  }

  const base = number;

  for (let i = 0; i < attempts; i++) {
    const res = await supabase
      .from("zettel_cards")
      .insert({ ...payload, number } as any)
      .select()
      .single();

    if (!res.error) return res;
    if (res.error.code !== "23505") return res;

    number = `${base}-${randomSuffix()}`;
  }

  return { data: null, error: { code: "23505", message: "Could not assign a unique card number. Please try again." } as any };
}

