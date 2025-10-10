import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, userId, stickyNotes = [] } = await req.json();
    
    if (!query || !userId) {
      throw new Error('Query and userId are required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all user's content
    const [cardsResult, notesResult] = await Promise.all([
      supabaseClient.from('zettel_cards').select('*').eq('user_id', userId).is('deleted_at', null),
      supabaseClient.from('notes').select('*').eq('user_id', userId).is('deleted_at', null)
    ]);

    const cards = cardsResult.data || [];
    const notes = notesResult.data || [];

    // Prepare content for AI
    const contentSummary = {
      cards: cards.map(c => ({
        id: c.id,
        title: c.title,
        content: c.content.substring(0, 200),
        tags: c.tags,
        category: c.category
      })),
      notes: notes.map(n => ({
        id: n.id,
        title: n.title,
        content: n.content.substring(0, 200),
        tags: n.tags
      })),
      stickyNotes: stickyNotes.map((sn: any) => ({
        id: sn.id,
        content: sn.content.substring(0, 200)
      }))
    };

    // Call AI to understand intent and find matches
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a smart search assistant. Your job is to help users find content even if they misspell words or describe things imprecisely. 

Given a user's search query and their content library, return the IDs of the most relevant items.

Return ONLY a JSON object in this exact format:
{
  "cardIds": ["id1", "id2"],
  "noteIds": ["id3", "id4"],
  "stickyNoteIds": ["id5", "id6"],
  "reasoning": "brief explanation"
}

Be flexible with spelling, synonyms, and descriptions. For example, if they search for "giraffe" or "long-necked animal", you should match items about giraffes.`
          },
          {
            role: 'user',
            content: `Search query: "${query}"\n\nContent library:\n${JSON.stringify(contentSummary, null, 2)}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_search_results",
              description: "Return the IDs of matching cards, notes, and sticky notes",
              parameters: {
                type: "object",
                properties: {
                  cardIds: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of matching card IDs"
                  },
                  noteIds: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of matching note IDs"
                  },
                  stickyNoteIds: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of matching sticky note IDs"
                  },
                  reasoning: {
                    type: "string",
                    description: "Brief explanation of why these items match"
                  }
                },
                required: ["cardIds", "noteIds", "stickyNoteIds", "reasoning"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_search_results" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI Response:', JSON.stringify(aiData, null, 2));

    // Extract results from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const results = toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : { 
      cardIds: [], 
      noteIds: [], 
      stickyNoteIds: [],
      reasoning: '' 
    };

    // Get full data for matched items
    const matchedCards = cards.filter(c => results.cardIds.includes(c.id));
    const matchedNotes = notes.filter(n => results.noteIds.includes(n.id));
    const matchedStickyNotes = stickyNotes.filter((sn: any) => results.stickyNoteIds.includes(sn.id));

    return new Response(
      JSON.stringify({
        cards: matchedCards,
        notes: matchedNotes,
        stickyNotes: matchedStickyNotes,
        reasoning: results.reasoning
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-search:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
