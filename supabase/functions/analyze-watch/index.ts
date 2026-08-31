import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAuthedUserId, unauthorized } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Segment = { start: number; dur: number; text: string };

function fmt(s: number) {
  const t = Math.floor(s);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = t % 60;
  const mm = m.toString().padStart(h > 0 ? 2 : 1, "0");
  const ss = sec.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Compress transcript segments to a compact timestamped form and cap length. */
function buildTranscriptBlock(segments: Segment[], maxChars: number): string {
  if (!segments?.length) return "";
  // Group consecutive short segments into ~15s windows to reduce noise
  const windows: { start: number; text: string }[] = [];
  let bucketStart = segments[0].start;
  let bucketText: string[] = [];
  for (const s of segments) {
    if (s.start - bucketStart > 15 && bucketText.length) {
      windows.push({ start: bucketStart, text: bucketText.join(" ") });
      bucketStart = s.start;
      bucketText = [];
    }
    bucketText.push(s.text.replace(/\s+/g, " ").trim());
  }
  if (bucketText.length) windows.push({ start: bucketStart, text: bucketText.join(" ") });

  const lines = windows.map(w => `[${fmt(w.start)}] ${w.text}`);
  let out = lines.join("\n");
  if (out.length <= maxChars) return out;

  // Sample: keep beginning (40%), middle (30%), end (30%) with markers
  const headLen = Math.floor(maxChars * 0.4);
  const midLen = Math.floor(maxChars * 0.3);
  const tailLen = maxChars - headLen - midLen - 80;

  const head = out.slice(0, headLen);
  const midStart = Math.floor(out.length / 2 - midLen / 2);
  const mid = out.slice(midStart, midStart + midLen);
  const tail = out.slice(out.length - tailLen);
  return `${head}\n\n[…middle…]\n${mid}\n\n[…later…]\n${tail}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const userId = await getAuthedUserId(req);
  if (!userId) return unauthorized(corsHeaders);

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const {
    source,
    question,
    history = [],
    mode = "chat",
    currentTime = 0,
  } = body ?? {};

  if (!source || typeof source !== "object") {
    return new Response(JSON.stringify({ error: "source required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Build the source excerpt — this can be very large, unlike ai-assistant-chat
  let excerpt = "";
  let hasTimedTranscript = false;
  let hasAnyTranscript = false;
  if (source.kind === "youtube") {
    const segs: Segment[] = Array.isArray(source.segments) ? source.segments : [];
    const untimed = typeof source.transcriptText === "string" ? source.transcriptText.slice(0, 60000) : "";
    hasTimedTranscript = segs.length > 0;
    hasAnyTranscript = hasTimedTranscript || untimed.length > 200;
    const transcript = buildTranscriptBlock(segs, 60000); // ~60k chars of transcript
    const near = segs.length
      ? segs
          .filter(s => s.start + s.dur >= Math.max(0, currentTime - 90) && s.start <= currentTime + 90)
          .map(s => `[${fmt(s.start)}] ${s.text}`)
          .join("\n")
          .slice(0, 4000)
      : "";
    // Chapters listed in the description are reliable structure, even with no captions
    const chapterLines = String(source.description ?? "")
      .split("\n")
      .map((l: string) => l.trim())
      .filter((l: string) => /^\(?\d{1,2}:\d{2}(:\d{2})?\)?\s*[-–—:]?\s+\S/.test(l))
      .slice(0, 40);
    excerpt = [
      `TITLE: ${source.title ?? ""}`,
      source.channel ? `CHANNEL: ${source.channel}` : "",
      source.description ? `DESCRIPTION:\n${String(source.description).slice(0, 8000)}` : "",
      chapterLines.length ? `CHAPTERS DECLARED BY THE CREATOR:\n${chapterLines.join("\n")}` : "",
      hasAnyTranscript ? "" : "NOTE: No captions were available. Rely on title, channel, description and declared chapters; state clearly when inferring.",
      near ? `NEAR CURRENT PLAYBACK (${fmt(currentTime)}):\n${near}` : "",
      transcript ? `TIMESTAMPED TRANSCRIPT:\n${transcript}` : "",
      !hasTimedTranscript && untimed
        ? `FULL TRANSCRIPT (no timestamps available — do NOT invent timestamps; cite chapter titles or short quotes instead):\n${untimed}`
        : "",
    ].filter(Boolean).join("\n\n");
  } else if (source.kind === "article") {
    hasAnyTranscript = true;
    excerpt = [
      `TITLE: ${source.title ?? ""}`,
      `URL: ${source.url ?? ""}`,
      source.description ? `DESCRIPTION: ${source.description}` : "",
      `CONTENT:\n${String(source.content ?? "").slice(0, 60000)}`,
    ].filter(Boolean).join("\n\n");
  } else {

    return new Response(JSON.stringify({ error: "Unsupported source.kind" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const isYT = source.kind === "youtube";
  const timestampRule = isYT
    ? `- Cite specific moments with timestamps in [M:SS] or [H:MM:SS] format taken verbatim from the transcript above. Every non-trivial claim should carry at least one timestamp.
- If the transcript is sampled ([…middle…] / […later…] markers), be transparent about which section a claim comes from.`
    : `- Quote short phrases from the article to ground claims; do not fabricate quotes.`;

  const modePrompt = (() => {
    switch (mode) {
      case "summary":
        return `Produce a structured summary of this ${isYT ? "video" : "article"}:
1. **TL;DR** — 2-3 sentences.
2. **Key takeaways** — 5-8 bullets, each with a supporting timestamp/quote.
3. **Who this is for** — one line.
4. **What's missing / weakest claim** — one line, honest.`;
      case "chapters":
        return `Reconstruct the chapter/outline structure of this ${isYT ? "video" : "article"}. Output a markdown list where each item is:
\`[MM:SS] **Chapter title** — one-sentence description.\`
Aim for 5-12 chapters that reflect real topic shifts in the transcript (not fixed time intervals). If the source already lists chapters in the description, use those and enrich each with a description drawn from the transcript.`;
      case "deep":
        return `Do a rigorous deep-dive analysis:
- **Thesis** — what the creator is actually arguing.
- **Evidence used** — list concrete examples/data with timestamps.
- **Assumptions & gaps** — what they take for granted, what they skip.
- **Counter-perspectives** — plausible objections a critical viewer would raise.
- **How to verify** — 2-3 checks the viewer could run themselves.`;
      case "study":
        return `Produce study notes suitable for a Zettelkasten card set:
- **Concept map** — 4-8 core concepts with 1-line definitions.
- **Cornell-style notes** — Cue | Note pairs.
- **5 spaced-repetition Q&A pairs** grounded in specific timestamps.
- **3 follow-up research questions** to explore beyond this source.`;
      case "quotes":
        return `Extract the 5-10 most quotable, standalone claims from this ${isYT ? "video" : "article"}. For each: the quote in > blockquote form, the timestamp/section, and a one-line note on why it matters.`;
      case "factcheck":
        return `Identify 3-6 factual claims worth checking. For each: state the claim, the timestamp/section where it appears, whether it is verifiable, and how a viewer could verify it. Do not invent verdicts — flag uncertainty explicitly.`;
      case "actions":
        return `Extract actionable takeaways only:
- **Do now** — concrete steps.
- **Try this week** — experiments.
- **Read/watch next** — resources referenced in the source.
Ground each item with a timestamp or quote.`;
      default:
        return question
          ? `Answer the user's question using only the source excerpt. If the answer isn't there, say so plainly.`
          : `Answer the user helpfully using only the source excerpt.`;
    }
  })();

  const system = `You are ALICE, analyzing a ${isYT ? "YouTube video" : "web article"} the user is viewing.

Ground rules:
- Use ONLY the source excerpt provided below. Do not invent facts, timestamps, or quotes.
- If the excerpt doesn't contain the answer, say so in one sentence rather than guessing.
${timestampRule}
- Format with markdown (headings, lists, blockquotes) for readability.

TASK:
${modePrompt}

SOURCE EXCERPT:
${excerpt}`;

  const userTurn = mode === "chat" ? (question || "Please respond.") : (question || "Go.");

  const messages = [
    { role: "system", content: system },
    ...(Array.isArray(history) ? history : []).slice(-10).map((m: any) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content ?? "").slice(0, 6000),
    })),
    { role: "user", content: String(userTurn).slice(0, 6000) },
  ];

  const model = mode === "chat" ? "google/gemini-3.6-flash" : "google/gemini-3.1-pro-preview";

  try {
    const gw = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages }),
    });

    if (!gw.ok) {
      const errText = await gw.text().catch(() => "");
      console.error("gateway error", gw.status, errText.slice(0, 400));
      if (gw.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please retry shortly." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (gw.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace billing." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI gateway error (${gw.status})` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await gw.json();
    const answer = data?.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ response: answer, model }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("analyze-watch failed", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
