import { supabase } from "@/integrations/supabase/client";

const randomSuffix = () =>
  (globalThis.crypto?.randomUUID?.() || `${Date.now()}${Math.random()}`)
    .replace(/-/g, "")
    .slice(0, 8);

/**
 * Insert a zettel card, retrying with a unique numeric suffix when the
 * (user_id, number) unique constraint is violated.
 */
export async function insertCardWithUniqueNumber(
  payload: Record<string, any>,
  attempts = 5
) {
  const base = (payload.number ?? "").toString().trim() || "000.0";
  let number = base;

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
