import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function callAI(apiKey: string, messages: any[]) {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI error ${response.status}: ${body.substring(0, 200)}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiKey = Deno.env.get('LOVABLE_API_KEY')!;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get all users who have content (active users)
    const { data: activeUsers } = await adminClient
      .from('zettel_cards')
      .select('user_id')
      .is('deleted_at', null)
      .limit(500);

    const uniqueUserIds = [...new Set((activeUsers || []).map((r: any) => r.user_id))];

    const now = new Date();
    const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)}`;

    let reportsCreated = 0;

    for (const userId of uniqueUserIds) {
      try {
        // Gather user content stats
        const [cardsRes, notesRes, tasksRes, docsRes, notebooksRes] = await Promise.all([
          adminClient.from('zettel_cards').select('id, title, content, tags, category, created_at, updated_at')
            .eq('user_id', userId).is('deleted_at', null).order('updated_at', { ascending: false }).limit(50),
          adminClient.from('notes').select('id, title, content, tags, created_at, updated_at')
            .eq('user_id', userId).is('deleted_at', null).order('updated_at', { ascending: false }).limit(30),
          adminClient.from('project_tasks').select('id, name, status, priority, due_date')
            .eq('user_id', userId).limit(30),
          adminClient.from('catalyst_documents').select('id, title, word_count')
            .eq('user_id', userId).is('deleted_at', null).limit(20),
          adminClient.from('notebooks').select('id, name')
            .eq('user_id', userId).limit(20),
        ]);

        const cards = cardsRes.data || [];
        const notes = notesRes.data || [];
        const tasks = tasksRes.data || [];
        const docs = docsRes.data || [];
        const notebooks = notebooksRes.data || [];

        if (cards.length === 0 && notes.length === 0) continue;

        // Build content summary for AI
        const categories = [...new Set(cards.map((c: any) => c.category).filter(Boolean))];
        const allTags = [...new Set(cards.flatMap((c: any) => c.tags || []).concat(notes.flatMap((n: any) => n.tags || [])))];
        const overdueTasks = tasks.filter((t: any) => t.status !== 'done' && t.due_date && new Date(t.due_date) < now);
        const recentCards = cards.slice(0, 10).map((c: any) => `- "${c.title}" (${c.category})`).join('\n');
        const recentNotes = notes.slice(0, 10).map((n: any) => `- "${n.title}"`).join('\n');

        const prompt = `You are an intelligent workspace analyst. Analyze this user's knowledge base and provide a Daily Report.

WORKSPACE STATS:
- Total Cards: ${cards.length}
- Total Notes: ${notes.length}
- Notebooks: ${notebooks.length} (${notebooks.map((n: any) => n.name).join(', ')})
- Catalyst Documents: ${docs.length}
- Categories used: ${categories.join(', ') || 'None'}
- Tags used: ${allTags.slice(0, 20).join(', ') || 'None'}
- Active Tasks: ${tasks.filter((t: any) => t.status !== 'done').length}
- Overdue Tasks: ${overdueTasks.length}

RECENT CARDS:
${recentCards || 'None'}

RECENT NOTES:
${recentNotes || 'None'}

OVERDUE TASKS:
${overdueTasks.map((t: any) => `- "${t.name}" (due ${t.due_date}, priority: ${t.priority})`).join('\n') || 'None'}

Provide a structured daily report with these sections:

## 📊 Workspace Overview
Brief summary of workspace health and activity.

## 🔍 Gaps Identified
List 3-5 specific gaps or missing areas in their knowledge base (e.g., missing categories, orphaned notes without tags, topics with only surface-level coverage, areas that could benefit from more cross-linking).

## ⚠️ Action Items
List any overdue tasks or items needing attention.

## 💡 Recommendations
Provide 3-5 actionable recommendations for improvements (e.g., "Create a 'Research Methods' category to organize your methodology cards", "Link your quantum physics cards together for better knowledge graph connections", "Add tags to your 15 untagged notes for better discoverability").

## 📈 Growth Opportunities
Suggest 2-3 new topics or areas to explore based on their existing content patterns.

Keep it concise, actionable, and personalized to their actual content.`;

        const aiResponse = await callAI(apiKey, [
          { role: 'system', content: 'You are a workspace analyst providing daily insights. Be specific and actionable. Use markdown formatting.' },
          { role: 'user', content: prompt },
        ]);

        // Generate a card number
        const cardNumber = `DR-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

        // Check if today's report already exists
        const { data: existing } = await adminClient
          .from('zettel_cards')
          .select('id')
          .eq('user_id', userId)
          .eq('number', cardNumber)
          .is('deleted_at', null)
          .maybeSingle();

        if (existing) {
          // Update existing report
          await adminClient
            .from('zettel_cards')
            .update({
              content: aiResponse,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        } else {
          // Create new Daily Report card
          await adminClient
            .from('zettel_cards')
            .insert({
              user_id: userId,
              title: `Daily Report — ${dateStr}`,
              content: aiResponse,
              category: 'reference',
              tags: ['daily-report', 'auto-generated'],
              number: cardNumber,
              description: `Automated daily workspace analysis for ${dateStr}. Identifies gaps, provides recommendations, and tracks growth opportunities.`,
            });
        }

        reportsCreated++;
      } catch (userErr) {
        console.error(`Failed to generate report for user ${userId}:`, userErr);
      }
    }

    return new Response(JSON.stringify({ success: true, reportsCreated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Daily report error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
