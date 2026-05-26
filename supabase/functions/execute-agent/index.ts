import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function callAI(apiKey: string, messages: any[], temperature = 0.7, maxTokens = 8192) {
  const makeRequest = async (attempt: number): Promise<string> => {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Lovable-API-Key': apiKey,
        'X-Lovable-AIG-SDK': 'vercel-ai-sdk',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429 && attempt < 3) {
        console.log(`AI rate limited, retrying in ${attempt * 3}s (attempt ${attempt}/3)...`);
        await new Promise(r => setTimeout(r, attempt * 3000));
        return makeRequest(attempt + 1);
      }
      if (status === 429) throw new Error('AI rate limit exceeded after retries. Please try again later.');
      if (status === 402) throw new Error('AI credits exhausted. Please add credits to your workspace.');
      const body = await response.text();
      throw new Error(`AI gateway error ${status}: ${body.substring(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    if (!content) console.warn('AI returned empty content');
    return content;
  };

  return makeRequest(1);
}

async function gatherAllContent(supabaseClient: any, userId: string) {
  const [cardsRes, notesRes, scratchpadRes, catalystRes] = await Promise.all([
    supabaseClient.from('zettel_cards').select('id, title, content, tags, category')
      .eq('user_id', userId).is('deleted_at', null).order('updated_at', { ascending: false }).limit(50),
    supabaseClient.from('notes').select('id, title, content, tags')
      .eq('user_id', userId).is('deleted_at', null).order('updated_at', { ascending: false }).limit(30),
    supabaseClient.from('scratchpad_notes').select('id, content')
      .eq('user_id', userId).order('updated_at', { ascending: false }).limit(10),
    supabaseClient.from('catalyst_documents').select('id, title, content')
      .eq('user_id', userId).order('updated_at', { ascending: false }).limit(10),
  ]);

  return {
    cards: cardsRes.data || [],
    notes: notesRes.data || [],
    scratchpad: scratchpadRes.data || [],
    catalystDocs: catalystRes.data || [],
  };
}

function buildContentSummary(content: any) {
  const parts: string[] = [];
  if (content.cards.length > 0) {
    parts.push('## Zettelcards\n' + content.cards.map((c: any, i: number) =>
      `**${i + 1}. ${c.title}** ${c.tags?.length ? `[${c.tags.join(', ')}]` : ''}\n${c.content.substring(0, 500)}`
    ).join('\n\n'));
  }
  if (content.notes.length > 0) {
    parts.push('## Notes\n' + content.notes.map((n: any, i: number) =>
      `**${i + 1}. ${n.title}** ${n.tags?.length ? `[${n.tags.join(', ')}]` : ''}\n${n.content.substring(0, 400)}`
    ).join('\n\n'));
  }
  if (content.scratchpad.length > 0) {
    parts.push('## Scratchpad\n' + content.scratchpad.map((s: any) =>
      s.content.substring(0, 300)
    ).join('\n\n'));
  }
  if (content.catalystDocs.length > 0) {
    parts.push('## Existing Catalyst Documents\n' + content.catalystDocs.map((d: any) =>
      `**${d.title}**\n${d.content.substring(0, 300)}`
    ).join('\n\n'));
  }
  return parts.join('\n\n---\n\n');
}

function markdownToHtml(md: string): string {
  let html = md;
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/^---$/gm, '<hr>');
  html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>');
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/((?:^[\-\*] .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(line =>
      `<li>${line.replace(/^[\-\*] /, '')}</li>`
    ).join('');
    return `<ul>${items}</ul>`;
  });
  html = html.replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(line =>
      `<li>${line.replace(/^\d+\. /, '')}</li>`
    ).join('');
    return `<ol>${items}</ol>`;
  });
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  const lines = html.split('\n');
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^<(h[1-6]|ul|ol|li|blockquote|hr|p|div|pre|table)/.test(trimmed)) {
      result.push(trimmed);
    } else {
      result.push(`<p>${trimmed}</p>`);
    }
  }
  return result.join('');
}

async function runAuthorAgent(supabaseClient: any, user: any, agent: any, runId: string, apiKey: string) {
  const findings: any[] = [];
  const agentId = agent.id;

  console.log('Author Agent: Gathering all content sources...');
  const content = await gatherAllContent(supabaseClient, user.id);
  const totalItems = content.cards.length + content.notes.length + content.scratchpad.length + content.catalystDocs.length;

  if (totalItems === 0) {
    findings.push({
      agent_id: agentId, run_id: runId, user_id: user.id,
      finding_type: 'no_content', title: 'No Content Found',
      content: 'Create some Zettelcards, Notes, or Scratchpad entries first, then run the Author Agent.',
      metadata: {}, relevance_score: 1.0
    });
    return { itemsProcessed: 0, itemsFound: 0, findings };
  }

  const contentSummary = buildContentSummary(content);
  const config = agent.config || {};
  const userTopic = (config as any).synthesizer_title;
  const userFocus = (config as any).custom_instructions;
  const selectedSourceIds: string[] = (config as any).selected_source_ids || [];

  if (selectedSourceIds.length > 0) {
    content.cards = content.cards.filter((c: any) => selectedSourceIds.includes(c.id));
    content.notes = content.notes.filter((n: any) => selectedSourceIds.includes(n.id));
    content.scratchpad = content.scratchpad.filter((s: any) => selectedSourceIds.includes(s.id));
    content.catalystDocs = content.catalystDocs.filter((d: any) => selectedSourceIds.includes(d.id));
  }

  const filteredSummary = selectedSourceIds.length > 0 ? buildContentSummary(content) : contentSummary;

  let topicData: any = { topic: userTopic || 'Exploration of Key Themes', angle: userFocus || 'A synthesis of the user\'s knowledge' };

  if (!userTopic) {
    console.log('Author Agent: Selecting topic...');
    try {
      const topicRaw = await callAI(apiKey, [
        { role: 'system', content: 'You are a topic selection AI. Return only valid JSON.' },
        { role: 'user', content: `You are an expert research analyst. Below is a user's knowledge base.\n\nYour job: Identify the SINGLE most fascinating topic to explore in depth.\n\nReturn ONLY a JSON object: {"topic": "...", "angle": "..."}\n\n${filteredSummary}` }
      ], 0.8, 1024);
      const jsonMatch = topicRaw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.topic) topicData = parsed;
      }
    } catch (e) {
      console.error('Author Agent: Topic selection failed, using fallback:', e);
    }
  }

  console.log(`Author Agent: Selected topic "${topicData.topic}"`);

  // ── Narrative-flow upgrade: outline → section drafting → cohesion stitch ──
  console.log('Author Agent: Building narrative outline...');
  let outline: any = null;
  try {
    const outlineRaw = await callAI(apiKey, [
      { role: 'system', content: 'You are a senior nonfiction editor. Design a publication-ready outline. Return ONLY valid JSON.' },
      { role: 'user', content: `Design an outline for a long-form document on "${topicData.topic}" (angle: ${topicData.angle}).\n\nUser's existing knowledge (use as evidence):\n${filteredSummary.substring(0, 5000)}\n\nReturn JSON:\n{\n  "thesis": "1-sentence controlling argument",\n  "throughline": "the narrative arc connecting every section",\n  "sections": [\n    {"heading":"H2 title","purpose":"what this section does for the reader","key_points":["..."],"target_words":550,"transition_in":"how it picks up from the previous section"}\n  ]\n}\n\nProduce 8-10 sections, ~550 words each. Each section's purpose must advance the throughline.` }
    ], 0.5, 3072);
    const m = outlineRaw.match(/\{[\s\S]*\}/);
    if (m) outline = JSON.parse(m[0]);
  } catch (e) {
    console.error('Author Agent: Outline failed, falling back to single-shot:', e);
  }

  let documentBody = '';
  try {
    if (outline && Array.isArray(outline.sections) && outline.sections.length > 0) {
      const sections: string[] = [];
      let prevTail = '';
      for (let i = 0; i < outline.sections.length; i++) {
        const s = outline.sections[i];
        const sectionMd = await callAI(apiKey, [
          { role: 'system', content: `You are writing one section of a long, cohesive nonfiction document. Maintain a single authorial voice across sections. Use standard Markdown only (## for H2, ### for H3). Paragraphs 3-4 sentences. Favor flowing prose over bullet lists. Bold sparingly. Open with a one-sentence transition that connects to the previous section's ending. Do NOT restate the document title.` },
          { role: 'user', content: `THESIS: ${outline.thesis}\nTHROUGHLINE: ${outline.throughline}\n\nSECTION ${i + 1}/${outline.sections.length}\nHEADING: ${s.heading}\nPURPOSE: ${s.purpose}\nKEY POINTS: ${(s.key_points || []).join('; ')}\nTRANSITION IN: ${s.transition_in || 'natural continuation'}\nTARGET LENGTH: ~${s.target_words || 550} words\n\nPREVIOUS SECTION ENDING (for continuity):\n${prevTail || '[opening section — set the stage in 1-2 sentences before diving in]'}\n\nUSER KNOWLEDGE (integrate where relevant):\n${filteredSummary.substring(0, 3500)}\n\nWrite the full section, beginning with "## ${s.heading}".` }
        ], 0.7, 4096);
        sections.push(sectionMd.trim());
        prevTail = sectionMd.trim().slice(-600);
      }
      documentBody = sections.join('\n\n');

      // Cohesion stitch pass
      try {
        const stitched = await callAI(apiKey, [
          { role: 'system', content: 'You are an editor performing a light cohesion pass. Preserve every section\'s ideas, evidence, and length. Only smooth transitions between sections, fix repeated phrasings across boundaries, and ensure one consistent authorial voice. Return the full revised Markdown.' },
          { role: 'user', content: `THESIS: ${outline.thesis}\nTHROUGHLINE: ${outline.throughline}\n\nDOCUMENT:\n${documentBody.substring(0, 28000)}` }
        ], 0.4, 16384);
        if (stitched && stitched.length > documentBody.length * 0.7) documentBody = stitched;
      } catch (e) {
        console.error('Author Agent: Cohesion stitch failed (non-fatal):', e);
      }
    } else {
      documentBody = await callAI(apiKey, [
        { role: 'system', content: `You are a world-class author and researcher. Write an extensive, publication-quality document with a clear narrative arc. Aim for at least 4,000 words. Use standard Markdown only. Paragraphs 3-4 sentences max. Heading hierarchy: # H1, ## H2, ### H3. Favor flowing prose over bullet lists.` },
        { role: 'user', content: `Write a comprehensive document on: "${topicData.topic}"\nAngle: "${topicData.angle}"\n\nInclude 8+ major sections, 400-600 words each. Maintain a consistent throughline.\n${userFocus ? `FOCUS: ${userFocus}\n` : ''}User's existing knowledge:\n${filteredSummary.substring(0, 6000)}` }
      ], 0.75, 16384);
    }
  } catch (e) {
    console.error('Author Agent: Generation failed:', e);
    documentBody = `## ${topicData.topic}\n\n*Generation error. Please try again.*\n`;
  }

  const wordCount1 = documentBody.split(/\s+/).length;
  if (wordCount1 < 5000 && wordCount1 > 100) {
    try {
      const extension = await callAI(apiKey, [
        { role: 'system', content: 'Continue this document. Add entirely new sections that advance the existing throughline. Open with a real transition from the last paragraph. Standard Markdown only.' },
        { role: 'user', content: `Continue "${topicData.topic}" (~${wordCount1} words so far).\n\nEnding:\n${documentBody.slice(-2000)}\n\nWrite 2,500+ more words of new sections without repeating earlier material.` }
      ], 0.75, 16384);
      documentBody += '\n\n' + extension;
    } catch (e) {
      console.error('Author Agent: Extension failed (non-fatal):', e);
    }
  }

  const customTitle = (config as any).synthesizer_title;
  const docTitle = customTitle ? `${customTitle} (Created by PendragonX)` : `${topicData.topic} (Created by PendragonX)`;

  const finalMarkdown = `# ${docTitle}\n\n> *${topicData.angle}*\n\n---\n\n${documentBody}\n\n---\n\n*Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*\n`;
  const finalContent = markdownToHtml(finalMarkdown);
  const finalWordCount = finalMarkdown.split(/\s+/).length;

  const { data: newDoc, error: docError } = await supabaseClient
    .from('catalyst_documents')
    .insert({ user_id: user.id, title: docTitle, content: finalContent, selected_source: 'agent_synthesizer', word_count: finalWordCount })
    .select('id').single();

  if (docError) throw new Error(`Failed to save document: ${docError.message}`);

  findings.push({
    agent_id: agentId, run_id: runId, user_id: user.id,
    finding_type: 'document_created',
    title: `📄 "${docTitle}" is ready!`,
    content: `${finalWordCount.toLocaleString()}-word document created. Open Catalyst to view it.`,
    metadata: { document_id: newDoc.id, topic: topicData.topic, word_count: finalWordCount },
    relevance_score: 1.0
  });

  return { itemsProcessed: totalItems, itemsFound: 1, findings };
}

