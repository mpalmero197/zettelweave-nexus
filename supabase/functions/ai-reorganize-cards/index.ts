import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cards, fromMethod, toMethod } = await req.json();

    console.log('AI Reorganization Request:', { 
      cardCount: cards.length, 
      fromMethod, 
      toMethod 
    });

    const organizationMethodDescriptions = {
      dewey: "Dewey Decimal Classification (000-999): Knowledge organized by subject areas like 000-Computer Science, 100-Philosophy, 200-Religion, 300-Social Sciences, 400-Language, 500-Science, 600-Technology, 700-Arts, 800-Literature, 900-History",
      luhmann: "Luhmann System: Alphanumeric branching (1, 1a, 1a1, 1a2, 1b, 2, 2a, etc.) where each card builds on or relates to its parent, creating organic knowledge trees",
      folgezettel: "Folgezettel System: Sequential decimal numbering (1.1, 1.2, 1.2.1, 1.2.2, 2.1, etc.) where numbers indicate hierarchical relationships and topic development",
      thematic: "Thematic Organization: Topic-based prefixes (PHIL-001, HIST-001, SCI-001, etc.) where cards are grouped by thematic categories with sequential numbering within each theme"
    };

    const systemPrompt = `You are an expert knowledge organization AI that converts Zettelkasten cards between different organizational systems.

TASK: Convert ${cards.length} cards from ${fromMethod.toUpperCase()} to ${toMethod.toUpperCase()} system.

FROM SYSTEM: ${organizationMethodDescriptions[fromMethod]}
TO SYSTEM: ${organizationMethodDescriptions[toMethod]}

RULES:
1. Preserve ALL original content, titles, descriptions, and tags
2. Only change: number, category (if applicable), and linkedCards references
3. Maintain logical relationships between cards through proper numbering
4. For linked cards, update references to use new numbering system
5. Group related content logically in the new system
6. Return EXACTLY the same number of cards as input

NUMBERING GUIDELINES:
- Dewey: Use appropriate 3-digit codes (000-999) based on content
- Luhmann: Start with simple numbers (1, 2, 3) and branch (1a, 1b, 1a1) for related content
- Folgezettel: Use decimal hierarchy (1.1, 1.2, 1.2.1) grouping related topics
- Thematic: Use 4-letter theme codes + 3-digit sequence (PHIL-001, HIST-001)

OUTPUT: JSON array of reorganized cards with updated numbers, categories, and linkedCards.`;

    const userPrompt = `Original cards (${fromMethod} system):
${JSON.stringify(cards, null, 2)}

Convert these cards to ${toMethod} system. Maintain all relationships and content while applying the new organizational structure.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI Reorganization Response:', aiResponse);

    // Parse the AI response as JSON
    let reorganizedCards;
    try {
      // Extract JSON from the response if it's wrapped in markdown
      const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/) || aiResponse.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      reorganizedCards = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw response:', aiResponse);
      throw new Error('AI returned invalid JSON format');
    }

    // Validate the response
    if (!Array.isArray(reorganizedCards)) {
      throw new Error('AI response is not an array of cards');
    }

    if (reorganizedCards.length !== cards.length) {
      throw new Error(`Expected ${cards.length} cards, got ${reorganizedCards.length}`);
    }

    // Validate required fields for each card
    const requiredFields = ['id', 'title', 'content', 'number', 'category'];
    for (const card of reorganizedCards) {
      for (const field of requiredFields) {
        if (!(field in card)) {
          throw new Error(`Missing required field: ${field} in reorganized card`);
        }
      }
    }

    return new Response(JSON.stringify({ reorganizedCards }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-reorganize-cards function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to reorganize cards'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});