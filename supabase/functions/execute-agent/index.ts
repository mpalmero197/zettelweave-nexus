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
        'Authorization': `Bearer ${apiKey}`,
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
    if (!content) {
      console.warn('AI returned empty content');
    }
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

  // ── CALL 1: Topic Selection (quick, small output) ──
  console.log('Author Agent: Selecting topic...');
  let topicData: any = { topic: 'Exploration of Key Themes', angle: 'A synthesis of the user\'s knowledge' };

  try {
    const topicRaw = await callAI(apiKey, [
      { role: 'system', content: 'You are a topic selection AI. Return only valid JSON.' },
      { role: 'user', content: `You are an expert research analyst. Below is a user's knowledge base.

Your job: Identify the SINGLE most fascinating topic to explore in depth. Look for:
- Recurring themes across multiple content sources
- Topics with depth potential that haven't been fully explored
- Interesting intersections between different subjects

Return ONLY a JSON object: {"topic": "...", "angle": "..."}

${contentSummary}` }
    ], 0.8, 1024);

    const jsonMatch = topicRaw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.topic) topicData = parsed;
    }
  } catch (e) {
    console.error('Author Agent: Topic selection failed, using fallback:', e);
  }

  console.log(`Author Agent: Selected topic "${topicData.topic}"`);

  // ── CALL 2: Full Document Generation (single big call) ──
  console.log('Author Agent: Generating full document in one call...');
  let documentBody = '';

  try {
    documentBody = await callAI(apiKey, [
      { role: 'system', content: `You are a world-class author and researcher. Write an extensive, publication-quality document. You MUST write as much content as possible — aim for at least 4,000 words. Use rich markdown formatting throughout. Never cut yourself short.` },
      { role: 'user', content: `Write a comprehensive, deeply researched document on: "${topicData.topic}"
Angle/thesis: "${topicData.angle}"

REQUIREMENTS:
1. Start with a compelling introduction that frames the topic
2. Include 8+ major sections with ## headers and ### subsections
3. Each section should be 400-600 words minimum
4. Include innovative insights, not just surface-level information
5. Add historical context, current developments, and future implications
6. Include specific examples, data points, case studies, and expert perspectives
7. Use rich markdown: **bold**, *italic*, > blockquotes, bullet lists, numbered lists
8. Add cross-disciplinary connections and contrarian perspectives
9. End with a "References & Further Reading" section with 10+ APA-formatted references
10. Write a table of contents after the introduction

The user has existing knowledge on this topic from their notes:
${contentSummary.substring(0, 6000)}

GO BEYOND their existing knowledge. Explore new angles, fill knowledge gaps, and provide original synthesis.

CRITICAL: Write as much content as you can. Do NOT summarize or abbreviate. Every section needs depth and detail. Target 5,000+ words.` }
    ], 0.75, 16384);

    console.log(`Author Agent: Main document generated (${documentBody.split(/\s+/).length} words)`);
  } catch (e) {
    console.error('Author Agent: Main document generation failed:', e);
    // If main call fails, save a minimal document
    documentBody = `## ${topicData.topic}\n\n*The Author Agent attempted to write about this topic but encountered an error during generation. Please try running the agent again.*\n\n> Error: ${e instanceof Error ? e.message : 'Unknown error'}\n`;
  }

  // ── CALL 3: Extend if short (conditional) ──
  const wordCount1 = documentBody.split(/\s+/).length;
  if (wordCount1 < 5000 && wordCount1 > 100) {
    console.log(`Author Agent: Document is ${wordCount1} words, extending...`);
    try {
      const extension = await callAI(apiKey, [
        { role: 'system', content: 'You are continuing a document. Write extensively. Do NOT repeat any content from the previous sections. Add entirely new sections and depth.' },
        { role: 'user', content: `Continue this document about "${topicData.topic}". It currently has ~${wordCount1} words.

Here is how the document ends (last 2000 chars):
${documentBody.slice(-2000)}

Write MORE sections to extend this document. Add:
- Additional major sections (## headers) not yet covered
- Deeper analysis, more case studies, more examples
- Practical applications and implementation details  
- Comparative analysis with related topics
- Expert opinions and debate points
- A comprehensive conclusion if one doesn't exist yet

Write at least 3,000 more words. Use rich markdown formatting. Do NOT repeat anything already written.` }
      ], 0.75, 16384);

      documentBody += '\n\n' + extension;
      console.log(`Author Agent: Extended to ${documentBody.split(/\s+/).length} words`);
    } catch (e) {
      console.error('Author Agent: Extension call failed (non-fatal):', e);
    }
  }

  // ── Assemble Final Document ──
  const config = agent.config || {};
  const customTitle = (config as any).synthesizer_title;
  const docTitle = customTitle
    ? `${customTitle} (Created by PendragonX)`
    : `${topicData.topic} (Created by PendragonX)`;

  const finalContent = `# ${docTitle}

> *${topicData.angle}*

---

${documentBody}

---

*This document was autonomously researched and authored by PendragonX's Author Agent. It synthesized insights from ${content.cards.length} Zettelcards, ${content.notes.length} Notes, ${content.scratchpad.length} Scratchpad entries, and ${content.catalystDocs.length} existing documents.*

*Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}*
`;

  const finalWordCount = finalContent.split(/\s+/).length;
  console.log(`Author Agent: Final document: ${finalWordCount} words`);

  // ── Save to Catalyst ──
  const { data: newDoc, error: docError } = await supabaseClient
    .from('catalyst_documents')
    .insert({
      user_id: user.id,
      title: docTitle,
      content: finalContent,
      selected_source: 'agent_synthesizer',
      word_count: finalWordCount,
    })
    .select('id')
    .single();

  if (docError) {
    throw new Error(`Failed to save document: ${docError.message}`);
  }

  findings.push({
    agent_id: agentId, run_id: runId, user_id: user.id,
    finding_type: 'document_created',
    title: `📄 "${docTitle}" is ready!`,
    content: `The Author Agent explored "${topicData.topic}" and produced a ${finalWordCount.toLocaleString()}-word document. Open Catalyst to view it.`,
    metadata: {
      document_id: newDoc.id,
      topic: topicData.topic,
      angle: topicData.angle,
      word_count: finalWordCount,
      sources_used: {
        cards: content.cards.length,
        notes: content.notes.length,
        scratchpad: content.scratchpad.length,
        catalyst: content.catalystDocs.length,
      },
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

        try {
          const result = await runAuthorAgent(supabaseClient, user, agent, runId, LOVABLE_API_KEY);
          itemsProcessed = result.itemsProcessed;
          itemsFound = result.itemsFound;
          findings.push(...result.findings);
        } catch (authorError) {
          console.error('Author Agent fatal error:', authorError);
          // Mark run as failed
          await supabaseClient.from('agent_runs').update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: authorError instanceof Error ? authorError.message : 'Unknown author agent error',
          }).eq('id', runId);

          // Still notify the user
          await supabaseClient.from('agent_notifications').insert({
            user_id: user.id, agent_id: agentId,
            title: '❌ Author Agent Failed',
            message: `The Author Agent encountered an error: ${authorError instanceof Error ? authorError.message : 'Unknown error'}. Please try again.`,
            notification_type: 'warning',
          });

          return new Response(
            JSON.stringify({ success: false, error: authorError instanceof Error ? authorError.message : 'Author agent failed' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
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
