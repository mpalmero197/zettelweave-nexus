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

    // Verify the user
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

    // Fetch the agent configuration
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

    // Execute based on agent type
    switch (agent.agent_type) {
      case 'research': {
        // Research agent: analyze Catalyst documents and find related materials
        const { data: catalystDocs } = await supabaseClient
          .from('catalyst_documents')
          .select('id, title, content')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(5);

        if (catalystDocs && catalystDocs.length > 0) {
          itemsProcessed = catalystDocs.length;
          
          // Extract topics from recent documents
          for (const doc of catalystDocs) {
            // Simple topic extraction (in production, use AI)
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
        // Check habit data from localStorage pattern (habits stored client-side)
        // For now, create a reminder finding
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
        // Find cards that might be related
        const { data: cards } = await supabaseClient
          .from('zettel_cards')
          .select('id, title, content, tags, linked_cards')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .limit(20);

        if (cards && cards.length > 1) {
          itemsProcessed = cards.length;
          
          // Simple similarity check based on shared tags
          for (let i = 0; i < cards.length; i++) {
            for (let j = i + 1; j < cards.length; j++) {
              const card1 = cards[i];
              const card2 = cards[j];
              
              // Skip if already linked
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
        // Find referenced topics without corresponding cards
        const { data: cards } = await supabaseClient
          .from('zettel_cards')
          .select('content')
          .eq('user_id', user.id)
          .is('deleted_at', null);

        if (cards && cards.length > 0) {
          itemsProcessed = cards.length;
          
          // Look for patterns like "[[...]]" or mentions of undefined terms
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
        // Look for action items in notes
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
        finding_id: null, // Will be set after findings are inserted
        title: f.title,
        message: f.content.substring(0, 200),
        notification_type: 'info'
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
