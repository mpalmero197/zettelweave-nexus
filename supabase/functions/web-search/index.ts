import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Live result ranking ──────────────────────────────────────────────────────
interface LiveResult {
  url: string;
  title: string;
  snippet: string;
  publishedAt: string | null; // ISO date if known
  source: "web" | "news";
  position: number;
  score: number;
  trustTier: "high" | "medium" | "low";
  recencyTier: "fresh" | "recent" | "evergreen" | "stale" | "unknown";
  confidence: number; // 0..1
}

const HIGH_TRUST_PATTERNS = [
  /\.gov(\/|$)/, /\.edu(\/|$)/, /\.org(\/|$)/,
  /(^|\.)reuters\.com/, /(^|\.)apnews\.com/, /(^|\.)bbc\.(com|co\.uk)/, /(^|\.)nature\.com/,
  /(^|\.)nytimes\.com/, /(^|\.)wsj\.com/, /(^|\.)bloomberg\.com/, /(^|\.)ft\.com/,
  /(^|\.)theguardian\.com/, /(^|\.)economist\.com/, /(^|\.)wikipedia\.org/,
  /(^|\.)who\.int/, /(^|\.)nih\.gov/, /(^|\.)sec\.gov/, /(^|\.)arxiv\.org/,
  /(^|\.)github\.com/, /(^|\.)stackoverflow\.com/, /(^|\.)mozilla\.org/,
];

const LOW_TRUST_PATTERNS = [
  /blogspot\./, /wordpress\.com/, /medium\.com/, /quora\.com/, /pinterest\./,
  /fandom\.com/, /answers\.com/, /ehow\.com/, /buzzfeed\.com/, /tumblr\.com/,
];

// Known AI-content farms / low-editorial aggregators — downgraded
const CONTENT_FARM_PATTERNS = [
  /(^|\.)aitrends247\./, /(^|\.)outlookindia\.com/, /(^|\.)techtimes\.com/,
  /(^|\.)hackernoon\.com/,
];

function trustTierFor(url: string): "high" | "medium" | "low" {
  let host = "";
  try { host = new URL(url).hostname.toLowerCase(); } catch { return "low"; }
  const full = host + new URL(url).pathname.toLowerCase();
  if (HIGH_TRUST_PATTERNS.some((p) => p.test(host) || p.test(full))) return "high";
  if (LOW_TRUST_PATTERNS.some((p) => p.test(host))) return "low";
  if (CONTENT_FARM_PATTERNS.some((p) => p.test(host))) return "low";
  return "medium";
}

