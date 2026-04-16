import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(ok: boolean, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ ok, ...payload }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getMessageText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text?: unknown }).text ?? "");
        }

        return "";
      })
      .join("");
  }

  return String(content ?? "");
}

function sanitizeJson(raw: string): string {
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");

  if (firstBrace === -1 && firstBracket === -1) {
    throw new Error("No JSON found in response");
  }

  const start = firstBrace === -1
    ? firstBracket
    : firstBracket === -1
      ? firstBrace
      : Math.min(firstBrace, firstBracket);

  cleaned = cleaned.slice(start);

  const openingChar = cleaned[0];
  const closingChar = openingChar === "[" ? "]" : "}";
  const end = cleaned.lastIndexOf(closingChar);

  if (end !== -1) {
    cleaned = cleaned.slice(0, end + 1);
  }

  return cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ");
}

function parseAiJson<T>(raw: string): T {
  const cleaned = sanitizeJson(raw);
  const attempts = [
    cleaned,
    cleaned.replace(/,\s*([}\]])/g, "$1"),
  ];

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt) as T;
    } catch {
      continue;
    }
  }

  throw new Error("AI returned invalid JSON format");
}

function createExcerpt(content: unknown, maxLength = 700): string {
  return String(content ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

type AiCardUpdate = {
  id: string;
  number: string;
  category: string;
  linkedCards?: string[];
};

type AiResponse = {
  items?: AiCardUpdate[];
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const isPing = await req.clone().json().then((b: any) => !!b?.ping).catch(() => false);
  if (isPing) {
    return respond(true, { pong: true });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (!authHeader || authError || !user) {
      return respond(false, { error: "Authentication required" });
    }

    const { cards, fromMethod, toMethod } = await req.json();

    if (!Array.isArray(cards) || cards.length === 0) {
      return respond(false, { error: "No cards provided" });
    }

    if (!lovableApiKey) {
      return respond(false, { error: "AI service not configured" });
    }

    const organizationMethodDescriptions: Record<string, string> = {
      dewey: `Dewey Decimal Classification (000-999): Use the MOST SPECIFIC Dewey number possible (for example 973.4 instead of just 900). The category should include both the Dewey number and a human-readable meaning.`,
      luhmann: "Luhmann System: Alphanumeric branching such as 1, 1a, 1a1, 1a2, 1b, 2, 2a.",
      folgezettel: "Folgezettel System: Sequential decimal branching such as 1.1, 1.2, 1.2.1, 1.2.2, 2.1.",
      thematic: "Thematic Organization: Topic-based prefixes such as PHIL-001, HIST-001, SCI-001.",
    };

    const slimCards = cards.map((card: any) => ({
      id: String(card.id),
      title: String(card.title ?? ""),
      description: String(card.description ?? ""),
      excerpt: createExcerpt(card.content),
      currentNumber: String(card.number ?? ""),
      currentCategory: String(card.category ?? ""),
      tags: Array.isArray(card.tags) ? card.tags.map(String).slice(0, 12) : [],
      linkedCards: Array.isArray(card.linkedCards) ? card.linkedCards.map(String) : [],
    }));

    const systemPrompt = `You are an expert knowledge organization AI that converts Zettelkasten cards between different organizational systems.

TASK: Convert ${cards.length} cards from ${String(fromMethod).toUpperCase()} to ${String(toMethod).toUpperCase()}.

FROM SYSTEM: ${organizationMethodDescriptions[fromMethod] ?? fromMethod}
TO SYSTEM: ${organizationMethodDescriptions[toMethod] ?? toMethod}

CRITICAL RULES:
1. Return ONLY valid JSON.
2. Return a JSON object with exactly this shape: {"items":[{"id":"...","number":"...","category":"...","linkedCards":["..."]}]}
3. Return EXACTLY one item for every input card.
4. Only change number, category, and linkedCards.
5. Do NOT return title, content, description, or tags.
6. Each linkedCards value must be an id from the input set and must not include the card's own id.
7. Preserve logical relationships and group related ideas coherently.
8. For Dewey output, category must contain the Dewey number and its meaning.
9. Output raw JSON only. No markdown fences. No commentary.`;

    const userPrompt = JSON.stringify({ items: slimCards });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        max_tokens: 12000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return respond(false, {
          error: "AI service is temporarily busy. Please wait a moment and try again.",
          isRateLimit: true,
        });
      }

      if (response.status === 402) {
        return respond(false, {
          error: "AI credits depleted. Please add funds to continue.",
          isPaymentRequired: true,
        });
      }

      const errorText = await response.text();
      console.error("Lovable AI gateway error:", response.status, errorText);
      return respond(false, { error: `AI gateway error: ${response.status}` });
    }

    const data = await response.json();
    const choice = data?.choices?.[0];
    const finishReason = choice?.finish_reason;
    const aiResponseText = getMessageText(choice?.message?.content);

    if (!aiResponseText) {
      return respond(false, { error: "AI returned an empty response" });
    }

    console.log("AI reorganize finish reason:", finishReason ?? "unknown");
    console.log("AI reorganize response length:", aiResponseText.length);

    let parsed: AiResponse | AiCardUpdate[];
    try {
      parsed = parseAiJson<AiResponse | AiCardUpdate[]>(aiResponseText);
    } catch (parseError) {
      console.error("AI response parse failure:", parseError);
      console.error("AI response preview:", aiResponseText.slice(0, 1200));
      return respond(false, { error: "AI returned invalid JSON format" });
    }

    if (finishReason === "length") {
      return respond(false, { error: "AI response was truncated while reorganizing cards" });
    }

    const updates = Array.isArray(parsed) ? parsed : parsed.items;

    if (!Array.isArray(updates)) {
      return respond(false, { error: "AI response is missing items array" });
    }

    if (updates.length !== cards.length) {
      return respond(false, {
        error: `AI returned ${updates.length} card updates, expected ${cards.length}`,
      });
    }

    const validIds = new Set(cards.map((card: any) => String(card.id)));
    const updatesById = new Map<string, AiCardUpdate>();

    for (const update of updates) {
      if (!update || typeof update !== "object") {
        return respond(false, { error: "AI returned an invalid card update object" });
      }

      const id = String(update.id ?? "").trim();
      const number = String(update.number ?? "").trim();
      const category = String(update.category ?? "").trim();

      if (!id || !number || !category) {
        return respond(false, { error: "AI returned a card update with missing required fields" });
      }

      if (!validIds.has(id)) {
        return respond(false, { error: `AI returned an unknown card id: ${id}` });
      }

      updatesById.set(id, {
        id,
        number,
        category,
        linkedCards: Array.isArray(update.linkedCards)
          ? update.linkedCards
              .map((linkedId) => String(linkedId))
              .filter((linkedId) => validIds.has(linkedId) && linkedId !== id)
          : [],
      });
    }

    if (updatesById.size !== cards.length) {
      return respond(false, { error: "AI returned duplicate or missing card ids" });
    }

    const reorganizedCards = cards.map((card: any) => {
      const update = updatesById.get(String(card.id));

      if (!update) {
        return card;
      }

      return {
        ...card,
        number: update.number,
        category: update.category,
        linkedCards: update.linkedCards ?? card.linkedCards ?? [],
      };
    });

    return respond(true, { reorganizedCards });
  } catch (error) {
    console.error("Error in ai-reorganize-cards function:", error);
    return respond(false, {
      error: error instanceof Error ? error.message : "Failed to reorganize cards",
    });
  }
});