// ── Citation Agent: analyzes document and returns numbered citations ──
async function runCitationAgent(apiKey: string, documentContent: string, documentTitle: string, agentId: string, runId: string, userId: string, style: string = 'apa') {
  const plainText = documentContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const STYLES = ['apa', 'mla', 'chicago_author_date', 'chicago_notes_bib', 'harvard', 'ieee', 'vancouver', 'ama'];
  const requested = STYLES.includes(style.toLowerCase()) ? style.toLowerCase() : 'apa';

  const prompt = `You are an expert academic citation analyst. Identify claims, statistics, definitions, historical facts, and assertions in the document that require a source. For each, propose a plausible authoritative source AND emit the citation in MULTIPLE styles so the user can pick one.\n\nDocument Title: "${documentTitle}"\n\nDocument:\n${plainText.substring(0, 12000)}\n\nReturn ONLY a valid JSON array:\n[{\n  "passage": "exact text from the document needing citation",\n  "claim_type": "statistic|definition|historical|empirical|attribution|theoretical|legal|other",\n  "source_title": "...",\n  "source_author": "Last, F. M. (& multiple if applicable)",\n  "source_year": 2023,\n  "source_publisher": "publisher or journal",\n  "source_volume_issue_pages": "Vol(Issue), pp-pp or null",\n  "source_doi": "10.xxxx/... or null",\n  "source_url": "https://... or null",\n  "confidence": 0.0,\n  "in_text": {\n    "apa": "(Author, 2023)",\n    "mla": "(Author 14)",\n    "chicago_author_date": "(Author 2023, 14)",\n    "chicago_notes_bib": "1. Author, Title, 14.",\n    "harvard": "(Author, 2023)",\n    "ieee": "[1]",\n    "vancouver": "(1)",\n    "ama": "1"\n  },\n  "bibliography": {\n    "apa": "Author, F. M. (2023). Title. Publisher.",\n    "mla": "Author, First. Title. Publisher, 2023.",\n    "chicago_author_date": "Author, First. 2023. Title. Publisher.",\n    "chicago_notes_bib": "Author, First. Title. Publisher, 2023.",\n    "harvard": "Author, F.M., 2023. Title. Publisher.",\n    "ieee": "[1] F. M. Author, Title. Publisher, 2023.",\n    "vancouver": "1. Author FM. Title. Publisher; 2023.",\n    "ama": "1. Author FM. Title. Publisher; 2023."\n  }\n}]\n\nReturn 5-15 entries. Confidence is your honest estimate (0.0-1.0) that the source you propose actually exists; never fabricate DOIs.`;

  const raw = await callAI(apiKey, [
    { role: 'system', content: 'You are a multi-style citation expert. Return only a valid JSON array. Never invent DOIs — leave them null when unsure.' },
    { role: 'user', content: prompt }
  ], 0.25, 5120);

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return { citations: [], findings: [] };

  let citations: any[] = [];
  try { citations = JSON.parse(jsonMatch[0]); } catch { return { citations: [], findings: [] }; }

  const findings = citations.map((c: any, i: number) => {
    const bib = c.bibliography || {};
    const inText = c.in_text || {};
    const preferred = bib[requested] || bib.apa || c.apa_citation || c.source_title;
    return {
      agent_id: agentId, run_id: runId, user_id: userId,
      finding_type: 'citation',
      title: `[${i + 1}] ${c.source_title || 'Untitled source'}`,
      content: preferred,
      metadata: {
        citation_number: i + 1,
        passage: c.passage,
        claim_type: c.claim_type || 'other',
        confidence: typeof c.confidence === 'number' ? c.confidence : null,
        source_title: c.source_title,
        source_author: c.source_author,
        source_year: c.source_year,
        source_publisher: c.source_publisher || null,
        source_volume_issue_pages: c.source_volume_issue_pages || null,
        source_doi: c.source_doi || null,
        source_url: c.source_url || null,
        preferred_style: requested,
        in_text: inText,
        bibliography: bib,
        // Back-compat for older UI:
        apa_citation: bib.apa || c.apa_citation || null,
      },
      relevance_score: Math.max(0.4, Math.min(0.95, (c.confidence ?? 0.8))),
    };
  });

  return { citations, findings };
}

