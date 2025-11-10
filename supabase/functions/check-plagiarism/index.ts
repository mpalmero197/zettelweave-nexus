import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, referenceTexts } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Text is required for plagiarism check' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (text.length > 50000) {
      return new Response(
        JSON.stringify({ error: 'Text must be 50,000 characters or less' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (referenceTexts && (!Array.isArray(referenceTexts) || referenceTexts.length > 20)) {
      return new Response(
        JSON.stringify({ error: 'Reference texts must be an array with max 20 items' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Compare text against reference texts (user's own content)
    const referenceMaterial = Array.isArray(referenceTexts) && referenceTexts.length > 0
      ? referenceTexts.join('\n\n---\n\n')
      : null;

    const systemPrompt = `You are a plagiarism detection assistant. Analyze the provided text and determine:
1. Whether it appears to be original writing or potentially plagiarized
2. If reference material is provided, identify any sections that are directly copied vs. properly paraphrased
3. Calculate an originality score (0-100, where 100 is completely original)

Respond with a JSON object containing:
- originalityScore (number 0-100)
- isPlagiarized (boolean)
- issues (array of specific concerns, if any)
- suggestions (array of improvements to make the writing more original)`;

    const userPrompt = referenceMaterial
      ? `Analyze this text for originality and proper citation/paraphrasing:

TEXT TO ANALYZE:
${text}

REFERENCE MATERIAL (User's own content):
${referenceMaterial}

Check if the text properly builds upon the reference material with original analysis, or if it's just copying.`
      : `Analyze this text for originality and potential plagiarism concerns:

${text}

Provide an assessment of how original and well-written this appears to be.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        tools: [{
          type: "function",
          function: {
            name: "return_plagiarism_analysis",
            description: "Return the plagiarism analysis results",
            parameters: {
              type: "object",
              properties: {
                originalityScore: {
                  type: "number",
                  description: "Score from 0-100, where 100 is completely original"
                },
                isPlagiarized: {
                  type: "boolean",
                  description: "Whether plagiarism was detected"
                },
                issues: {
                  type: "array",
                  items: { type: "string" },
                  description: "Specific plagiarism concerns found"
                },
                suggestions: {
                  type: "array",
                  items: { type: "string" },
                  description: "Suggestions to improve originality"
                }
              },
              required: ["originalityScore", "isPlagiarized", "issues", "suggestions"]
            }
          }
        }],
        tool_choice: {
          type: "function",
          function: { name: "return_plagiarism_analysis" }
        }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI gateway error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error('No analysis generated from AI');
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-plagiarism:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
