import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function respond(ok: boolean, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ ok, ...payload }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const isPing = await req.clone().json().then((b: any) => !!b?.ping).catch(() => false);
  if (isPing) {
    return respond(true, { pong: true });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (!authHeader || authError || !user) {
      return respond(false, { error: 'Authentication required' });
    }

    const { cards, fromMethod, toMethod } = await req.json();

    const organizationMethodDescriptions: Record<string, string> = {
      dewey: `Dewey Decimal Classification (000-999): Use the MOST SPECIFIC Dewey number possible (e.g., 973.4 for U.S. Constitutional Period, not just 900 or 970).
      
Main classes:
000-099: Computer Science, Information & General Works
100-199: Philosophy & Psychology
200-299: Religion
300-399: Social Sciences
400-499: Language
500-599: Science
600-699: Technology
700-799: Arts & Recreation
800-899: Literature
900-999: History & Geography

CRITICAL: Analyze the content deeply and assign the most precise decimal number (3+ digits).`,
      luhmann: "Luhmann System: Alphanumeric branching (1, 1a, 1a1, 1a2, 1b, 2, 2a, etc.)",
      folgezettel: "Folgezettel System: Sequential decimal numbering (1.1, 1.2, 1.2.1, 1.2.2, 2.1, etc.)",
      thematic: "Thematic Organization: Topic-based prefixes (PHIL-001, HIST-001, SCI-001, etc.)"
    };

    const systemPrompt = `You are an expert knowledge organization AI that converts Zettelkasten cards between different organizational systems.

TASK: Convert ${cards.length} cards from ${fromMethod.toUpperCase()} to ${toMethod.toUpperCase()} system.

FROM SYSTEM: ${organizationMethodDescriptions[fromMethod]}
TO SYSTEM: ${organizationMethodDescriptions[toMethod]}

RULES:
1. Preserve ALL original content, titles, descriptions, and tags
2. Only change: number, category (if applicable), and linkedCards references
3. Maintain logical relationships between cards through proper numbering
4. Group related content logically in the new system
5. Return EXACTLY the same number of cards as input

FOR DEWEY DECIMAL: Set the 'category' field to include both the number AND its meaning.

OUTPUT: JSON array of reorganized cards with updated numbers, categories, and linkedCards.`;

    const userPrompt = `Original cards (${fromMethod} system):
${JSON.stringify(cards, null, 2)}

Convert these cards to ${toMethod} system.`;

    if (!lovableApiKey) {
      return respond(false, { error: 'AI service not configured' });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return respond(false, { error: 'AI service is temporarily busy. Please wait a moment and try again.', isRateLimit: true });
      }
      if (response.status === 402) {
        return respond(false, { error: 'AI credits depleted. Please add funds to continue.', isPaymentRequired: true });
      }
      const errorText = await response.text();
      console.error('Lovable AI gateway error:', response.status, errorText);
      return respond(false, { error: `AI gateway error: ${response.status}` });
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    let reorganizedCards;
    try {
      const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/) || aiResponse.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      reorganizedCards = JSON.parse(jsonStr);
    } catch (parseError) {
      return respond(false, { error: 'AI returned invalid JSON format' });
    }

    if (!Array.isArray(reorganizedCards)) {
      return respond(false, { error: 'AI response is not an array of cards' });
    }

    if (reorganizedCards.length !== cards.length) {
      return respond(false, { error: `Expected ${cards.length} cards, got ${reorganizedCards.length}` });
    }

    const requiredFields = ['id', 'title', 'content', 'number', 'category'];
    for (const card of reorganizedCards) {
      for (const field of requiredFields) {
        if (!(field in card)) {
          return respond(false, { error: `Missing required field: ${field} in reorganized card` });
        }
      }
    }

    return respond(true, { reorganizedCards });

  } catch (error) {
    console.error('Error in ai-reorganize-cards function:', error);
    return respond(false, { error: error instanceof Error ? error.message : 'Failed to reorganize cards' });
  }
});
