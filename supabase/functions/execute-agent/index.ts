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

  console.log('Author Agent: Generating full document...');
  let documentBody = '';

  try {
    documentBody = await callAI(apiKey, [
      { role: 'system', content: `You are a world-class author and researcher. Write an extensive, publication-quality document. Aim for at least 4,000 words. Use standard Markdown only. Paragraphs 3-4 sentences max. Heading hierarchy: # H1, ## H2, ### H3. Bold sparingly. No ALL CAPS, no underlining.` },
      { role: 'user', content: `Write a comprehensive document on: "${topicData.topic}"\nAngle: "${topicData.angle}"\n\nInclude 8+ major sections, 400-600 words each. End with References section.\n${userFocus ? `FOCUS: ${userFocus}\n` : ''}User's existing knowledge:\n${filteredSummary.substring(0, 6000)}\n\nGo beyond existing knowledge. Target 5,000+ words.` }
    ], 0.75, 16384);
  } catch (e) {
    console.error('Author Agent: Generation failed:', e);
    documentBody = `## ${topicData.topic}\n\n*Generation error. Please try again.*\n`;
  }

  const wordCount1 = documentBody.split(/\s+/).length;
  if (wordCount1 < 5000 && wordCount1 > 100) {
    try {
      const extension = await callAI(apiKey, [
        { role: 'system', content: 'Continue this document. Add entirely new sections. Standard Markdown only.' },
        { role: 'user', content: `Continue about "${topicData.topic}". Currently ~${wordCount1} words.\n\nEnding:\n${documentBody.slice(-2000)}\n\nWrite 3,000+ more words of new sections.` }
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
async function runCitationAgent(apiKey: string, documentContent: string, documentTitle: string, agentId: string, runId: string, userId: string) {
  const plainText = documentContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const prompt = `You are an expert academic citation analyst. Analyze the following document and identify key claims, facts, statistics, or assertions that should be cited with a source.\n\nDocument Title: "${documentTitle}"\n\nDocument Content:\n${plainText.substring(0, 12000)}\n\nFor each claim that needs a citation, provide:\n1. The exact text passage that needs a citation (a short phrase or sentence from the document)\n2. A plausible academic or authoritative source (author, title, year, publisher/journal, URL if applicable)\n3. The formatted APA citation\n\nReturn ONLY a valid JSON array:\n[{\n  "passage": "the exact text from the document that needs citation",\n  "source_title": "Title of the Source",\n  "source_author": "Author Name(s)",\n  "source_year": 2023,\n  "source_url": "https://example.com or null",\n  "apa_citation": "Full APA formatted citation string"\n}]\n\nFind 5-15 passages that need citations. Focus on factual claims, statistics, and assertions.`;

  const raw = await callAI(apiKey, [
    { role: 'system', content: 'You are a citation expert. Return only valid JSON arrays.' },
    { role: 'user', content: prompt }
  ], 0.3, 4096);

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return { citations: [], findings: [] };

  const citations = JSON.parse(jsonMatch[0]);
  const findings = citations.map((c: any, i: number) => ({
    agent_id: agentId, run_id: runId, user_id: userId,
    finding_type: 'citation',
    title: `[${i + 1}] ${c.source_title}`,
    content: c.apa_citation,
    metadata: {
      citation_number: i + 1,
      passage: c.passage,
      source_title: c.source_title,
      source_author: c.source_author,
      source_year: c.source_year,
      source_url: c.source_url,
      apa_citation: c.apa_citation,
    },
    relevance_score: 0.9
  }));

  return { citations, findings };
}

// ── Research Agent: finds relevant info with links and quotes ──
async function runResearchAgent(apiKey: string, documentContent: string, documentTitle: string, agentId: string, runId: string, userId: string) {
  const plainText = documentContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const prompt = `You are an expert research assistant. Analyze the following document and find relevant external resources that would enhance the content.\n\nDocument Title: "${documentTitle}"\n\nDocument Content:\n${plainText.substring(0, 10000)}\n\nFor each research finding, provide:\n1. A relevant topic or concept from the document\n2. A real, authoritative source URL (academic paper, reputable publication, official documentation)\n3. The most relevant quote or key insight from that source\n4. Why this resource is relevant to the document\n\nReturn ONLY a valid JSON array:\n[{\n  "topic": "The specific topic from the document",\n  "source_title": "Title of the external resource",\n  "source_url": "https://real-url.com",\n  "relevant_quote": "The most relevant quote or key excerpt from the source (2-4 sentences)",\n  "relevance_explanation": "Why this is useful for the author"\n}]\n\nFind 5-10 highly relevant research findings. Focus on authoritative, citable sources.`;

  const raw = await callAI(apiKey, [
    { role: 'system', content: 'You are a research assistant. Return only valid JSON arrays.' },
    { role: 'user', content: prompt }
  ], 0.4, 4096);

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const results = JSON.parse(jsonMatch[0]);
  return results.map((r: any) => ({
    agent_id: agentId, run_id: runId, user_id: userId,
    finding_type: 'research_finding',
    title: `🔍 ${r.source_title}`,
    content: r.relevant_quote,
    metadata: {
      topic: r.topic,
      source_title: r.source_title,
      source_url: r.source_url,
      relevant_quote: r.relevant_quote,
      relevance_explanation: r.relevance_explanation,
    },
    relevance_score: 0.85
  }));
}

// ── Writing Coach Agent ──
async function runWritingCoachAgent(apiKey: string, documentContent: string, documentTitle: string, agentId: string, runId: string, userId: string) {
  const plainText = documentContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const raw = await callAI(apiKey, [
    { role: 'system', content: 'You are a professional writing coach. Return only valid JSON arrays.' },
    { role: 'user', content: `Analyze this document for writing quality. Provide feedback on grammar, style, tone, readability, and structure.\n\nDocument: "${documentTitle}"\nContent: ${plainText.substring(0, 10000)}\n\nReturn a JSON array of feedback items:\n[{"category": "grammar|style|tone|structure|readability", "severity": "high|medium|low", "passage": "the problematic text", "issue": "what's wrong", "suggestion": "how to fix it"}]\n\nFind 5-12 actionable feedback items.`}
  ], 0.3, 4096);

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  const items = JSON.parse(jsonMatch[0]);

  return items.map((item: any, i: number) => ({
    agent_id: agentId, run_id: runId, user_id: userId,
    finding_type: 'writing_feedback',
    title: `✍️ ${item.category}: ${item.issue.substring(0, 60)}`,
    content: item.suggestion,
    metadata: { category: item.category, severity: item.severity, passage: item.passage, issue: item.issue, suggestion: item.suggestion },
    relevance_score: item.severity === 'high' ? 0.95 : item.severity === 'medium' ? 0.75 : 0.5
  }));
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

// ── Task Extraction Agent (document-aware) ──
async function runTaskExtractionAgent(apiKey: string, documentContent: string, documentTitle: string, agentId: string, runId: string, userId: string) {
  const plainText = documentContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const raw = await callAI(apiKey, [
    { role: 'system', content: 'You are a task extraction expert. Return only valid JSON arrays.' },
    { role: 'user', content: `Extract all action items, to-dos, and tasks from this document.\n\nDocument: "${documentTitle}"\nContent: ${plainText.substring(0, 10000)}\n\nReturn JSON array:\n[{"task": "specific action item", "priority": "high|medium|low", "context": "which section it came from", "deadline_hint": "any mentioned deadline or null"}]\n\nFind all implicit and explicit tasks.`}
  ], 0.3, 2048);

  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  const tasks = JSON.parse(jsonMatch[0]);

  return tasks.map((t: any) => ({
    agent_id: agentId, run_id: runId, user_id: userId,
    finding_type: 'extracted_task',
    title: `✅ ${t.task.substring(0, 80)}`,
    content: `Priority: ${t.priority}${t.deadline_hint ? ` | Deadline: ${t.deadline_hint}` : ''} | From: ${t.context}`,
    metadata: t,
    relevance_score: t.priority === 'high' ? 0.95 : t.priority === 'medium' ? 0.75 : 0.5
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
          const result = await runCitationAgent(apiKey, documentContent, documentTitle, agentId, runId, user.id);
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
        const { data: cards } = await supabaseClient.from('zettel_cards').select('id, title, content, tags, linked_cards').eq('user_id', user.id).is('deleted_at', null).order('updated_at', { ascending: false }).limit(20);
        if (cards && cards.length > 1) {
          itemsProcessed = cards.length;
          for (let i = 0; i < cards.length; i++) {
            for (let j = i + 1; j < cards.length; j++) {
              const card1 = cards[i], card2 = cards[j];
              if (card1.linked_cards?.includes(card2.id) || card2.linked_cards?.includes(card1.id)) continue;
              const sharedTags = (card1.tags || []).filter((t: string) => (card2.tags || []).includes(t));
              if (sharedTags.length > 0) {
                itemsFound++;
                findings.push({ agent_id: agentId, run_id: runId, user_id: user.id, finding_type: 'link_suggestion', title: `Link "${card1.title}" ↔ "${card2.title}"`, content: `Shared tags: ${sharedTags.join(', ')}`, metadata: { card1_id: card1.id, card2_id: card2.id, shared_tags: sharedTags }, relevance_score: Math.min(sharedTags.length * 0.3, 1) });
              }
            }
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
