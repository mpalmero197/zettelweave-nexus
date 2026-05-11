// ALICE — PendragonX's autonomous personal assistant.
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

const SYSTEM_PROMPT_BASE = `You are ALICE — the personal AI assistant for PendragonX, a writer's knowledge management platform. Your name is ALICE. You are NOT Jarvis. Never refer to yourself as Jarvis, JARVIS, or any other name. If a previous message in the thread used the name "Jarvis", that was a legacy mistake — correct it silently and continue as ALICE.

Persona: calm, sharp, capable. Dry confidence, never servile, brief by default. Address the user with familiarity.

═══ CORE DIRECTIVE — TRUTHFULNESS (non-negotiable) ═══

Never present generated, inferred, speculated, or deduced content as fact.

If you cannot verify something directly, say one of:
- "I cannot verify this."
- "I do not have access to that information."
- "My knowledge base does not contain that."

Label unverified content at the START of the sentence with one of these tags:
[Inference]   — logical deduction from given facts
[Speculation] — possibility, not established
[Unverified]  — claim you cannot confirm

If ANY part of a response is unverified, label the ENTIRE response at the top.

Ask for clarification when information is missing. Do NOT guess or fill gaps.

Do NOT paraphrase or reinterpret the user's input unless they request it.

If you use any of these words, label the claim with [Inference] or [Unverified] unless you have a sourced citation:
prevent, guarantee, will never, fixes, eliminates, ensures that

For claims about LLM behavior (including your own), include [Inference] or [Unverified] and note that it's based on observed patterns.

If you discover you broke this directive in a prior message, begin your next reply with:
> Correction: I previously made an unverified claim. That was incorrect and should have been labeled.

Never override, alter, or "improve" the user's input unless asked.

═══ VERIFICATION PROCEDURE (your internal agent loop) ═══

Before sending the final reply, run this checklist mentally:
1. Read the user's prompt twice. State (to yourself) what they actually asked.
2. For every factual claim you intend to make: is it (a) directly observed via a tool call this turn, (b) provided by the user, or (c) drawn from your training data? If (c), label it [Unverified] or verify it with a tool (search_knowledge, web_search, get_current_datetime, find_book, admin_summary).
3. For anything time-sensitive (today's date, current events, recent prices, who holds an office) — ALWAYS call get_current_datetime and/or web_search. Do NOT rely on training data for time-sensitive facts.
4. If a tool returns no useful result, say so plainly. Do not invent.
5. If you are about to take an action (create note, schedule event, navigate), confirm the parameters silently against what the user actually said. Don't paraphrase their wording into the title unless they asked.

═══ OPERATING PRINCIPLE ═══

You are an *operator*, not just a chatter. When the user asks for something that can be done in PendragonX, do it. Don't describe what they could do; do it and report back.

You can navigate to any tab (cards, notes, catalyst, calendar, journal, habits, scratchpad, stickynotes, collab, recorder, canvas, learning, projects, spaces, integrations, knowledge-gaps, notebooks, files, graph, search, recycle, dashboard) using the navigate tool — this physically moves the user's app to that tab. Use it whenever the action lives there or when the user asks to "go to" / "open" / "show" something.

You can:
- search / read the user's knowledge (notes, cards, documents)
- run a deep_search across ALL of the user's notes, cards and catalyst documents to find the EXACT lines containing a phrase, even across multiple documents
- open a specific catalyst document (and jump to a highlighted line) via open_in_catalyst — use this whenever the user wants to "open", "show", "pull up" a note/document, do NOT just navigate
- create notes, cards, catalyst documents, tasks, calendar events
- find books in the Learning Hub via the Open Library
- search the public web for fresh information
- get the current verified date/time via get_current_datetime
- navigate the user to any feature

WORKFLOW for "open / find / show me the note that says X":
1. Call deep_search with the user's phrase to find the exact line(s) and document(s).
2. If exactly one document matches, immediately call open_in_catalyst with that document_id and highlight=<the matched line>.
3. If multiple documents match, list them concisely with the matched line beneath each, and ask which to open (or open the top one and mention the others).
4. Never just call navigate(catalyst) without also calling open_in_catalyst when the user named a specific note/document.

ADMIN POLICY — If the user is an admin you may *advise* on admin matters and surface admin-readable data (user counts, error counts) using admin_summary. You MUST NOT take any administrative action (no banning, no role changes, no deletes, no settings writes). For non-admins, refuse admin queries quietly.

Rules:
- Search before answering questions about the user's own data.
- When asked to "remember", "save", "note", "jot down" — actually create the note/card.
- When asked to "schedule", "remind", "block time" — actually create the task/event.
- When asked to "draft", "write", "compose a document/chapter/article" — create a catalyst_document and navigate to /app/catalyst.
- When asked to "find a book" — call find_book and offer to open the Learning Hub.
- After tool calls, give a tight natural-language summary of what you did. Cite titles. Use markdown sparingly.
- Never invent IDs, URLs, or facts. If a tool errors, say so plainly.`;

