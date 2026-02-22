import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function callAI(apiKey: string, messages: any[], temperature = 0.7) {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages,
      temperature,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 429) throw new Error('AI rate limit exceeded. Please try again later.');
    if (status === 402) throw new Error('AI credits exhausted. Please add credits to your workspace.');
    throw new Error(`AI gateway error: ${status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
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

async function runAuthorAgent(supabaseClient: any, user: any, agent: any, runId: string, apiKey: string) {
  const findings: any[] = [];
  const agentId = agent.id;

  // ── Step 1: Gather ALL content ──
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

  // ── Step 2: Topic Selection ──
  console.log('Author Agent: Selecting topic...');
  const topicPrompt = `You are an expert research analyst. Below is a user's knowledge base across Zettelcards, Notes, Scratchpad, and Catalyst documents.

Your job: Identify the SINGLE most fascinating topic to explore in depth. Look for:
- Recurring themes across multiple content sources
- Topics with depth potential that haven't been fully explored
- Interesting intersections between different subjects
- Concepts the user seems passionate about but hasn't synthesized

Return ONLY a JSON object with these fields:
- "topic": The chosen topic (a clear, specific title)
- "angle": A unique angle or thesis to explore (1-2 sentences)
- "why": Why this topic is worth a deep dive (1 sentence)
- "related_content_ids": Array of content IDs that relate to this topic
- "knowledge_gaps": Array of 3-5 subtopics where the user's knowledge seems incomplete
- "research_questions": Array of 5-7 questions worth investigating

Here is the user's content:

${contentSummary}`;

  const topicRaw = await callAI(apiKey, [
    { role: 'system', content: 'You are a topic selection AI. Return only valid JSON.' },
    { role: 'user', content: topicPrompt }
  ], 0.8);

  let topicData: any;
  try {
    const jsonMatch = topicRaw.match(/\{[\s\S]*\}/);
    topicData = jsonMatch ? JSON.parse(jsonMatch[0]) : { topic: 'Exploration of Key Themes', angle: 'A synthesis of the user\'s knowledge', why: 'Multiple themes warrant deeper exploration' };
  } catch {
    topicData = { topic: 'Exploration of Key Themes', angle: 'A synthesis of the user\'s knowledge', why: 'Multiple themes warrant deeper exploration', knowledge_gaps: [], research_questions: [] };
  }

  console.log(`Author Agent: Selected topic "${topicData.topic}"`);

  // ── Step 3: Knowledge Gap Analysis (engaging Knowledge Gap Agent) ──
  console.log('Author Agent: Engaging Knowledge Gap Agent...');
  const gapPrompt = `Topic: "${topicData.topic}"
Angle: "${topicData.angle}"
Known gaps: ${JSON.stringify(topicData.knowledge_gaps || [])}

Based on the user's content below, identify:
1. What the user already knows well about this topic
2. Critical knowledge gaps that need to be filled
3. Misconceptions or incomplete understandings
4. Adjacent topics that would enrich the exploration

Return a JSON object with: "strengths" (array), "gaps" (array), "misconceptions" (array), "adjacent_topics" (array)

User content:
${contentSummary.substring(0, 8000)}`;

  const gapRaw = await callAI(apiKey, [
    { role: 'system', content: 'You are a knowledge gap analyst. Return only valid JSON.' },
    { role: 'user', content: gapPrompt }
  ], 0.5);

  let gapData: any;
  try {
    const jsonMatch = gapRaw.match(/\{[\s\S]*\}/);
    gapData = jsonMatch ? JSON.parse(jsonMatch[0]) : { strengths: [], gaps: [], misconceptions: [], adjacent_topics: [] };
  } catch {
    gapData = { strengths: [], gaps: [], misconceptions: [], adjacent_topics: [] };
  }

  // ── Step 4: Research & Exploration (engaging Research Agent) ──
  console.log('Author Agent: Engaging Research Agent for exploration...');
  const researchPrompt = `You are a world-class researcher. The topic is: "${topicData.topic}"
Angle: "${topicData.angle}"

Knowledge gaps to fill: ${JSON.stringify(gapData.gaps || [])}
Research questions: ${JSON.stringify(topicData.research_questions || [])}
Adjacent topics: ${JSON.stringify(gapData.adjacent_topics || [])}

Provide comprehensive, innovative research findings on this topic. Include:
1. Key discoveries and insights (at least 10 detailed findings)
2. Historical context and evolution of the topic
3. Current state of the art and recent developments
4. Contrarian or lesser-known perspectives
5. Practical applications and real-world examples
6. Future implications and predictions
7. Cross-disciplinary connections
8. Notable experts, works, and references

Be thorough, specific, and include concrete data points, names, dates, and examples.
Write at least 3000 words of research findings.

Return your findings as detailed prose organized by theme.`;

  const researchFindings = await callAI(apiKey, [
    { role: 'system', content: 'You are a thorough researcher who provides detailed, well-sourced findings. Write extensively.' },
    { role: 'user', content: researchPrompt }
  ], 0.7);

  // ── Step 5: Generate Detailed Outline ──
  console.log('Author Agent: Generating outline...');
  const outlinePrompt = `You are planning a comprehensive 10,000+ word document on: "${topicData.topic}"
Angle: "${topicData.angle}"

You have the following inputs:
- User's existing knowledge (from their notes/cards)
- Knowledge gap analysis
- Research findings

Create a detailed outline with exactly 8-12 chapters/sections. Each section should:
- Have a compelling title
- Include 3-5 subsections
- Specify what content to cover (100+ words per section description)
- Note which research findings to incorporate
- Include at least one innovative insight per section

Return ONLY a JSON array where each element has:
- "title": Section title
- "subsections": Array of subsection titles
- "description": What to cover (detailed, 100+ words)
- "target_words": Target word count (1000-2000 per section)

The total target_words across all sections must be at least 10000.`;

  const outlineRaw = await callAI(apiKey, [
    { role: 'system', content: 'You are an expert document architect. Return only valid JSON array.' },
    { role: 'user', content: outlinePrompt }
  ], 0.6);

  let outline: any[];
  try {
    const jsonMatch = outlineRaw.match(/\[[\s\S]*\]/);
    outline = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    outline = [
      { title: 'Introduction', subsections: ['Background', 'Scope', 'Objectives'], description: 'Introduce the topic', target_words: 1200 },
      { title: 'Historical Context', subsections: ['Origins', 'Evolution', 'Key Milestones'], description: 'Historical overview', target_words: 1500 },
      { title: 'Core Concepts', subsections: ['Fundamentals', 'Key Theories', 'Framework'], description: 'Core ideas', target_words: 1500 },
      { title: 'Current Landscape', subsections: ['State of the Art', 'Trends', 'Challenges'], description: 'Present day', target_words: 1500 },
      { title: 'Deep Dive Analysis', subsections: ['Analysis', 'Case Studies', 'Comparisons'], description: 'Detailed analysis', target_words: 1500 },
      { title: 'Innovative Perspectives', subsections: ['New Ideas', 'Cross-disciplinary', 'Contrarian Views'], description: 'Novel insights', target_words: 1200 },
      { title: 'Practical Applications', subsections: ['Real-world Use', 'Best Practices', 'Tools'], description: 'Applications', target_words: 1200 },
      { title: 'Future Outlook', subsections: ['Predictions', 'Implications', 'Conclusion'], description: 'What comes next', target_words: 1400 },
    ];
  }

  if (outline.length < 5) {
    outline = [
      { title: 'Introduction & Background', subsections: [], description: 'Comprehensive intro', target_words: 1500 },
      { title: 'Foundations & History', subsections: [], description: 'Historical context', target_words: 1500 },
      { title: 'Core Analysis', subsections: [], description: 'Deep analysis', target_words: 2000 },
      { title: 'Modern Perspectives', subsections: [], description: 'Current state', target_words: 2000 },
      { title: 'Innovations & Applications', subsections: [], description: 'Practical aspects', target_words: 1500 },
      { title: 'Future Directions & Conclusion', subsections: [], description: 'Forward-looking', target_words: 1500 },
    ];
  }

  // ── Step 6: Generate Each Chapter ──
  console.log(`Author Agent: Writing ${outline.length} chapters...`);
  const chapters: string[] = [];
  const relevantUserContent = contentSummary.substring(0, 4000);

  for (let i = 0; i < outline.length; i++) {
    const section = outline[i];
    const targetWords = section.target_words || 1500;
    const previousContext = chapters.length > 0
      ? `\n\nPrevious sections covered:\n${chapters.map((c, idx) => `- ${outline[idx].title}`).join('\n')}\n\nLast section ended with:\n${chapters[chapters.length - 1].slice(-500)}`
      : '';

    const chapterPrompt = `You are writing Chapter ${i + 1} of ${outline.length} in a comprehensive document about "${topicData.topic}".
Angle: "${topicData.angle}"

This chapter: "${section.title}"
Subsections to cover: ${JSON.stringify(section.subsections || [])}
Description: ${section.description || 'Cover this topic thoroughly'}
Target: AT LEAST ${targetWords} words. Do NOT write fewer.
${previousContext}

Research findings to incorporate:
${researchFindings.substring(i * 2000, (i + 1) * 2000 + 1000)}

User's existing knowledge to build upon:
${relevantUserContent.substring(0, 2000)}

Knowledge gaps identified: ${JSON.stringify((gapData.gaps || []).slice(0, 3))}

CRITICAL INSTRUCTIONS:
- Write AT LEAST ${targetWords} words for this chapter. Count carefully.
- Use rich markdown formatting: headers (##, ###), bold, italic, bullet points, numbered lists, blockquotes
- Include specific examples, data points, and concrete details
- Add innovative insights not found in the user's existing content
- Use engaging, authoritative prose
- Include cross-references to concepts from other chapters
- Add thought-provoking questions or observations
- Format with clear subsections using ### headers
- DO NOT include any JSON — write pure markdown prose
- Start directly with the chapter heading (## ${section.title})`;

    const chapterContent = await callAI(apiKey, [
      { role: 'system', content: `You are an expert author writing a comprehensive, publication-quality document. Write extensively, aiming for at least ${targetWords} words. Your prose should be engaging, informative, and well-structured with rich markdown formatting.` },
      { role: 'user', content: chapterPrompt }
    ], 0.75);

    chapters.push(chapterContent);
    console.log(`Author Agent: Chapter ${i + 1}/${outline.length} written (${chapterContent.split(/\s+/).length} words)`);
  }

  // ── Step 7: Citation Generation (engaging Citation Agent) ──
  console.log('Author Agent: Engaging Citation Agent...');
  const citationPrompt = `Based on the following document content, generate a "References & Further Reading" section with:
- 10-15 relevant academic and professional references (real or plausible)
- Format in APA style
- Include books, journal articles, and web resources
- Organize by theme

Topic: "${topicData.topic}"

Key themes covered: ${outline.map(s => s.title).join(', ')}

Return the references as a formatted markdown section starting with "## References & Further Reading"`;

  const citations = await callAI(apiKey, [
    { role: 'system', content: 'You are a citation specialist. Generate well-formatted references.' },
    { role: 'user', content: citationPrompt }
  ], 0.4);

  // ── Step 8: Assemble Final Document ──
  const config = agent.config || {};
  const customTitle = (config as any).synthesizer_title;
  const docTitle = customTitle
    ? `${customTitle} (Created by PendragonX)`
    : `${topicData.topic} (Created by PendragonX)`;

  const tableOfContents = outline.map((s, i) => `${i + 1}. [${s.title}](#${s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')})`).join('\n');

  const docContent = `# ${docTitle}

> *${topicData.angle}*

---

## Table of Contents

${tableOfContents}

---

${chapters.join('\n\n---\n\n')}

---

${citations}

---

*This document was autonomously researched and authored by PendragonX's Author Agent. It synthesized insights from ${content.cards.length} Zettelcards, ${content.notes.length} Notes, ${content.scratchpad.length} Scratchpad entries, and ${content.catalystDocs.length} existing documents. The Author Agent engaged Knowledge Gap Analysis, Research Exploration, and Citation Generation to produce this comprehensive work.*

*Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*
`;

  const wordCount = docContent.split(/\s+/).length;
  console.log(`Author Agent: Final document: ${wordCount} words`);

  // ── Step 9: Save to Catalyst ──
  const { data: newDoc, error: docError } = await supabaseClient
    .from('catalyst_documents')
    .insert({
      user_id: user.id,
      title: docTitle,
      content: docContent,
      selected_source: 'agent_synthesizer',
      word_count: wordCount,
    })
    .select('id')
    .single();

  if (docError) {
    throw new Error(`Failed to create document: ${docError.message}`);
  }

  findings.push({
    agent_id: agentId, run_id: runId, user_id: user.id,
    finding_type: 'document_created',
    title: `📄 "${docTitle}" is ready!`,
    content: `The Author Agent explored "${topicData.topic}" and produced a ${wordCount.toLocaleString()}-word document across ${outline.length} chapters. It engaged Knowledge Gap, Research, and Citation agents to deliver comprehensive, original content. Open Catalyst to view it.`,
    metadata: {
      document_id: newDoc.id,
      topic: topicData.topic,
      angle: topicData.angle,
      chapters: outline.length,
      word_count: wordCount,
      sources_used: {
        cards: content.cards.length,
        notes: content.notes.length,
        scratchpad: content.scratchpad.length,
        catalyst: content.catalystDocs.length,
      },
      agents_engaged: ['knowledge_gap', 'research', 'citation'],
    },
    relevance_score: 1.0
  });

  return { itemsProcessed: totalItems, itemsFound: 1, findings };
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

    const { agentId, runId } = await req.json();
    if (!agentId || !runId) throw new Error('Missing agentId or runId');

    console.log(`Executing agent ${agentId} for run ${runId}`);

    const { data: agent, error: agentError } = await supabaseClient
      .from('agents').select('*').eq('id', agentId).eq('user_id', user.id).single();

    if (agentError || !agent) throw new Error('Agent not found');

    let itemsFound = 0;
    let itemsProcessed = 0;
    const findings: any[] = [];

    switch (agent.agent_type) {
      case 'research': {
        const { data: catalystDocs } = await supabaseClient
          .from('catalyst_documents').select('id, title, content')
          .eq('user_id', user.id).order('updated_at', { ascending: false }).limit(5);

        if (catalystDocs && catalystDocs.length > 0) {
          itemsProcessed = catalystDocs.length;
          for (const doc of catalystDocs) {
            const topics = doc.content.split(/[.\n]/).filter((s: string) => s.length > 50).slice(0, 3);
            if (topics.length > 0) {
              itemsFound++;
              findings.push({
                agent_id: agentId, run_id: runId, user_id: user.id,
                finding_type: 'research_topic',
                title: `Research suggestions for "${doc.title}"`,
                content: `Consider exploring these topics further: ${topics.map((t: string) => t.substring(0, 100)).join('; ')}`,
                metadata: { document_id: doc.id, topics },
                relevance_score: 0.8
              });
            }
          }
        }
        break;
      }

      case 'habit_reminder': {
        findings.push({
          agent_id: agentId, run_id: runId, user_id: user.id,
          finding_type: 'habit_reminder', title: 'Daily Habit Check-in',
          content: 'Don\'t forget to review your habits and update your progress today!',
          metadata: { reminder_type: 'daily' }, relevance_score: 1.0
        });
        itemsFound = 1; itemsProcessed = 1;
        break;
      }

      case 'smart_linking': {
        const { data: cards } = await supabaseClient
          .from('zettel_cards').select('id, title, content, tags, linked_cards')
          .eq('user_id', user.id).is('deleted_at', null).order('updated_at', { ascending: false }).limit(20);

        if (cards && cards.length > 1) {
          itemsProcessed = cards.length;
          for (let i = 0; i < cards.length; i++) {
            for (let j = i + 1; j < cards.length; j++) {
              const card1 = cards[i], card2 = cards[j];
              if (card1.linked_cards?.includes(card2.id) || card2.linked_cards?.includes(card1.id)) continue;
              const sharedTags = (card1.tags || []).filter((t: string) => (card2.tags || []).includes(t));
              if (sharedTags.length > 0) {
                itemsFound++;
                findings.push({
                  agent_id: agentId, run_id: runId, user_id: user.id,
                  finding_type: 'link_suggestion',
                  title: `Link "${card1.title}" with "${card2.title}"`,
                  content: `These cards share tags: ${sharedTags.join(', ')}`,
                  metadata: { card1_id: card1.id, card2_id: card2.id, shared_tags: sharedTags },
                  relevance_score: Math.min(sharedTags.length * 0.3, 1)
                });
              }
            }
          }
        }
        break;
      }

      case 'knowledge_gap': {
        const { data: cards } = await supabaseClient
          .from('zettel_cards').select('content').eq('user_id', user.id).is('deleted_at', null);
        if (cards && cards.length > 0) {
          itemsProcessed = cards.length;
          const allContent = cards.map((c: any) => c.content).join(' ');
          const references = allContent.match(/\[\[([^\]]+)\]\]/g) || [];
          const uniqueRefs = [...new Set(references)];
          if (uniqueRefs.length > 0) {
            itemsFound = 1;
            findings.push({
              agent_id: agentId, run_id: runId, user_id: user.id,
              finding_type: 'knowledge_gap', title: 'Potential Knowledge Gaps Detected',
              content: `You reference these topics but may not have dedicated cards: ${uniqueRefs.slice(0, 5).join(', ')}`,
              metadata: { references: uniqueRefs.slice(0, 10) }, relevance_score: 0.7
            });
          }
        }
        break;
      }

      case 'task_extraction': {
        const { data: notes } = await supabaseClient
          .from('notes').select('id, title, content')
          .eq('user_id', user.id).is('deleted_at', null).order('updated_at', { ascending: false }).limit(10);
        if (notes && notes.length > 0) {
          itemsProcessed = notes.length;
          const actionPatterns = /\b(TODO|FIXME|ACTION|NEED TO|MUST|SHOULD|REMEMBER TO|DON'T FORGET)\b/gi;
          for (const note of notes) {
            const matches = note.content.match(actionPatterns);
            if (matches && matches.length > 0) {
              itemsFound++;
              findings.push({
                agent_id: agentId, run_id: runId, user_id: user.id,
                finding_type: 'task_found',
                title: `Action items in "${note.title}"`,
                content: `Found ${matches.length} potential action items in this note`,
                metadata: { note_id: note.id, action_count: matches.length }, relevance_score: 0.9
              });
            }
          }
        }
        break;
      }

      case 'card_synthesizer': {
        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

        const result = await runAuthorAgent(supabaseClient, user, agent, runId, LOVABLE_API_KEY);
        itemsProcessed = result.itemsProcessed;
        itemsFound = result.itemsFound;
        findings.push(...result.findings);
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

    // Update run status
    await supabaseClient.from('agent_runs').update({
      status: 'completed', completed_at: new Date().toISOString(),
      items_processed: itemsProcessed, items_found: itemsFound,
      results: { findings_count: findings.length }
    }).eq('id', runId);

    // Update agent last run time
    const nextRunAt = new Date(Date.now() + agent.run_frequency_minutes * 60 * 1000);
    await supabaseClient.from('agents').update({
      last_run_at: new Date().toISOString(),
      next_run_at: nextRunAt.toISOString()
    }).eq('id', agentId);

    console.log(`Agent ${agentId} completed. Found ${itemsFound} items.`);

    return new Response(
      JSON.stringify({ success: true, itemsProcessed, itemsFound, findingsCount: findings.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Agent execution error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