// ── Research Agent: grounded sources with credibility scoring + cross-check ──
async function runResearchAgent(apiKey: string, documentContent: string, documentTitle: string, agentId: string, runId: string, userId: string) {
  const plainText = documentContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const prompt = `You are an expert research librarian. Find external resources that genuinely back specific claims in the document. For each finding, the relevant_quote MUST be directly relevant to a claim you can name. Reject vaguely-related sources.\n\nDocument: "${documentTitle}"\nContent: ${plainText.substring(0, 10000)}\n\nReturn ONLY a JSON array:\n[{\n  "claim": "the specific claim from the document this source supports",\n  "topic": "topic area",\n  "source_title": "...",\n  "source_url": "https://real-url.com",\n  "source_domain": "e.g. nature.com",\n  "source_type": "peer_reviewed|preprint|book|gov|standards_body|reputable_news|industry_report|wiki|blog|other",\n  "publication_year": 2023,\n  "credibility": 0.0,\n  "credibility_reason": "1-sentence justification (peer-reviewed venue, primary source, authoritative org, etc.)",\n  "relevant_quote": "2-4 sentence excerpt that directly supports the claim",\n  "supports_or_contradicts": "supports|contradicts|nuances",\n  "relevance_explanation": "how it backs the specific claim"\n}]\n\nReturn 5-10 findings. Prefer peer_reviewed/gov/standards_body over blogs. Set credibility honestly (0.0-1.0). Skip a source if you can't connect it to a specific claim.`;

  const raw = await callAI(apiKey, [
    { role: 'system', content: 'You are a research librarian. Return only a valid JSON array. Never invent URLs — omit the entry if uncertain. Prefer high-credibility primary sources.' },
    { role: 'user', content: prompt }
  ], 0.3, 5120);

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  let results: any[] = [];
  try { results = JSON.parse(jsonMatch[0]); } catch { return []; }

  // Filter low-credibility / missing URL items
  const filtered = results.filter((r: any) =>
    typeof r?.source_url === 'string' && /^https?:\/\//i.test(r.source_url) && (r.credibility ?? 0.5) >= 0.4
  );

  return filtered.map((r: any) => {
    const cred = Math.max(0, Math.min(1, Number(r.credibility) || 0.5));
    const stance = r.supports_or_contradicts || 'supports';
    const icon = stance === 'contradicts' ? '⚠️' : stance === 'nuances' ? 'ℹ️' : '🔍';
    return {
      agent_id: agentId, run_id: runId, user_id: userId,
      finding_type: 'research_finding',
      title: `${icon} ${r.source_title}`,
      content: r.relevant_quote,
      metadata: {
        claim: r.claim || null,
        topic: r.topic,
        source_title: r.source_title,
        source_url: r.source_url,
        source_domain: r.source_domain || null,
        source_type: r.source_type || 'other',
        publication_year: r.publication_year || null,
        credibility: cred,
        credibility_reason: r.credibility_reason || null,
        supports_or_contradicts: stance,
        relevant_quote: r.relevant_quote,
        relevance_explanation: r.relevance_explanation,
      },
      relevance_score: Math.max(0.4, Math.min(0.98, cred * 0.7 + 0.25)),
    };
  });
}

