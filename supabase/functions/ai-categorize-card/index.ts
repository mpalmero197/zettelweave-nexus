import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, content, method, existingNumbers } = await req.json();

    console.log('AI Categorization Request:', { 
      title, 
      contentLength: content?.length, 
      method 
    });

    const methodDescriptions: Record<string, string> = {
      dewey: `Dewey Decimal Classification: Use the MOST SPECIFIC number possible (e.g., 973.4 for U.S. Constitutional Period, not just 900).

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

Analyze content deeply and assign 3+ digit decimal number. Include the full description in category field like "973.4 - U.S. History: Constitutional Period (1789-1809)"`,
      luhmann: "Luhmann System: Alphanumeric branching (1, 1a, 1a1) where numbers show relationships. Start with simple numbers and branch for related content.",
      folgezettel: "Folgezettel System: Decimal hierarchy (1.1, 1.2, 1.2.1) where numbers indicate topic relationships and development.",
      thematic: "Thematic Organization: 4-letter theme codes + 3-digit sequence (PHIL-001, HIST-001, SCI-001)."
    };

    const systemPrompt = `You are an expert knowledge organization AI that categorizes content using the ${method.toUpperCase()} system.

SYSTEM: ${methodDescriptions[method]}

TASK: Analyze the given title and content, then assign:
1. A specific number that fits the ${method} system
2. A category description that explains the classification

${method === 'dewey' ? 'CRITICAL: For Dewey, go 3+ digits deep. Set category as: "NUMBER - DESCRIPTION" (e.g., "973.4 - U.S. History: Constitutional Period (1789-1809)")' : ''}

Existing numbers to avoid duplicates: ${existingNumbers.join(', ')}

Return JSON with: { "number": "...", "category": "..." }`;

    const userPrompt = `Title: ${title}
Content: ${content}

Analyze and categorize this content using the ${method} system.`;

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
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI Response:', aiResponse);

    // Parse JSON response
    let result;
    try {
      const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/) || aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('AI returned invalid JSON');
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-categorize-card:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
