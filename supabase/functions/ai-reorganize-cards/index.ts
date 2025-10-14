import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Validate authentication from JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized: No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized: Invalid token');
    }

    const { cards, fromMethod, toMethod } = await req.json();

    console.log('AI Reorganization Request:', { 
      cardCount: cards.length, 
      fromMethod, 
      toMethod 
    });

    const organizationMethodDescriptions: Record<string, string> = {
      dewey: `Dewey Decimal Classification (000-999): Use the MOST SPECIFIC Dewey number possible (e.g., 973.4 for U.S. Constitutional Period, not just 900 or 970).
      
Main classes:
000-099: Computer Science, Information & General Works (e.g., 004 Data processing, 020 Library science)
100-199: Philosophy & Psychology (e.g., 150 Psychology, 170 Ethics, 180 Ancient philosophy)
200-299: Religion (e.g., 220 Bible, 290 Other religions)
300-399: Social Sciences (e.g., 320 Political science, 330 Economics, 370 Education)
400-499: Language (e.g., 420 English, 430 German, 450 Italian)
500-599: Science (e.g., 510 Mathematics, 530 Physics, 570 Biology)
600-699: Technology (e.g., 610 Medicine, 630 Agriculture, 650 Management)
700-799: Arts & Recreation (e.g., 720 Architecture, 750 Painting, 780 Music)
800-899: Literature (e.g., 810 American literature, 820 English literature)
900-999: History & Geography (e.g., 940 European history, 970 North American history, 973.4 U.S. Constitutional Period 1789-1809)

CRITICAL: Analyze the content deeply and assign the most precise decimal number (3+ digits). For example:
- "The Constitutional Period of the United States" → 973.4 (NOT 900 or 970)
- "Cognitive Psychology Research" → 153 (NOT 100 or 150)
- "Renaissance Art in Italy" → 709.024 or 945.05 (NOT 700 or 900)`,
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
- Dewey: Analyze content CAREFULLY and use SPECIFIC decimal codes (e.g., 973.4, 153.42, 709.024). Go 3+ digits deep based on subject specificity. Include the category description.
- Luhmann: Start with simple numbers (1, 2, 3) and branch (1a, 1b, 1a1) for related content
- Folgezettel: Use decimal hierarchy (1.1, 1.2, 1.2.1) grouping related topics
- Thematic: Use 4-letter theme codes + 3-digit sequence (PHIL-001, HIST-001)

FOR DEWEY DECIMAL: Set the 'category' field to include both the number AND its meaning, like: "973.4 - U.S. History: Constitutional Period (1789-1809)" or "153 - Cognitive Psychology"

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
    const errorMessage = error instanceof Error ? error.message : 'Failed to reorganize cards';
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});