// ── Writing Coach: deep stylistic analysis with quantitative metrics ──
async function runWritingCoachAgent(apiKey: string, documentContent: string, documentTitle: string, agentId: string, runId: string, userId: string) {
  const plainText = documentContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  // Lightweight quantitative pre-analysis the model can ground its critique in.
  const sentences = plainText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
  const words = plainText.split(/\s+/).filter(Boolean);
  const syllables = words.reduce((sum, w) => {
    const m = w.toLowerCase().replace(/[^a-z]/g, '').match(/[aeiouy]+/g);
    return sum + Math.max(1, m ? m.length : 1);
  }, 0);
  const wordCount = words.length || 1;
  const sentenceCount = sentences.length || 1;
  const avgSentLen = wordCount / sentenceCount;
  const lengths = sentences.map(s => s.split(/\s+/).filter(Boolean).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / (lengths.length || 1);
  const variance = lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / (lengths.length || 1);
  const stdev = Math.sqrt(variance);
  const flesch = 206.835 - 1.015 * avgSentLen - 84.6 * (syllables / wordCount);
  const fkGrade = 0.39 * avgSentLen + 11.8 * (syllables / wordCount) - 15.59;
  const passiveHits = (plainText.match(/\b(?:is|are|was|were|be|been|being)\s+\w+ed\b/gi) || []).length;
  const passiveRatio = passiveHits / sentenceCount;
  const adverbHits = (plainText.match(/\b\w+ly\b/gi) || []).length;
  const fillerHits = (plainText.match(/\b(very|really|just|actually|basically|literally|simply|that)\b/gi) || []).length;
  const metrics = {
    word_count: wordCount,
    sentence_count: sentenceCount,
    avg_sentence_length: Number(avgSentLen.toFixed(1)),
    sentence_length_stdev: Number(stdev.toFixed(1)),
    flesch_reading_ease: Number(flesch.toFixed(1)),
    flesch_kincaid_grade: Number(fkGrade.toFixed(1)),
    passive_voice_ratio: Number(passiveRatio.toFixed(3)),
    adverbs_per_1000w: Number(((adverbHits / wordCount) * 1000).toFixed(1)),
    filler_words_per_1000w: Number(((fillerHits / wordCount) * 1000).toFixed(1)),
  };

  const raw = await callAI(apiKey, [
    { role: 'system', content: 'You are a senior editor and writing coach. Use the supplied quantitative metrics to ground your critique. Return only a valid JSON array of feedback items.' },
    { role: 'user', content: `Document: "${documentTitle}"\nMetrics: ${JSON.stringify(metrics)}\n\nContent:\n${plainText.substring(0, 10000)}\n\nReturn a JSON array of feedback items, covering:\n- voice_consistency (does authorial voice drift?)\n- tone (matches stated/inferred audience)\n- sentence_rhythm (use stdev; flag monotony if stdev < 5)\n- passive_voice (flag if ratio > 0.15)\n- diction (filler words, weak verbs, overused adverbs)\n- clarity (ambiguous referents, buried subjects)\n- structure (paragraph cohesion, signposting, topic sentences)\n- argumentation (unsupported claims, logical gaps)\n- readability (vs. inferred target audience using flesch grade)\n- grammar (only real errors, not stylistic preferences)\n\nReturn JSON:\n[{"category":"voice_consistency|tone|sentence_rhythm|passive_voice|diction|clarity|structure|argumentation|readability|grammar","severity":"high|medium|low","passage":"exact text from the document","issue":"what's wrong, citing the metric when relevant","suggestion":"concrete rewrite or fix","example_revision":"optional rewritten sentence"}]\n\nReturn 6-14 items. Prioritize high-leverage stylistic issues over nitpicks.` }
  ], 0.3, 5120);

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  const items = jsonMatch ? (() => { try { return JSON.parse(jsonMatch[0]); } catch { return []; } })() : [];

  const findings = items.map((item: any) => ({
    agent_id: agentId, run_id: runId, user_id: userId,
    finding_type: 'writing_feedback',
    title: `✍️ ${item.category}: ${String(item.issue || '').substring(0, 60)}`,
    content: item.suggestion,
    metadata: { ...item, metrics },
    relevance_score: item.severity === 'high' ? 0.95 : item.severity === 'medium' ? 0.75 : 0.5
  }));

  // Always emit a metrics-summary finding so the user sees the quantitative read.
  findings.unshift({
    agent_id: agentId, run_id: runId, user_id: userId,
    finding_type: 'writing_metrics',
    title: `📊 Style metrics for "${documentTitle}"`,
    content: `Flesch ease ${metrics.flesch_reading_ease} (grade ${metrics.flesch_kincaid_grade}) · avg sentence ${metrics.avg_sentence_length}w (σ ${metrics.sentence_length_stdev}) · passive ${(metrics.passive_voice_ratio * 100).toFixed(1)}% · filler ${metrics.filler_words_per_1000w}/1k`,
    metadata: metrics,
    relevance_score: 0.6,
  });

  return findings;
}

// ── Content Summarizer Agent ──
async function runSummarizerAgent(apiKey: string, documentContent: string, documentTitle: string, agentId: string, runId: string, userId: string) {
  const plainText = documentContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const raw = await callAI(apiKey, [
    { role: 'system', content: 'You are a content summarizer. Return only valid JSON.' },
    { role: 'user', content: `Summarize this document comprehensively.\n\nDocument: "${documentTitle}"\nContent: ${plainText.substring(0, 12000)}\n\nReturn JSON:\n{"executive_summary": "2-3 sentence overview", "key_points": ["point1", "point2", ...], "themes": ["theme1", "theme2", ...], "word_count_original": ${plainText.split(/\s+/).length}, "reading_time_minutes": ${Math.ceil(plainText.split(/\s+/).length / 250)}}` }
  ], 0.3, 2048);

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];
  const summary = JSON.parse(jsonMatch[0]);

  return [{
    agent_id: agentId, run_id: runId, user_id: userId,
    finding_type: 'content_summary',
    title: `📋 Summary of "${documentTitle}"`,
    content: summary.executive_summary,
    metadata: summary,
    relevance_score: 1.0
  }];
}