/** Extra authority signals: HTTPS, DOI, canonical path, syndication penalty. */
function authorityBoost(url: string, snippet: string): number {
  let boost = 0;
  try {
    const u = new URL(url);
    if (u.protocol === "https:") boost += 0.05;
    if (/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i.test(url) || /\bdoi\.org\//i.test(url)) boost += 0.15;
    if (/\bdoi:\s*10\.\d{4,9}\//i.test(snippet)) boost += 0.08;
    const segs = u.pathname.split("/").filter(Boolean);
    if (segs.length > 0 && segs.length <= 4 && !u.search) boost += 0.03;
    if (/\/(reprint|syndicat|republish|amp)\b/i.test(u.pathname)) boost -= 0.10;
  } catch { /* noop */ }
  return boost;
}

function parseDate(raw: unknown): string | null {
  if (!raw || typeof raw !== "string") return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  // Reject absurd dates
  if (d.getFullYear() < 1995 || d.getTime() > Date.now() + 86400000) return null;
  return d.toISOString();
}

/** Try to extract a publish date from URL paths like /2026/01/ or snippets like "Jan 12, 2026". */
function inferDate(url: string, snippet: string): string | null {
  const urlMatch = url.match(/\/(20\d{2})\/(\d{1,2})(?:\/(\d{1,2}))?\//);
  if (urlMatch) {
    const d = new Date(`${urlMatch[1]}-${urlMatch[2].padStart(2, "0")}-${(urlMatch[3] || "1").padStart(2, "0")}`);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  const snippetMatch = snippet.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+(20\d{2})\b/i)
    || snippet.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (snippetMatch) {
    const d = new Date(snippetMatch[0]);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

function recencyTierFor(publishedAt: string | null): LiveResult["recencyTier"] {
  if (!publishedAt) return "unknown";
  const ageDays = (Date.now() - new Date(publishedAt).getTime()) / 86400000;
  if (ageDays <= 7) return "fresh";
  if (ageDays <= 90) return "recent";
  if (ageDays <= 730) return "evergreen";
  return "stale";
}

/** Detect whether the query needs fresh info; drives per-query recency weighting. */
function detectRecencyIntent(query: string): "recency_critical" | "evergreen" | "balanced" {
  const q = query.toLowerCase();
  const recencyTriggers = /\b(today|yesterday|this week|this month|current|latest|now|price|prices|stock|score|breaking|news|update|version|release|202[4-9]|20[3-9]\d)\b/;
  const evergreenTriggers = /\b(what is|who was|history of|definition|meaning of|how does|why does|explain|biography)\b/;
  if (recencyTriggers.test(q)) return "recency_critical";
  if (evergreenTriggers.test(q)) return "evergreen";
  return "balanced";
}

function scoreResult(
  r: Omit<LiveResult, "score" | "trustTier" | "recencyTier" | "confidence">,
  query: string,
  intent: "recency_critical" | "evergreen" | "balanced",
): { score: number; trustTier: "high" | "medium" | "low"; recencyTier: LiveResult["recencyTier"]; confidence: number } {
  const trustTier = trustTierFor(r.url);
  const recencyTier = recencyTierFor(r.publishedAt);

  const terms = query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
  const haystack = `${r.title} ${r.snippet}`.toLowerCase();
  const overlap = terms.length ? terms.filter((t) => haystack.includes(t)).length / terms.length : 0.5;
  const positionScore = Math.max(0, 1 - r.position * 0.07);
  const relevance = overlap * 0.6 + positionScore * 0.4;

  const tierValue: Record<LiveResult["recencyTier"], number> = {
    fresh: 1.0, recent: 0.8, evergreen: 0.55, stale: 0.15, unknown: 0.35,
  };
  const recency = tierValue[recencyTier];
  const trust = trustTier === "high" ? 1 : trustTier === "medium" ? 0.6 : 0.25;

  // Intent-driven weighting
  let wRel = 0.45, wRec = 0.30, wTrust = 0.25;
  if (intent === "recency_critical") { wRel = 0.35; wRec = 0.45; wTrust = 0.20; }
  else if (intent === "evergreen") { wRel = 0.50; wRec = 0.15; wTrust = 0.35; }

  const base = relevance * wRel + recency * wRec + trust * wTrust;
  const score = Math.min(1, Math.max(0, base + authorityBoost(r.url, r.snippet)));

  const recencyAlign = intent === "recency_critical"
    ? (recencyTier === "fresh" || recencyTier === "recent" ? 1 : recencyTier === "unknown" ? 0.4 : 0.2)
    : 0.8;
  const confidence = Math.min(1, Math.max(0, trust * 0.5 + recencyAlign * 0.3 + overlap * 0.2));

  return { score, trustTier, recencyTier, confidence };
}

async function fetchLiveResults(
  query: string,
  firecrawlKey: string,
  intent: "recency_critical" | "evergreen" | "balanced",
): Promise<LiveResult[]> {
  const res = await fetch("https://api.firecrawl.dev/v2/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${firecrawlKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, limit: 10, sources: ["web", "news"] }),
  });
  if (!res.ok) {
    console.warn("Firecrawl search failed:", res.status, await res.text().catch(() => ""));
    return [];
  }
  const json = await res.json();
  const data = json?.data ?? json;
  const raw: LiveResult[] = [];

  const push = (items: any[], source: "web" | "news") => {
    if (!Array.isArray(items)) return;
    items.forEach((it: any, i: number) => {
      const url = it?.url || it?.link;
      if (!url || typeof url !== "string") return;
      const snippet = String(it?.description || it?.snippet || it?.markdown || "").slice(0, 400);
      const publishedAt = parseDate(it?.date || it?.publishedDate || it?.metadata?.publishedDate) || inferDate(url, snippet);
      const base = {
        url,
        title: String(it?.title || "").slice(0, 200) || url,
        snippet,
        publishedAt,
        source,
        position: i,
      };
      const { score, trustTier, recencyTier, confidence } = scoreResult(base, query, intent);
      raw.push({ ...base, score, trustTier, recencyTier, confidence });
    });
  };

  push(data?.web, "web");
  push(data?.news, "news");
  if (Array.isArray(data) && raw.length === 0) push(data, "web");

  const seen = new Set<string>();
  return raw
    .filter((r) => {
      const key = r.url.replace(/[?#].*$/, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const isPing = await req.clone().json().then((b: any) => !!b?.ping).catch(() => false);
  if (isPing) {
    return new Response(JSON.stringify({ ok: true, pong: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { query, includeContext = true } = await req.json();

    // Validate input
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Query is required and must be a non-empty string' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (query.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Query must be 500 characters or less' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Read user's preferred search engine. Defaults to 'google'.
    let engine: 'google' | 'duckduckgo' = 'google';
    try {
      const { data: prof } = await supabaseClient
        .from('profiles')
        .select('preferred_search_engine')
        .eq('user_id', user.id)
        .maybeSingle();
      if (prof?.preferred_search_engine === 'duckduckgo') engine = 'duckduckgo';
    } catch (_) { /* ignore — default to google */ }

    // Detect query intent — drives recency weighting during scoring
    const intent = detectRecencyIntent(query);

    // ── 1. Fetch REAL live results (Firecrawl) and rank them ────────────────
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    let liveResults: LiveResult[] = [];
    if (FIRECRAWL_API_KEY) {
      try {
        liveResults = await fetchLiveResults(query, FIRECRAWL_API_KEY, intent);
      } catch (e) {
        console.warn("Live search failed, degrading to model-only:", e);
      }
    }

    // Optional DuckDuckGo instant-answer grounding (user preference)
    let ddgContext = "";
    if (engine === 'duckduckgo') {
      try {
        const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
        const ddgRes = await fetch(ddgUrl, { headers: { 'User-Agent': 'Baku Scribe/1.0' } });
        if (ddgRes.ok) {
          const ddg = await ddgRes.json();
          const parts: string[] = [];
          if (ddg.AbstractText) parts.push(`Summary: ${ddg.AbstractText} (Source: ${ddg.AbstractURL})`);
          if (Array.isArray(ddg.RelatedTopics)) {
            const topics = ddg.RelatedTopics.slice(0, 10).map((t: any) => t?.Text && t?.FirstURL ? `- ${t.Text} (${t.FirstURL})` : null).filter(Boolean);
            if (topics.length) parts.push("Related:\n" + topics.join("\n"));
          }
          ddgContext = parts.join("\n\n");
        }
      } catch (e) {
        console.warn("DuckDuckGo fetch failed", e);
      }
    }

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Overall answer confidence — mean of top-3 result confidences
    const topN = liveResults.slice(0, 3);
    const answerConfidence = topN.length
      ? Number((topN.reduce((s, r) => s + r.confidence, 0) / topN.length).toFixed(3))
      : 0;

    // Build grounding block from ranked live results
    const groundingBlock = liveResults.length
      ? liveResults.map((r, i) => {
          const age = r.publishedAt
            ? `published ${r.publishedAt.slice(0, 10)} (${Math.round((now.getTime() - new Date(r.publishedAt).getTime()) / 86400000)} days ago)`
            : "publish date unknown";
          return `[${i + 1}] ${r.title}\nURL: ${r.url}\nTrust: ${r.trustTier} | recency: ${r.recencyTier} | ${age} | type: ${r.source} | confidence: ${r.confidence.toFixed(2)}\nSnippet: ${r.snippet}`;
        }).join("\n\n")
      : "";

    console.log("Search request", {
      engine,
      queryLength: query.length,
      liveResults: liveResults.length,
      hasContext: includeContext,
      userId: user.id,
      timestamp: now.toISOString(),
    });

    const groundedSystemPrompt = `You are a web search synthesizer. TODAY'S DATE IS ${todayStr}. You are given REAL, LIVE search results fetched moments ago, already ranked by a blend of relevance, recency, and source trustworthiness.

STRICT GROUNDING RULES:
1. Base every factual claim on the provided search results. Cite them inline as [1], [2], etc.
2. PRIORITIZE recent, high-trust sources. When sources conflict, prefer the newer/higher-trust one and note the disagreement.
3. If a result's publish date is old relative to the query (e.g., prices, versions, rankings, current events), explicitly flag it: "(as of <date> — may be outdated)".
4. NEVER invent URLs, statistics, dates, or quotes. If the results don't cover something, say so plainly.
5. If results are thin or stale, state that clearly rather than filling gaps from memory.

Format your answer in markdown with headers and bullet points. Then append ALL of these sections:

## Images
Only list direct image URLs that actually appear in the provided results. If none, write "No image results."

## Videos
Only list video URLs (YouTube/Vimeo/etc.) that appear in the provided results, formatted as - [Title](URL). If none, write "No video results."

## Shopping
Only list product/retailer URLs that appear in the provided results, formatted as - [Product](URL). If none, write "No shopping results for this query."

## Sources
List the URLs of the results you actually used, one per line, best first.

## Related Questions
List 3-5 follow-up questions the user might want to explore.`;

    const ungroundedSystemPrompt = `You are a web search assistant. TODAY'S DATE IS ${todayStr}. Live search is temporarily unavailable, so you must answer from general knowledge. Be explicit that results may be outdated: your training data has a cutoff, so anything time-sensitive (prices, versions, rankings, events) must be labeled "(may be outdated — live search unavailable)". NEVER present remembered information as current, and NEVER invent specific URLs, statistics, or dates.

Format in markdown. Then append these sections:

## Images
Write "No image results."

## Videos
Write "No video results."

## Shopping
Write "No shopping results for this query."

## Sources
Write "Live sources unavailable for this search."

## Related Questions
List 3-5 follow-up questions.`;

    const userContent = liveResults.length
      ? `Query: ${query}\n\n═══ LIVE SEARCH RESULTS (fetched ${now.toISOString()}, ranked best-first) ═══\n${groundingBlock}${ddgContext ? `\n\n═══ DuckDuckGo instant answer ═══\n${ddgContext}` : ""}`
      : (ddgContext ? `${query}\n\n[DuckDuckGo grounding — prefer these sources]\n${ddgContext}` : query);

    // ── 2. Synthesize with Gemini over the ranked live results ──────────────
    const searchResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: liveResults.length ? groundedSystemPrompt : ungroundedSystemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    console.log("Gemini search response status:", searchResponse.status);

    if (!searchResponse.ok) {
      if (searchResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (searchResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits required. Please add credits to your workspace." }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await searchResponse.text();
      console.error("Gemini API error:", searchResponse.status, errorText);
      throw new Error(`Search API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    const fullResult = searchData.choices?.[0]?.message?.content || "No results found.";

    // Parse structured sections from the response
    const extractSection = (header: string) => {
      const regex = new RegExp(`## ${header}\\n([\\s\\S]*?)(?=\\n## |$)`);
      return fullResult.match(regex)?.[1] || '';
    };

    const extractUrls = (section: string): string[] => {
      const urls: string[] = [];
      const lines = section.split('\n').filter((l: string) => l.trim());
      for (const line of lines) {
        const urlMatch = line.match(/https?:\/\/[^\s)>\]]+/);
        if (urlMatch) urls.push(urlMatch[0]);
      }
      return urls;
    };

    const extractLabeledLinks = (section: string): { title: string; url: string }[] => {
      const links: { title: string; url: string }[] = [];
      const lines = section.split('\n').filter((l: string) => l.trim());
      for (const line of lines) {
        const mdLink = line.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
        if (mdLink) {
          links.push({ title: mdLink[1], url: mdLink[2] });
        } else {
          const urlMatch = line.match(/https?:\/\/[^\s)>\]]+/);
          if (urlMatch) links.push({ title: '', url: urlMatch[0] });
        }
      }
      return links;
    };

    // Citations: prefer the model's used-sources list, but only keep URLs that
    // exist in the live result set (when we have one) to guarantee no invented links.
    const liveUrls = new Set(liveResults.map((r) => r.url.replace(/[?#].*$/, "")));
    let citations = extractUrls(extractSection('Sources'));
    if (liveResults.length) {
      citations = citations.filter((u) => liveUrls.has(u.replace(/[?#].*$/, "")));
      if (citations.length === 0) citations = liveResults.slice(0, 5).map((r) => r.url);
    }

    const filterLive = (urls: string[]) =>
      liveResults.length ? urls.filter((u) => liveUrls.has(u.replace(/[?#].*$/, ""))) : urls;

    const imageUrls = filterLive(extractUrls(extractSection('Images')));
    const videoLinksAll = extractLabeledLinks(extractSection('Videos'));
    const videoLinks = liveResults.length ? videoLinksAll.filter((v) => liveUrls.has(v.url.replace(/[?#].*$/, ""))) : videoLinksAll;
    const shoppingAll = extractLabeledLinks(extractSection('Shopping'));
    const shoppingLinks = liveResults.length ? shoppingAll.filter((s) => liveUrls.has(s.url.replace(/[?#].*$/, ""))) : shoppingAll;

    const relatedQuestions: string[] = [];
    const relatedSection = extractSection('Related Questions');
    if (relatedSection) {
      const lines = relatedSection.split('\n').filter((l: string) => l.trim());
      for (const line of lines) {
        const clean = line.replace(/^[\d\.\-\*\s]+/, '').trim();
        if (clean) relatedQuestions.push(clean);
      }
    }

    // Strip structured sections from the main result for cleaner display
    const result = fullResult
      .replace(/## Images[\s\S]*?(?=\n## |$)/, '')
      .replace(/## Videos[\s\S]*?(?=\n## |$)/, '')
      .replace(/## Shopping[\s\S]*?(?=\n## |$)/, '')
      .replace(/## Sources[\s\S]*?(?=\n## |$)/, '')
      .replace(/## Related Questions[\s\S]*$/, '')
      .trim();

    // Categorise citation URLs for news (live news results first)
    const newsLinks = [
      ...liveResults.filter((r) => r.source === "news").map((r) => r.url),
      ...citations.filter((url: string) =>
        url.includes('news') || url.includes('bbc.com') || url.includes('cnn.com') || url.includes('reuters.com')
      ),
    ].filter((u, i, arr) => arr.indexOf(u) === i);

    console.log(`Results - Live: ${liveResults.length}, Images: ${imageUrls.length}, Videos: ${videoLinks.length}, Shopping: ${shoppingLinks.length}, Citations: ${citations.length}, Related: ${relatedQuestions.length}`);

    // Generate contextual insights if requested
    let contextualData = null;
    if (includeContext) {
      console.log('Generating contextual insights...');
      try {
        const contextResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              {
                role: 'system',
                content: `You are a research assistant providing contextual understanding for search queries. Analyze the search query and results to provide:
1. Related concepts and resources to explore
2. Key definitions of important terms
3. Alternative perspectives or counter-arguments
4. Suggested follow-up questions

Be concise, actionable, and insightful.`
              },
              {
                role: 'user',
                content: `Search query: "${query}"\n\nSearch result summary: ${result.substring(0, 1500)}\n\nProvide contextual understanding.`
              }
            ],
            tools: [{
              type: 'function',
              function: {
                name: 'provide_context',
                description: 'Provide contextual understanding for the search',
                parameters: {
                  type: 'object',
                  properties: {
                    relatedResources: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          title: { type: 'string' },
                          description: { type: 'string' },
                          relevance: { type: 'string' }
                        },
                        required: ['title', 'description', 'relevance']
                      }
                    },
                    definitions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          term: { type: 'string' },
                          definition: { type: 'string' }
                        },
                        required: ['term', 'definition']
                      }
                    },
                    counterArguments: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          perspective: { type: 'string' },
                          summary: { type: 'string' }
                        },
                        required: ['perspective', 'summary']
                      }
                    },
                    followUpQuestions: {
                      type: 'array',
                      items: { type: 'string' }
                    }
                  },
                  required: ['relatedResources', 'definitions', 'counterArguments', 'followUpQuestions']
                }
              }
            }],
            tool_choice: { type: 'function', function: { name: 'provide_context' } }
          })
        });

        if (contextResponse.ok) {
          const contextData = await contextResponse.json();
          const toolCall = contextData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            contextualData = JSON.parse(toolCall.function.arguments);
            console.log('Contextual insights generated successfully');
          }
        } else {
          console.error('Context generation failed:', contextResponse.status);
        }
      } catch (contextError) {
        console.error('Error generating contextual insights:', contextError);
      }
    }

    return new Response(
      JSON.stringify({
        result,
        query,
        images: imageUrls,
        videos: videoLinks.map(v => v.url),
        videoDetails: videoLinks,
        shopping: shoppingLinks.map(s => s.url),
        shoppingDetails: shoppingLinks,
        news: newsLinks,
        citations,
        relatedQuestions,
        contextualData,
        liveSources: liveResults.map((r) => ({
          url: r.url,
          title: r.title,
          publishedAt: r.publishedAt,
          trust: r.trustTier,
          score: Number(r.score.toFixed(3)),
        })),
        grounded: liveResults.length > 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Web search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
