import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { agentId, runId } = await req.json();

    if (!agentId || !runId) {
      throw new Error('Missing agentId or runId');
    }

    console.log(`Executing agent ${agentId} for run ${runId}`);

    const { data: agent, error: agentError } = await supabaseClient
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('user_id', user.id)
      .single();

    if (agentError || !agent) {
      throw new Error('Agent not found');
    }

    let itemsFound = 0;
    let itemsProcessed = 0;
    const findings: any[] = [];

    switch (agent.agent_type) {
      case 'research': {
        const { data: catalystDocs } = await supabaseClient
          .from('catalyst_documents')
          .select('id, title, content')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(5);

        if (catalystDocs && catalystDocs.length > 0) {
          itemsProcessed = catalystDocs.length;
          
          for (const doc of catalystDocs) {
            const topics = doc.content
              .split(/[.\n]/)
              .filter((s: string) => s.length > 50)
              .slice(0, 3);
            
            if (topics.length > 0) {
              itemsFound++;
              findings.push({
                agent_id: agentId,
                run_id: runId,
                user_id: user.id,
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
          agent_id: agentId,
          run_id: runId,
          user_id: user.id,
          finding_type: 'habit_reminder',
          title: 'Daily Habit Check-in',
          content: 'Don\'t forget to review your habits and update your progress today!',
          metadata: { reminder_type: 'daily' },
          relevance_score: 1.0
        });
        itemsFound = 1;
        itemsProcessed = 1;
        break;
      }

      case 'smart_linking': {
        const { data: cards } = await supabaseClient
          .from('zettel_cards')
          .select('id, title, content, tags, linked_cards')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .limit(20);

        if (cards && cards.length > 1) {
          itemsProcessed = cards.length;
          
          for (let i = 0; i < cards.length; i++) {
            for (let j = i + 1; j < cards.length; j++) {
              const card1 = cards[i];
              const card2 = cards[j];
              
              if (card1.linked_cards?.includes(card2.id) || card2.linked_cards?.includes(card1.id)) {
                continue;
              }
              
              const sharedTags = (card1.tags || []).filter((t: string) => 
                (card2.tags || []).includes(t)
              );
              
              if (sharedTags.length > 0) {
                itemsFound++;
                findings.push({
                  agent_id: agentId,
                  run_id: runId,
                  user_id: user.id,
                  finding_type: 'link_suggestion',
                  title: `Link "${card1.title}" with "${card2.title}"`,
                  content: `These cards share tags: ${sharedTags.join(', ')}`,
                  metadata: { 
                    card1_id: card1.id, 
                    card2_id: card2.id,
                    shared_tags: sharedTags 
                  },
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
          .from('zettel_cards')
          .select('content')
          .eq('user_id', user.id)
          .is('deleted_at', null);

        if (cards && cards.length > 0) {
          itemsProcessed = cards.length;
          
          const allContent = cards.map((c: any) => c.content).join(' ');
          const references = allContent.match(/\[\[([^\]]+)\]\]/g) || [];
          const uniqueRefs = [...new Set(references)];
          
          if (uniqueRefs.length > 0) {
            itemsFound = 1;
            findings.push({
              agent_id: agentId,
              run_id: runId,
              user_id: user.id,
              finding_type: 'knowledge_gap',
              title: 'Potential Knowledge Gaps Detected',
              content: `You reference these topics but may not have dedicated cards: ${uniqueRefs.slice(0, 5).join(', ')}`,
              metadata: { references: uniqueRefs.slice(0, 10) },
              relevance_score: 0.7
            });
          }
        }
        break;
      }

      case 'task_extraction': {
        const { data: notes } = await supabaseClient
          .from('notes')
          .select('id, title, content')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .limit(10);

        if (notes && notes.length > 0) {
          itemsProcessed = notes.length;
          
          const actionPatterns = /\b(TODO|FIXME|ACTION|NEED TO|MUST|SHOULD|REMEMBER TO|DON'T FORGET)\b/gi;
          
          for (const note of notes) {
            const matches = note.content.match(actionPatterns);
            if (matches && matches.length > 0) {
              itemsFound++;
              findings.push({
                agent_id: agentId,
                run_id: runId,
                user_id: user.id,
                finding_type: 'task_found',
                title: `Action items in "${note.title}"`,
                content: `Found ${matches.length} potential action items in this note`,
                metadata: { note_id: note.id, action_count: matches.length },
                relevance_score: 0.9
              });
            }
          }
        }
        break;
      }

      case 'card_synthesizer': {
        // Check 24h rate limit
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: recentRuns } = await supabaseClient
          .from('agent_runs')
          .select('id')
          .eq('agent_id', agentId)
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('completed_at', twentyFourHoursAgo)
          .limit(1);

        if (recentRuns && recentRuns.length > 0) {
          // Rate limited
          await supabaseClient
            .from('agent_runs')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: 'Rate limit: Author Agent can only run once every 24 hours.',
            })
            .eq('id', runId);

          findings.push({
            agent_id: agentId,
            run_id: runId,
            user_id: user.id,
            finding_type: 'rate_limit',
            title: 'Author Agent Rate Limited',
            content: 'This agent can only synthesize once every 24 hours. Please try again later.',
            metadata: {},
            relevance_score: 1.0
          });

          if (findings.length > 0) {
            await supabaseClient.from('agent_findings').insert(findings);
          }

          return new Response(
            JSON.stringify({ success: false, error: 'Rate limited: 1 run per 24h' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Fetch user's zettelcards
        const config = agent.config || {};
        const maxCards = (config as any).synthesizer_max_cards || 20;
        const tagFilter = (config as any).synthesizer_tag_filter;

        let query = supabaseClient
          .from('zettel_cards')
          .select('id, title, content, tags, category')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .limit(maxCards);

        const { data: cards } = await query;

        if (!cards || cards.length === 0) {
          findings.push({
            agent_id: agentId,
            run_id: runId,
            user_id: user.id,
            finding_type: 'no_content',
            title: 'No Cards to Synthesize',
            content: 'Create some Zettelcards first, then run the Author Agent to synthesize them into a document.',
            metadata: {},
            relevance_score: 1.0
          });
          itemsProcessed = 0;
          itemsFound = 0;
          break;
        }

        // Filter by tags if configured
        let filteredCards = cards;
        if (tagFilter && tagFilter.length > 0) {
          filteredCards = cards.filter((c: any) => 
            c.tags && c.tags.some((t: string) => tagFilter.includes(t))
          );
        }

        if (filteredCards.length === 0) {
          findings.push({
            agent_id: agentId,
            run_id: runId,
            user_id: user.id,
            finding_type: 'no_matching_cards',
            title: 'No Matching Cards',
            content: `No cards matched the configured tag filter: ${tagFilter?.join(', ')}`,
            metadata: { tag_filter: tagFilter },
            relevance_score: 0.8
          });
          break;
        }

        itemsProcessed = filteredCards.length;

        // Build prompt from cards
        const cardTexts = filteredCards.map((c: any, i: number) => 
          `### Card ${i + 1}: ${c.title}\n${c.content}\n${c.tags?.length ? `Tags: ${c.tags.join(', ')}` : ''}`
        ).join('\n\n');

        const customTitle = (config as any).synthesizer_title;
        const titleInstruction = customTitle 
          ? `Title the document: "${customTitle} (Created by PendragonX)"`
          : `Generate an appropriate title and append " (Created by PendragonX)" to it`;

        const systemPrompt = `You are an expert author and synthesizer. Your job is to take a collection of Zettelkasten-style notes and synthesize them into a cohesive, well-structured document. 

Rules:
- Combine related ideas naturally
- Create a logical flow with sections and headings
- Preserve key insights and details from every card
- Add transitions between sections
- Write in clear, professional prose
- ${titleInstruction}
- Return ONLY a JSON object with "title" and "content" fields. The content should be in markdown format.`;

        const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
        if (!LOVABLE_API_KEY) {
          throw new Error('LOVABLE_API_KEY not configured');
        }

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Here are ${filteredCards.length} Zettelcards to synthesize:\n\n${cardTexts}` }
            ],
            temperature: 0.7,
          }),
        });

        if (!aiResponse.ok) {
          const status = aiResponse.status;
          if (status === 429) {
            throw new Error('AI rate limit exceeded. Please try again later.');
          }
          if (status === 402) {
            throw new Error('AI credits exhausted. Please add credits to your workspace.');
          }
          throw new Error(`AI gateway error: ${status}`);
        }

        const aiData = await aiResponse.json();
        const rawContent = aiData.choices?.[0]?.message?.content || '';

        // Parse JSON from response
        let docTitle = `Synthesized Document (Created by PendragonX)`;
        let docContent = rawContent;

        try {
          // Try to extract JSON
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.title) docTitle = parsed.title;
            if (parsed.content) docContent = parsed.content;
          }
        } catch {
          // If JSON parsing fails, use raw content
          docContent = rawContent;
        }

        // Ensure title has the naming convention
        if (!docTitle.includes('(Created by PendragonX)')) {
          docTitle = `${docTitle} (Created by PendragonX)`;
        }

        // Create Catalyst document
        const { data: newDoc, error: docError } = await supabaseClient
          .from('catalyst_documents')
          .insert({
            user_id: user.id,
            title: docTitle,
            content: docContent,
            selected_source: 'agent_synthesizer',
            word_count: docContent.split(/\s+/).length,
          })
          .select('id')
          .single();

        if (docError) {
          throw new Error(`Failed to create document: ${docError.message}`);
        }

        itemsFound = 1;
        findings.push({
          agent_id: agentId,
          run_id: runId,
          user_id: user.id,
          finding_type: 'document_created',
          title: `📄 "${docTitle}" is ready!`,
          content: `Synthesized ${filteredCards.length} cards into a new Catalyst document. Open Catalyst to view and edit it.`,
          metadata: { 
            document_id: newDoc.id, 
            cards_used: filteredCards.length,
            word_count: docContent.split(/\s+/).length
          },
          relevance_score: 1.0
        });

        break;
      }

      default:
        console.log(`Agent type ${agent.agent_type} not yet implemented`);
    }

    // Save findings
    if (findings.length > 0) {
      const { error: findingsError } = await supabaseClient
        .from('agent_findings')
        .insert(findings);

      if (findingsError) {
        console.error('Error saving findings:', findingsError);
      }

      // Create notifications for important findings
      const notifications = findings.slice(0, 3).map(f => ({
        user_id: user.id,
        agent_id: agentId,
        finding_id: null,
        title: f.title,
        message: f.content.substring(0, 200),
        notification_type: f.finding_type === 'document_created' ? 'success' : 'info'
      }));

      await supabaseClient.from('agent_notifications').insert(notifications);
    }

    // Update run status
    await supabaseClient
      .from('agent_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        items_processed: itemsProcessed,
        items_found: itemsFound,
        results: { findings_count: findings.length }
      })
      .eq('id', runId);

    // Update agent last run time and schedule next run
    const nextRunAt = new Date(Date.now() + agent.run_frequency_minutes * 60 * 1000);
    await supabaseClient
      .from('agents')
      .update({
        last_run_at: new Date().toISOString(),
        next_run_at: nextRunAt.toISOString()
      })
      .eq('id', agentId);

    console.log(`Agent ${agentId} completed. Found ${itemsFound} items.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        itemsProcessed,
        itemsFound,
        findingsCount: findings.length
      }),
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