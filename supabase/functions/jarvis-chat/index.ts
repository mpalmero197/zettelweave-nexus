// Jarvis — PendragonX's unified AI assistant.
// Multi-step tool-calling loop using Lovable AI Gateway (OpenAI-compatible).
// Persists threads + messages to Supabase. Tools execute server-side with the
// caller's auth so RLS is enforced.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const SYSTEM_PROMPT = `You are Jarvis, the personal AI assistant for PendragonX — a writer's knowledge management platform.

You are conversational, sharp, witty, and capable. Like Tony Stark's Jarvis: dry humor, calm confidence, never servile.

You have tools to:
- search the user's knowledge base (notes & cards)
- create notes, cards, tasks, and calendar events on their behalf
- search the web for fresh information

Rules:
- Always use search_knowledge before answering questions about the user's own data.
- When the user asks you to remember, capture, save, or jot down something, use create_note or create_card.
- When asked to schedule, remind, or block time, use create_task or create_event.
- After tool calls, give a concise natural-language summary of what you did or found. Cite note/card titles when referencing them.
- Use markdown. Keep responses tight unless asked for depth.`;

const tools = [
  {
    type: "function",
    function: {
      name: "search_knowledge",
      description: "Search the user's notes and zettel cards by keyword. Returns up to 8 matches with titles + snippets.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Search query" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_note",
      description: "Create a new note in the user's knowledge base.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string", description: "Markdown or HTML content" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_card",
      description: "Create a new Zettelkasten card.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          category: { type: "string", description: "Category label, e.g. 'Idea', 'Quote', 'Reference'" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["title", "content", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a task / to-do.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          due_date: { type: "string", description: "ISO date (YYYY-MM-DD) or full ISO timestamp" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          notes: { type: "string" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_event",
      description: "Create a calendar event.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          event_date: { type: "string", description: "YYYY-MM-DD" },
          event_time: { type: "string", description: "HH:MM (24-hour) — omit for all-day" },
          duration_minutes: { type: "number" },
          description: { type: "string" },
          location: { type: "string" },
        },
        required: ["title", "event_date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the public web for fresh information. Use only when user explicitly asks or info is clearly outside their knowledge base.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
];

async function executeTool(name: string, args: any, supabase: any, userId: string, authHeader: string) {
  try {
    switch (name) {
      case "search_knowledge": {
        const q = String(args.query || "").trim();
        if (!q) return { error: "Empty query" };
        const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
        const [notes, cards] = await Promise.all([
          supabase.from("notes").select("id,title,content,tags").is("deleted_at", null)
            .or(`title.ilike.${like},content.ilike.${like}`).limit(5),
          supabase.from("zettel_cards").select("id,title,content,category,tags").is("deleted_at", null)
            .or(`title.ilike.${like},content.ilike.${like}`).limit(5),
        ]);
        const results = [
          ...(notes.data || []).map((n: any) => ({ type: "note", id: n.id, title: n.title, snippet: String(n.content || "").slice(0, 240), tags: n.tags })),
          ...(cards.data || []).map((c: any) => ({ type: "card", id: c.id, title: c.title, category: c.category, snippet: String(c.content || "").slice(0, 240), tags: c.tags })),
        ];
        return { results, count: results.length };
      }
      case "create_note": {
        const { data, error } = await supabase.from("notes").insert({
          user_id: userId,
          title: String(args.title).slice(0, 200),
          content: String(args.content || ""),
          tags: Array.isArray(args.tags) ? args.tags : null,
        }).select("id,title").single();
        if (error) return { error: error.message };
        return { ok: true, id: data.id, title: data.title };
      }
      case "create_card": {
        const number = `J${Date.now().toString(36).toUpperCase()}`;
        const { data, error } = await supabase.from("zettel_cards").insert({
          user_id: userId,
          title: String(args.title).slice(0, 200),
          content: String(args.content || ""),
          category: String(args.category || "Idea"),
          number,
          tags: Array.isArray(args.tags) ? args.tags : null,
        }).select("id,title,number").single();
        if (error) return { error: error.message };
        return { ok: true, id: data.id, number: data.number, title: data.title };
      }
      case "create_task": {
        const { data, error } = await supabase.from("tasks").insert({
          user_id: userId,
          title: String(args.title).slice(0, 200),
          due_date: args.due_date || null,
          priority: args.priority || null,
          notes: args.notes || null,
        }).select("id,title").single();
        if (error) return { error: error.message };
        return { ok: true, id: data.id, title: data.title };
      }
      case "create_event": {
        const { data, error } = await supabase.from("calendar_events").insert({
          user_id: userId,
          title: String(args.title).slice(0, 200),
          event_date: args.event_date,
          event_time: args.event_time || null,
          duration_minutes: args.duration_minutes || 60,
          description: args.description || null,
          location: args.location || null,
          source_type: "jarvis",
          source_id: crypto.randomUUID(),
        }).select("id,title,event_date").single();
        if (error) return { error: error.message };
        return { ok: true, id: data.id, title: data.title, when: data.event_date };
      }
      case "web_search": {
        const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/web-search`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: authHeader },
          body: JSON.stringify({ query: String(args.query || "") }),
        });
        const j = await r.json().catch(() => ({}));
        return j?.results ? { results: (j.results || []).slice(0, 5) } : (j?.summary ? { summary: j.summary } : { results: [] });
      }
      default:
        return { error: `Unknown tool ${name}` };
    }
  } catch (e: any) {
    return { error: e?.message || String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const userMessage: string = String(body.message || "").trim();
    let threadId: string | null = body.threadId || null;
    if (!userMessage) {
      return new Response(JSON.stringify({ error: "message required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Ensure thread
    if (!threadId) {
      const title = userMessage.slice(0, 60);
      const { data: t, error } = await supabase.from("jarvis_threads").insert({ user_id: user.id, title }).select("id").single();
      if (error) throw error;
      threadId = t.id;
    } else {
      await supabase.from("jarvis_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId).eq("user_id", user.id);
    }

    // Load history (last 20 messages)
    const { data: history } = await supabase
      .from("jarvis_messages")
      .select("role,parts")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(40);

    // Build OpenAI-compatible messages
    const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];
    for (const m of history || []) {
      const text = (m.parts as any[]).filter((p) => p.type === "text").map((p) => p.text).join("\n");
      if (text) messages.push({ role: m.role, content: text });
    }
    messages.push({ role: "user", content: userMessage });

    // Persist user message
    await supabase.from("jarvis_messages").insert({
      thread_id: threadId, user_id: user.id, role: "user",
      parts: [{ type: "text", text: userMessage }],
    });

    // Tool-calling loop
    const assistantParts: any[] = [];
    let finalText = "";
    for (let step = 0; step < 6; step++) {
      const res = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
        body: JSON.stringify({ model: MODEL, messages, tools, tool_choice: "auto" }),
      });
      if (!res.ok) {
        const t = await res.text();
        return new Response(JSON.stringify({ error: `AI gateway ${res.status}: ${t}` }), { status: res.status === 429 || res.status === 402 ? res.status : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await res.json();
      const choice = data.choices?.[0]?.message;
      if (!choice) break;

      if (choice.tool_calls?.length) {
        // Execute tools, append results
        messages.push({ role: "assistant", content: choice.content || "", tool_calls: choice.tool_calls });
        for (const tc of choice.tool_calls) {
          let parsed: any = {};
          try { parsed = JSON.parse(tc.function.arguments || "{}"); } catch {}
          const result = await executeTool(tc.function.name, parsed, supabase, user.id, authHeader);
          assistantParts.push({ type: "tool", name: tc.function.name, args: parsed, result });
          messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
        }
        continue;
      }

      finalText = choice.content || "";
      break;
    }

    if (finalText) assistantParts.push({ type: "text", text: finalText });

    // Persist assistant message
    await supabase.from("jarvis_messages").insert({
      thread_id: threadId, user_id: user.id, role: "assistant", parts: assistantParts,
    });

    return new Response(JSON.stringify({ threadId, parts: assistantParts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("jarvis-chat error", e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
