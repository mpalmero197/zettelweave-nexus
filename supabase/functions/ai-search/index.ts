import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const aiSearchSchema = z.object({
  query: z.string().min(1).max(500),
  stickyNotes: z.array(z.object({
    id: z.string(),
    content: z.string().max(5000)
  })).max(100).optional()
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const isPing = await req.clone().json().then((b: any) => !!b?.ping).catch(() => false);
  if (isPing) {
    return new Response(JSON.stringify({ ok: true, pong: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  try {
    // Validate authentication from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id; // Use authenticated user's ID

    const body = await req.json();
    
    // Validate input
    const validationResult = aiSearchSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid search parameters' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { query, stickyNotes = [] } = validationResult.data;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Get all user's content (RLS will automatically filter by authenticated user)
    const [cardsResult, notesResult] = await Promise.all([
      supabaseClient.from('zettel_cards').select('*').is('deleted_at', null),
      supabaseClient.from('notes').select('*').is('deleted_at', null)
    ]);

    const cards = cardsResult.data || [];
    const notes = notesResult.data || [];

    // If no AI-powered search is needed (very short query), use simple string matching
    const lowerQuery = query.toLowerCase();
    
    // First try simple keyword matching as fallback
    const simpleCardMatches = cards.filter((c: any) => 
      c.title?.toLowerCase().includes(lowerQuery) ||
      c.content?.toLowerCase().includes(lowerQuery) ||
      c.tags?.some((tag: string) => tag.toLowerCase().includes(lowerQuery)) ||
      c.category?.toLowerCase().includes(lowerQuery)
    );
    
    const simpleNoteMatches = notes.filter((n: any) =>
      n.title?.toLowerCase().includes(lowerQuery) ||
      n.content?.toLowerCase().includes(lowerQuery) ||
      n.tags?.some((tag: string) => tag.toLowerCase().includes(lowerQuery))
    );
    
    const simpleStickyMatches = stickyNotes.filter((sn: any) =>
      sn.content?.toLowerCase().includes(lowerQuery)
    );

    // If we have simple matches, return them immediately without calling AI
    if (simpleCardMatches.length > 0 || simpleNoteMatches.length > 0 || simpleStickyMatches.length > 0) {
      return new Response(
        JSON.stringify({
          cards: simpleCardMatches,
          notes: simpleNoteMatches,
          stickyNotes: simpleStickyMatches,
          reasoning: `Found ${simpleCardMatches.length + simpleNoteMatches.length + simpleStickyMatches.length} exact matches for "${query}"`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only use AI for semantic/fuzzy search if simple search found nothing
    // Prepare content for AI with more context
    const contentSummary = {
      cards: cards.map((c: any) => ({
        id: c.id,
        number: c.number,
        title: c.title,
        content: c.content.substring(0, 300), // Increased from 200
        tags: c.tags || [],
        category: c.category
      })),
      notes: notes.map((n: any) => ({
        id: n.id,
        title: n.title,
        content: n.content.substring(0, 300), // Increased from 200
        tags: n.tags || []
      })),
      stickyNotes: stickyNotes.map((sn: any) => ({
        id: sn.id,
        content: sn.content.substring(0, 300) // Increased from 200
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
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to your workspace." }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();

    // Extract results from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({
          cards: [],
          notes: [],
          stickyNotes: [],
          reasoning: 'AI search did not return results. Try using exact keywords.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : { 
      cardIds: [], 
      noteIds: [], 
      stickyNoteIds: [],
      reasoning: 'No matches found' 
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
    let status = 200;
    let errorMessage = 'Failed to process search request';
    
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        status = 200;
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (error.message.includes('payment')) {
        status = 200;
        errorMessage = 'Service temporarily unavailable. Please contact support.';
      }
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