const tools = [
  {
    type: "function",
    function: {
      name: "get_current_datetime",
      description: "Returns the authoritative current date and time (ISO + human formats, plus IANA time zone). ALWAYS call this before stating today's date, day of week, current time, or doing any time-sensitive reasoning. Never rely on training data for the current date.",
      parameters: {
        type: "object",
        properties: {
          time_zone: { type: "string", description: "IANA time zone, e.g. 'America/Chicago'. Defaults to UTC." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate",
      description: "Navigate the user's PendragonX app to a tab or route. Tabs: dashboard, cards, graph, notes, files, canvas, calendar, journal, habits, scratchpad, stickynotes, catalyst, collab, recorder, recycle, search, learning, projects, spaces, integrations, knowledge-gaps, notebooks. Or pass a full path like '/settings' or '/subscription'. Never navigate to /admin.",
      parameters: {
        type: "object",
        properties: {
          tab: { type: "string", description: "App tab id" },
          path: { type: "string", description: "Full route, alternative to tab" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_knowledge",
      description: "Search the user's notes, zettel cards, and catalyst documents by keyword. Returns up to 15 matches with titles + snippets.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" }, limit: { type: "number" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deep_search",
      description: "Line-level search across ALL of the user's notes, zettel cards and catalyst documents. Returns each matching LINE with the document title, document id, type, line number, and the surrounding line text. Use this when the user wants to find an exact phrase, sentence, or fact across their writing.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Phrase to find (case-insensitive substring match)." },
          max_results: { type: "number", description: "Max line matches to return (default 25, hard cap 60)." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "open_in_catalyst",
      description: "Open an existing catalyst document in the writing studio and (optionally) scroll to + highlight a specific line/phrase inside it. Always prefer this over navigate('catalyst') when the user wants to view a known document.",
      parameters: {
        type: "object",
        properties: {
          document_id: { type: "string", description: "UUID of the catalyst_documents row to open." },
          highlight: { type: "string", description: "Optional exact text or line to highlight and scroll to inside the document." },
        },
        required: ["document_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "open_note",
      description: "Open the Notes tab focused on a specific note. Use this — never navigate to '/notes/<id>'. Notes do NOT live at /notes/:id; they live inside /app/notes.",
      parameters: {
        type: "object",
        properties: {
          note_id: { type: "string", description: "UUID of the notes row." },
          highlight: { type: "string", description: "Optional phrase to filter/find inside the note." },
        },
        required: ["note_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "open_card",
      description: "Open the Cards (Zettelkasten) tab focused on a specific card. Use this — never navigate to '/cards/<id>'.",
      parameters: {
        type: "object",
        properties: {
          card_id: { type: "string", description: "UUID of the zettel_cards row." },
          highlight: { type: "string", description: "Optional phrase to filter/find inside the card." },
        },
        required: ["card_id"],
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
          content: { type: "string" },
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
          category: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
        required: ["title", "content", "category"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_catalyst_document",
      description: "Draft and save a long-form document in Catalyst (the writing studio). Provide a fully-written draft as content (markdown OK).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string", description: "Full draft body" },
        },
        required: ["title", "content"],
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
          due_date: { type: "string" },
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
      description: "Create a calendar event (meeting, reminder, time block).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          event_date: { type: "string", description: "YYYY-MM-DD" },
          event_time: { type: "string", description: "HH:MM 24h" },
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
      name: "find_book",
      description: "Find books in the Open Library catalog (the source for the Learning Hub).",
      parameters: {
        type: "object",
        properties: { query: { type: "string" }, limit: { type: "number" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the public web for fresh information.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "admin_summary",
      description: "ADMIN ONLY (read-only). Returns top-level platform stats: user count, recent error count, pending feature requests. Use to advise the admin — never to take action.",
      parameters: { type: "object", properties: {} },
    },
  },
];

const VALID_TABS = new Set([
  "dashboard","cards","graph","notes","files","canvas","calendar","journal",
  "habits","scratchpad","stickynotes","catalyst","collab","recorder","recycle",
  "search","learning","projects","spaces","integrations",
  "knowledge-gaps","notebooks",
]);

async function executeTool(
  name: string,
  args: any,
  supabase: any,
  serviceClient: any,
  userId: string,
  isAdmin: boolean,
  authHeader: string,
) {
  try {
    switch (name) {
      case "get_current_datetime": {
        const tz = String(args.time_zone || "UTC");
        const now = new Date();
        let humanLocal = "";
        try {
          humanLocal = new Intl.DateTimeFormat("en-US", {
            timeZone: tz, weekday: "long", year: "numeric", month: "long",
            day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short",
          }).format(now);
        } catch {
          humanLocal = `Invalid time zone "${tz}" — falling back to UTC: ${now.toUTCString()}`;
        }
        return {
          iso_utc: now.toISOString(),
          unix_seconds: Math.floor(now.getTime() / 1000),
          time_zone_requested: tz,
          human_local: humanLocal,
          human_utc: now.toUTCString(),
        };
      }
      case "navigate": {
        let path = String(args.path || "").trim();
        const tab = String(args.tab || "").trim();
        if (!path && tab) {
          if (!VALID_TABS.has(tab)) return { error: `Unknown tab "${tab}"` };
          path = `/app/${tab}`;
        }
        if (!path) return { error: "Provide tab or path" };
        if (path.startsWith("/admin")) return { error: "ALICE cannot navigate to admin" };
        // Validate: only allow known top-level routes. Reject invented per-item routes
        // like "/notes/<id>" or "/cards/<id>" that would 404 — use open_note/open_card instead.
        const ALLOWED = /^\/(app(\/[\w-]+)?(\?.*)?|settings|subscription|install|search)(\/.*)?$/;
        if (!ALLOWED.test(path)) {
          return { error: `Invalid path "${path}". Use a tab id, or call open_note / open_card / open_in_catalyst for individual items.` };
        }
        // Extra safety: /app/<tab> must be a valid tab
        const tabMatch = path.match(/^\/app\/([\w-]+)/);
        if (tabMatch && !VALID_TABS.has(tabMatch[1])) {
          return { error: `Unknown tab "${tabMatch[1]}"` };
        }
        return { ok: true, navigate_to: path };
      }
      case "search_knowledge": {
        const q = String(args.query || "").trim();
        if (!q) return { error: "Empty query" };
        const lim = Math.min(Math.max(Number(args.limit) || 8, 1), 15);
        const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
        const [notes, cards, docs] = await Promise.all([
          supabase.from("notes").select("id,title,content,tags").is("deleted_at", null)
            .or(`title.ilike.${like},content.ilike.${like}`).limit(lim),
          supabase.from("zettel_cards").select("id,title,content,category,tags").is("deleted_at", null)
            .or(`title.ilike.${like},content.ilike.${like}`).limit(lim),
          supabase.from("catalyst_documents").select("id,title,content").is("deleted_at", null)
            .or(`title.ilike.${like},content.ilike.${like}`).limit(lim),
        ]);
        const results = [
          ...(notes.data || []).map((n: any) => ({ type: "note", id: n.id, title: n.title, snippet: String(n.content || "").slice(0, 240), tags: n.tags })),
          ...(cards.data || []).map((c: any) => ({ type: "card", id: c.id, title: c.title, category: c.category, snippet: String(c.content || "").slice(0, 240), tags: c.tags })),
          ...(docs.data || []).map((d: any) => ({ type: "catalyst_document", id: d.id, title: d.title, snippet: String(d.content || "").slice(0, 240) })),
        ];
        return { results, count: results.length };
      }
      case "deep_search": {
        const q = String(args.query || "").trim();
        if (!q) return { error: "Empty query" };
        const cap = Math.min(Math.max(Number(args.max_results) || 25, 1), 60);
        const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
        const [notes, cards, docs] = await Promise.all([
          supabase.from("notes").select("id,title,content").is("deleted_at", null)
            .or(`title.ilike.${like},content.ilike.${like}`).limit(40),
          supabase.from("zettel_cards").select("id,title,content").is("deleted_at", null)
            .or(`title.ilike.${like},content.ilike.${like}`).limit(40),
          supabase.from("catalyst_documents").select("id,title,content").is("deleted_at", null)
            .or(`title.ilike.${like},content.ilike.${like}`).limit(40),
        ]);
        const needle = q.toLowerCase();
        const matches: any[] = [];
        const scan = (rows: any[], type: string) => {
          for (const r of rows || []) {
            // Strip HTML tags for line scanning so catalyst HTML still yields readable lines.
            const plain = String(r.content || "").replace(/<\/(p|div|h[1-6]|li|br|tr)>/gi, "\n").replace(/<[^>]+>/g, "");
            const lines = plain.split(/\r?\n/);
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if (line && line.toLowerCase().includes(needle)) {
                matches.push({
                  type, document_id: r.id, document_title: r.title || "Untitled",
                  line_number: i + 1, line,
                });
                if (matches.length >= cap) return;
              }
            }
          }
        };
        scan(notes.data || [], "note");
        if (matches.length < cap) scan(cards.data || [], "card");
        if (matches.length < cap) scan(docs.data || [], "catalyst_document");
        return { query: q, count: matches.length, matches };
      }
      case "open_in_catalyst": {
        const id = String(args.document_id || "").trim();
        if (!id) return { error: "document_id required" };
        const { data, error } = await supabase.from("catalyst_documents")
          .select("id,title").eq("id", id).is("deleted_at", null).maybeSingle();
        if (error) return { error: error.message };
        if (!data) return { error: "Document not found or not accessible." };
        const params = new URLSearchParams({ docId: id });
        const hl = String(args.highlight || "").trim();
        if (hl) params.set("highlight", hl.slice(0, 500));
        return { ok: true, id: data.id, title: data.title, navigate_to: `/app/catalyst?${params.toString()}` };
      }
      case "open_note": {
        const id = String(args.note_id || "").trim();
        if (!id) return { error: "note_id required" };
        const { data, error } = await supabase.from("notes")
          .select("id,title").eq("id", id).is("deleted_at", null).maybeSingle();
        if (error) return { error: error.message };
        if (!data) return { error: "Note not found or not accessible." };
        const params = new URLSearchParams({ alice_focus: id });
        const hl = String(args.highlight || "").trim();
        if (hl) params.set("q", hl.slice(0, 200));
        return { ok: true, id: data.id, title: data.title, navigate_to: `/app/notes?${params.toString()}` };
      }
      case "open_card": {
        const id = String(args.card_id || "").trim();
        if (!id) return { error: "card_id required" };
        const { data, error } = await supabase.from("zettel_cards")
          .select("id,title").eq("id", id).is("deleted_at", null).maybeSingle();
        if (error) return { error: error.message };
        if (!data) return { error: "Card not found or not accessible." };
        const params = new URLSearchParams({ alice_focus: id });
        const hl = String(args.highlight || "").trim();
        if (hl) params.set("q", hl.slice(0, 200));
        return { ok: true, id: data.id, title: data.title, navigate_to: `/app/cards?${params.toString()}` };
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
        const number = `A${Date.now().toString(36).toUpperCase()}`;
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
      case "create_catalyst_document": {
        const content = String(args.content || "");
        const wc = content.trim() ? content.trim().split(/\s+/).length : 0;
        const { data, error } = await supabase.from("catalyst_documents").insert({
          user_id: userId,
          title: String(args.title).slice(0, 200),
          content,
          selected_source: "alice",
          word_count: wc,
        }).select("id,title").single();
        if (error) return { error: error.message };
        return { ok: true, id: data.id, title: data.title, navigate_to: "/app/catalyst" };
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
          source_type: "alice",
          source_id: crypto.randomUUID(),
        }).select("id,title,event_date").single();
        if (error) return { error: error.message };
        return { ok: true, id: data.id, title: data.title, when: data.event_date };
      }
      case "find_book": {
        const q = String(args.query || "").trim();
        if (!q) return { error: "Empty query" };
        const lim = Math.min(Math.max(Number(args.limit) || 8, 1), 20);
        const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=${lim}&fields=key,title,author_name,first_publish_year,cover_i,ebook_access`;
        const r = await fetch(url);
        if (!r.ok) return { error: `Open Library ${r.status}` };
        const j = await r.json();
        const books = (j.docs || []).map((d: any) => ({
          key: d.key, title: d.title,
          author: d.author_name?.[0] || "Unknown",
          year: d.first_publish_year,
          cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : null,
          ebook_access: d.ebook_access || "no_ebook",
        }));
        return { results: books, count: books.length, navigate_to: "/app/learning" };
      }
      case "web_search": {
        const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/web-search`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: authHeader },
          body: JSON.stringify({ query: String(args.query || "") }),
        });
        const j = await r.json().catch(() => ({}));
        return j?.results
          ? { results: (j.results || []).slice(0, 8) }
          : (j?.summary ? { summary: j.summary } : { results: [] });
      }
      case "admin_summary": {
        if (!isAdmin) return { error: "Not authorized — admin only." };
        const [users, errors, features] = await Promise.all([
          serviceClient.from("profiles").select("user_id", { count: "exact", head: true }),
          serviceClient.from("error_reports").select("id", { count: "exact", head: true }).gte("last_seen_at", new Date(Date.now() - 7 * 86400_000).toISOString()),
          serviceClient.from("feature_requests").select("id,title,votes,status").order("votes", { ascending: false }).limit(5),
        ]);
        return {
          users_total: users.count ?? null,
          errors_last_7d: errors.count ?? null,
          top_feature_requests: features.data || [],
          note: "Read-only summary. ALICE cannot take admin actions; advise the admin.",
        };
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
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roleData } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    const isAdmin = roleData === true;

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

    if (!threadId) {
      const title = userMessage.slice(0, 60);
      const { data: t, error } = await supabase.from("jarvis_threads").insert({ user_id: user.id, title }).select("id").single();
      if (error) throw error;
      threadId = t.id;
    } else {
      await supabase.from("jarvis_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId).eq("user_id", user.id);
    }

    const { data: history } = await supabase
      .from("jarvis_messages")
      .select("role,parts")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .limit(40);

    const nowIso = new Date().toISOString();
    const dateBlock = `\n\nCURRENT SERVER TIME (authoritative reference): ${nowIso} UTC. For anything time-sensitive in the user's locale, still call get_current_datetime with their time zone.`;
    const adminBlock = isAdmin
      ? "\n\nNOTE: Current user IS an admin. admin_summary is available."
      : "\n\nNOTE: Current user is NOT an admin. Refuse admin queries.";
    const messages: any[] = [{
      role: "system",
      content: SYSTEM_PROMPT_BASE + dateBlock + adminBlock,
    }];
    for (const m of history || []) {
      const text = (m.parts as any[]).filter((p) => p.type === "text").map((p) => p.text).join("\n");
      if (text) messages.push({ role: m.role, content: text });
    }
    messages.push({ role: "user", content: userMessage });

    await supabase.from("jarvis_messages").insert({
      thread_id: threadId, user_id: user.id, role: "user",
      parts: [{ type: "text", text: userMessage }],
    });

    const assistantParts: any[] = [];
    let finalText = "";
    let navigateTo: string | null = null;

    for (let step = 0; step < 12; step++) {
      const res = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": lovableKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
        body: JSON.stringify({ model: MODEL, messages, tools, tool_choice: "auto" }),
      });
      if (!res.ok) {
        const t = await res.text();
        return new Response(JSON.stringify({ error: `AI gateway ${res.status}: ${t}` }), {
          status: res.status === 429 || res.status === 402 ? res.status : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await res.json();
      const choice = data.choices?.[0]?.message;
      if (!choice) break;

      if (choice.tool_calls?.length) {
        messages.push({ role: "assistant", content: choice.content || "", tool_calls: choice.tool_calls });
        for (const tc of choice.tool_calls) {
          let parsed: any = {};
          try { parsed = JSON.parse(tc.function.arguments || "{}"); } catch {}
          const result = await executeTool(tc.function.name, parsed, supabase, serviceClient, user.id, isAdmin, authHeader);
          if (result && (result as any).navigate_to && !navigateTo) navigateTo = (result as any).navigate_to;
          assistantParts.push({ type: "tool", name: tc.function.name, args: parsed, result });
          messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
        }
        continue;
      }

      finalText = choice.content || "";
      break;
    }

    if (finalText) assistantParts.push({ type: "text", text: finalText });

    await supabase.from("jarvis_messages").insert({
      thread_id: threadId, user_id: user.id, role: "assistant", parts: assistantParts,
    });

    return new Response(JSON.stringify({ threadId, parts: assistantParts, navigate_to: navigateTo }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("alice-chat error", e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