// ── Task Extraction: intent-vs-context classifier ──
async function runTaskExtractionAgent(apiKey: string, documentContent: string, documentTitle: string, agentId: string, runId: string, userId: string) {
  const plainText = documentContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const raw = await callAI(apiKey, [
    { role: 'system', content: 'You are an expert at distinguishing genuine action items from descriptive or hypothetical mentions. Return only a valid JSON array.' },
    { role: 'user', content: `Extract REAL action items from this document. A real action item:\n- Is something a human is expected to DO (imperative or commitment)\n- Has a clear actor or implied owner\n- Is NOT a description of what someone already did, a hypothetical, a quoted instruction in someone else's voice, or a definition/example\n\nFor each candidate, classify the linguistic signal that justifies it.\n\nDocument: "${documentTitle}"\nContent: ${plainText.substring(0, 10000)}\n\nReturn JSON:\n[{\n  "task": "the action, rewritten as a clean imperative",\n  "original_phrase": "the exact phrase from the document",\n  "intent_signal": "imperative|commitment|deadline|assignment|question_to_self|none",\n  "is_actionable": true,\n  "is_actionable_reason": "1-sentence justification",\n  "confidence": 0.0,\n  "owner": "person/team or 'self' or null",\n  "priority": "high|medium|low",\n  "due_date_iso": "YYYY-MM-DD or null",\n  "deadline_hint": "raw deadline phrase or null",\n  "depends_on": "preceding task or null",\n  "context": "section/paragraph it came from"\n}]\n\nExclude items where is_actionable is false or confidence < 0.5. Cap at 20 items. Distinguish carefully: 'we should consider X' = imperative/medium; 'the team built X' = NOT a task; 'remember to file the report by Friday' = commitment/high with deadline.` }
  ], 0.25, 3072);

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  let tasks: any[] = [];
  try { tasks = JSON.parse(jsonMatch[0]); } catch { return []; }

  const filtered = tasks.filter((t: any) => t && t.is_actionable !== false && (t.confidence ?? 0.6) >= 0.5 && t.intent_signal !== 'none');

  return filtered.map((t: any) => ({
    agent_id: agentId, run_id: runId, user_id: userId,
    finding_type: 'extracted_task',
    title: `✅ ${String(t.task || '').substring(0, 80)}`,
    content: `${t.owner ? `Owner: ${t.owner} · ` : ''}Priority: ${t.priority || 'medium'}${t.due_date_iso ? ` · Due: ${t.due_date_iso}` : t.deadline_hint ? ` · ${t.deadline_hint}` : ''} · Signal: ${t.intent_signal}\n${t.is_actionable_reason || ''}`,
    metadata: t,
    relevance_score: (t.priority === 'high' ? 0.95 : t.priority === 'medium' ? 0.75 : 0.55) * Math.max(0.5, Math.min(1, t.confidence ?? 0.7))
  }));
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) throw new Error('Unauthorized');

    const body = await req.json();
    const { agentId, runId } = body;
    if (!agentId || !runId) throw new Error('Missing agentId or runId');

    console.log(`Executing agent ${agentId} for run ${runId}`);

    const { data: agent, error: agentError } = await supabaseClient
      .from('agents').select('*').eq('id', agentId).eq('user_id', user.id).single();

    if (agentError || !agent) throw new Error('Agent not found');

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

    let itemsFound = 0;
    let itemsProcessed = 0;
    const findings: any[] = [];

    const documentContent = body.documentContent || '';
    const documentTitle = body.documentTitle || 'Untitled Document';

    switch (agent.agent_type) {
      case 'citation': {
        if (!documentContent || documentContent.length < 50) {
          findings.push({ agent_id: agentId, run_id: runId, user_id: user.id, finding_type: 'error', title: 'No Document Open', content: 'Open a document in Catalyst to run the Citation Agent.', metadata: {}, relevance_score: 1.0 });
          break;
        }
        itemsProcessed = 1;
        try {
          const citationStyle = String((agent.config as any)?.citation_style || 'apa').toLowerCase();
          const result = await runCitationAgent(apiKey, documentContent, documentTitle, agentId, runId, user.id, citationStyle);
          findings.push(...result.findings);
          itemsFound = result.findings.length;
        } catch (e) {
          console.error('Citation Agent failed:', e);
          findings.push({ agent_id: agentId, run_id: runId, user_id: user.id, finding_type: 'error', title: 'Citation Analysis Failed', content: e instanceof Error ? e.message : 'Unknown error', metadata: {}, relevance_score: 1.0 });
        }
        break;
      }

      case 'research': {
        if (documentContent && documentContent.length > 50) {
          // Document-aware research
          itemsProcessed = 1;
          try {
            const researchFindings = await runResearchAgent(apiKey, documentContent, documentTitle, agentId, runId, user.id);
            findings.push(...researchFindings);
            itemsFound = researchFindings.length;
          } catch (e) {
            console.error('Research Agent failed:', e);
            findings.push({ agent_id: agentId, run_id: runId, user_id: user.id, finding_type: 'error', title: 'Research Failed', content: e instanceof Error ? e.message : 'Unknown error', metadata: {}, relevance_score: 1.0 });
          }
        } else {
          // Fallback: analyze catalyst docs
          const { data: catalystDocs } = await supabaseClient
            .from('catalyst_documents').select('id, title, content')
            .eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5);
          if (catalystDocs && catalystDocs.length > 0) {
            itemsProcessed = catalystDocs.length;
            for (const doc of catalystDocs) {
              const topics = doc.content.split(/[.\n]/).filter((s: string) => s.length > 50).slice(0, 3);
              if (topics.length > 0) {
                itemsFound++;
                findings.push({ agent_id: agentId, run_id: runId, user_id: user.id, finding_type: 'research_topic', title: `Research suggestions for "${doc.title}"`, content: `Consider exploring: ${topics.map((t: string) => t.substring(0, 100)).join('; ')}`, metadata: { document_id: doc.id, topics }, relevance_score: 0.8 });
              }
            }
          }
        }
        break;
      }

      case 'writing_coach': {
        if (!documentContent || documentContent.length < 50) {
          findings.push({ agent_id: agentId, run_id: runId, user_id: user.id, finding_type: 'error', title: 'No Document Open', content: 'Open a document to get writing feedback.', metadata: {}, relevance_score: 1.0 });
          break;
        }
        itemsProcessed = 1;
        try {
          const feedback = await runWritingCoachAgent(apiKey, documentContent, documentTitle, agentId, runId, user.id);
          findings.push(...feedback);
          itemsFound = feedback.length;
        } catch (e) {
          console.error('Writing Coach failed:', e);
          findings.push({ agent_id: agentId, run_id: runId, user_id: user.id, finding_type: 'error', title: 'Writing Coach Failed', content: e instanceof Error ? e.message : 'Unknown error', metadata: {}, relevance_score: 1.0 });
        }
        break;
      }

      case 'content_summarizer': {
        if (!documentContent || documentContent.length < 50) {
          findings.push({ agent_id: agentId, run_id: runId, user_id: user.id, finding_type: 'error', title: 'No Document Open', content: 'Open a document to summarize.', metadata: {}, relevance_score: 1.0 });
          break;
        }
        itemsProcessed = 1;
        try {
          const summaryFindings = await runSummarizerAgent(apiKey, documentContent, documentTitle, agentId, runId, user.id);
          findings.push(...summaryFindings);
          itemsFound = summaryFindings.length;
        } catch (e) {
          console.error('Summarizer failed:', e);
          findings.push({ agent_id: agentId, run_id: runId, user_id: user.id, finding_type: 'error', title: 'Summary Failed', content: e instanceof Error ? e.message : 'Unknown error', metadata: {}, relevance_score: 1.0 });
        }
        break;
      }

      case 'task_extraction': {
        if (documentContent && documentContent.length > 50) {
          itemsProcessed = 1;
          try {
            const taskFindings = await runTaskExtractionAgent(apiKey, documentContent, documentTitle, agentId, runId, user.id);
            findings.push(...taskFindings);
            itemsFound = taskFindings.length;
          } catch (e) {
            console.error('Task Extraction failed:', e);
            findings.push({ agent_id: agentId, run_id: runId, user_id: user.id, finding_type: 'error', title: 'Task Extraction Failed', content: e instanceof Error ? e.message : 'Unknown error', metadata: {}, relevance_score: 1.0 });
          }
        } else {
          // Fallback: check notes for action items
          const { data: notes } = await supabaseClient.from('notes').select('id, title, content').eq('user_id', user.id).is('deleted_at', null).order('updated_at', { ascending: false }).limit(10);
          if (notes && notes.length > 0) {
            itemsProcessed = notes.length;
            const actionPatterns = /\b(TODO|FIXME|ACTION|NEED TO|MUST|SHOULD|REMEMBER TO|DON'T FORGET)\b/gi;
            for (const note of notes) {
              const matches = note.content.match(actionPatterns);
              if (matches && matches.length > 0) {
                itemsFound++;
                findings.push({ agent_id: agentId, run_id: runId, user_id: user.id, finding_type: 'task_found', title: `Action items in "${note.title}"`, content: `Found ${matches.length} potential action items`, metadata: { note_id: note.id, action_count: matches.length }, relevance_score: 0.9 });
              }
            }
          }
        }
        break;
      }

      case 'habit_reminder': {
        findings.push({ agent_id: agentId, run_id: runId, user_id: user.id, finding_type: 'habit_reminder', title: 'Daily Habit Check-in', content: 'Review your habits and update your progress today!', metadata: { reminder_type: 'daily' }, relevance_score: 1.0 });
        itemsFound = 1; itemsProcessed = 1;
        break;
      }

      case 'smart_linking': {
        // Semantic relevance across disparate notes: embeddings first, then AI re-rank.
        const cfg = (agent.config as any) || {};
        const threshold = Number(cfg.similarity_threshold ?? 0.78);
        const maxPerCard = Number(cfg.max_suggestions ?? 5);
        const { data: cards } = await supabaseClient
          .from('zettel_cards')
          .select('id, title, content, tags, linked_cards, content_embedding')
          .eq('user_id', user.id).is('deleted_at', null)
          .order('updated_at', { ascending: false }).limit(40);

        if (cards && cards.length > 1) {
          itemsProcessed = cards.length;
          const seenPair = new Set<string>();
          const pairKey = (a: string, b: string) => a < b ? `${a}|${b}` : `${b}|${a}`;
          const candidates: Array<{ a: any; b: any; similarity: number; sharedTags: string[] }> = [];

          // 1) Embedding-based candidates via existing SECURITY DEFINER RPC.
          for (const card of cards) {
            if (!card.content_embedding) continue;
            const { data: sims } = await supabaseClient.rpc('find_similar_zettel_cards', {
              target_id: card.id,
              similarity_threshold: threshold,
              max_results: maxPerCard,
            });
            for (const s of (sims || [])) {
              const key = pairKey(card.id, s.id);
              if (seenPair.has(key)) continue;
              if (card.linked_cards?.includes(s.id)) continue;
              seenPair.add(key);
              const other = cards.find((c: any) => c.id === s.id) || s;
              const sharedTags = (card.tags || []).filter((t: string) => (other.tags || []).includes(t));
              candidates.push({ a: card, b: other, similarity: s.similarity, sharedTags });
            }
          }

          // 2) Fallback: cards without embeddings — use tag overlap.
          if (candidates.length === 0) {
            for (let i = 0; i < cards.length; i++) {
              for (let j = i + 1; j < cards.length; j++) {
                const a = cards[i], b = cards[j];
                if (a.linked_cards?.includes(b.id) || b.linked_cards?.includes(a.id)) continue;
                const sharedTags = (a.tags || []).filter((t: string) => (b.tags || []).includes(t));
                if (sharedTags.length === 0) continue;
                const key = pairKey(a.id, b.id);
                if (seenPair.has(key)) continue;
                seenPair.add(key);
                candidates.push({ a, b, similarity: Math.min(0.5 + sharedTags.length * 0.1, 0.95), sharedTags });
              }
            }
          }

          // 3) AI re-rank: ask the model to confirm conceptual relevance for top candidates.
          const top = candidates.sort((x, y) => y.similarity - x.similarity).slice(0, 12);
          let reranked: Array<{ a: any; b: any; similarity: number; sharedTags: string[]; reason: string; conceptual_score: number }> = [];
          if (top.length > 0) {
            try {
              const payload = top.map((p, idx) => ({
                idx,
                a_title: p.a.title, a_excerpt: String(p.a.content || '').substring(0, 350),
                b_title: p.b.title, b_excerpt: String(p.b.content || '').substring(0, 350),
                vector_similarity: Number(p.similarity.toFixed(3)),
                shared_tags: p.sharedTags,
              }));
              const judged = await callAI(apiKey, [
                { role: 'system', content: 'You judge whether two notes are CONCEPTUALLY linked (not merely topically near). Return only valid JSON.' },
                { role: 'user', content: `Rate each pair for conceptual link strength on 0.0-1.0 and explain the link in one sentence. Reject pairs that share only superficial vocabulary.\n\nPairs:\n${JSON.stringify(payload)}\n\nReturn JSON: [{"idx":0,"conceptual_score":0.0,"reason":"..."}]` }
              ], 0.2, 2048);
              const m = judged.match(/\[[\s\S]*\]/);
              if (m) {
                const arr = JSON.parse(m[0]);
                for (const r of arr) {
                  const src = top[r.idx];
                  if (!src) continue;
                  if ((r.conceptual_score ?? 0) < 0.55) continue;
                  reranked.push({ ...src, reason: r.reason || 'Conceptually related', conceptual_score: r.conceptual_score });
                }
              }
            } catch (e) {
              console.error('Smart Linking rerank failed (non-fatal):', e);
              reranked = top.map(t => ({ ...t, reason: `Vector similarity ${t.similarity.toFixed(2)}${t.sharedTags.length ? `, shared tags: ${t.sharedTags.join(', ')}` : ''}`, conceptual_score: t.similarity }));
            }
          }

          for (const r of reranked) {
            itemsFound++;
            findings.push({
              agent_id: agentId, run_id: runId, user_id: user.id,
              finding_type: 'link_suggestion',
              title: `Link "${r.a.title}" ↔ "${r.b.title}"`,
              content: r.reason,
              metadata: {
                card1_id: r.a.id, card2_id: r.b.id,
                shared_tags: r.sharedTags,
                vector_similarity: Number(r.similarity.toFixed(3)),
                conceptual_score: Number((r.conceptual_score ?? r.similarity).toFixed(3)),
              },
              relevance_score: Math.min(0.98, (r.conceptual_score ?? r.similarity) * 0.6 + r.similarity * 0.4),
            });
          }
        }
        break;
      }

      case 'knowledge_gap': {
        if (documentContent && documentContent.length > 50) {
          console.log('Knowledge Gap Agent: Analyzing document with AI...');
          itemsProcessed = 1;
          const plainText = documentContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          try {
            const gapAnalysis = await callAI(apiKey, [
              { role: 'system', content: 'You are a knowledge gap analyst. Return only valid JSON arrays.' },
              { role: 'user', content: `Analyze this document for knowledge gaps.\n\nTitle: "${documentTitle}"\nContent: ${plainText.substring(0, 12000)}\n\nReturn JSON array:\n[{"section":"heading","topic":"missing topic","description":"what's missing","severity":"high|medium|low","suggestion":"how to fill the gap"}]\n\nFind 3-8 knowledge gaps.` }
            ], 0.4, 4096);
            const jsonMatch = gapAnalysis.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const gaps = JSON.parse(jsonMatch[0]);
              if (Array.isArray(gaps)) {
                itemsFound = gaps.length;
                for (const gap of gaps) {
                  findings.push({ agent_id: agentId, run_id: runId, user_id: user.id, finding_type: 'knowledge_gap', title: `${gap.severity === 'high' ? '🔴' : gap.severity === 'medium' ? '🟡' : '🟢'} ${gap.topic}`, content: gap.description, metadata: { section: gap.section, severity: gap.severity, suggestion: gap.suggestion, document_title: documentTitle }, relevance_score: gap.severity === 'high' ? 0.95 : gap.severity === 'medium' ? 0.75 : 0.5 });
                }
              }
            }
          } catch (aiError) {
            console.error('Knowledge Gap AI failed:', aiError);
            findings.push({ agent_id: agentId, run_id: runId, user_id: user.id, finding_type: 'error', title: 'Analysis Failed', content: aiError instanceof Error ? aiError.message : 'Unknown error', metadata: {}, relevance_score: 1.0 });
          }
        } else {
          const { data: cards } = await supabaseClient.from('zettel_cards').select('content').eq('user_id', user.id).is('deleted_at', null);
          if (cards && cards.length > 0) {
            itemsProcessed = cards.length;
            const allContent = cards.map((c: any) => c.content).join(' ');
            const references = allContent.match(/\[\[([^\]]+)\]\]/g) || [];
            const uniqueRefs = [...new Set(references)];
            if (uniqueRefs.length > 0) {
              itemsFound = 1;
              findings.push({ agent_id: agentId, run_id: runId, user_id: user.id, finding_type: 'knowledge_gap', title: 'Potential Knowledge Gaps', content: `Referenced but undocumented: ${uniqueRefs.slice(0, 5).join(', ')}`, metadata: { references: uniqueRefs.slice(0, 10) }, relevance_score: 0.7 });
            }
          }
        }
        break;
      }

      case 'card_synthesizer': {
        try {
          const result = await runAuthorAgent(supabaseClient, user, agent, runId, apiKey);
          itemsProcessed = result.itemsProcessed;
          itemsFound = result.itemsFound;
          findings.push(...result.findings);
        } catch (authorError) {
          console.error('Author Agent fatal error:', authorError);
          await supabaseClient.from('agent_runs').update({ status: 'failed', completed_at: new Date().toISOString(), error_message: authorError instanceof Error ? authorError.message : 'Unknown error' }).eq('id', runId);
          await supabaseClient.from('agent_notifications').insert({ user_id: user.id, agent_id: agentId, title: '❌ Author Agent Failed', message: authorError instanceof Error ? authorError.message : 'Unknown error', notification_type: 'warning' });
          return new Response(JSON.stringify({ success: false, error: authorError instanceof Error ? authorError.message : 'Author agent failed' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        break;
      }

      default:
        console.log(`Agent type ${agent.agent_type} not yet implemented`);
    }

    // Save findings
    if (findings.length > 0) {
      const { error: findingsError } = await supabaseClient.from('agent_findings').insert(findings);
      if (findingsError) console.error('Error saving findings:', findingsError);

      const notifications = findings.slice(0, 3).map(f => ({
        user_id: user.id, agent_id: agentId, finding_id: null,
        title: f.title, message: f.content.substring(0, 200),
        notification_type: f.finding_type === 'document_created' ? 'success' : 'info'
      }));
      await supabaseClient.from('agent_notifications').insert(notifications);
    }

    await supabaseClient.from('agent_runs').update({ status: 'completed', completed_at: new Date().toISOString(), items_processed: itemsProcessed, items_found: itemsFound, results: { findings_count: findings.length } }).eq('id', runId);

    const nextRunAt = new Date(Date.now() + agent.run_frequency_minutes * 60 * 1000);
    await supabaseClient.from('agents').update({ last_run_at: new Date().toISOString(), next_run_at: nextRunAt.toISOString() }).eq('id', agentId);

    console.log(`Agent ${agentId} completed. Found ${itemsFound} items.`);

    return new Response(
      JSON.stringify({ success: true, itemsProcessed, itemsFound, findingsCount: findings.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Agent execution error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
