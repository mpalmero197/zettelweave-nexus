import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const editCardSchema = z.object({
  card: z.object({
    id: z.string().uuid().optional(),
    title: z.string().min(1).max(200),
    content: z.string().min(1).max(10000),
    description: z.string().max(500).optional(),
    category: z.string().min(1).max(100),
    tags: z.array(z.string().max(50)).max(20)
  }),
  prompt: z.string().min(1).max(1000)
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
    const body = await req.json();
    
    const validationResult = editCardSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return new Response(
        JSON.stringify({ error: 'Invalid input data' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { card, prompt } = validationResult.data;

    console.log('Processing AI edit for card:', card.id || 'new card');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { 
            role: 'system', 
            content: `You are an AI assistant that helps improve Zettelkasten cards. Given a card and a user's editing request, return an improved version of the card in JSON format.

The response must be a valid JSON object with these exact fields:
- title: string
- description: string (can be empty string if not provided)
- content: string
- category: string (must be a Dewey decimal category like "000", "100", etc.)
- tags: array of strings

Keep the essence of the original card while applying the user's requested changes. Be concise but informative.`
          },
          { 
            role: 'user', 
            content: `Original card:
Title: ${card.title}
Description: ${card.description || ''}
Content: ${card.content}
Category: ${card.category}
Tags: ${card.tags.join(', ')}

User's request: ${prompt}

Please improve this card according to the user's request and return the result as JSON.`
          }
        ],
        max_tokens: 1000,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (response.status === 402) {
      return new Response(JSON.stringify({ error: 'AI usage limit reached. Please add credits to continue.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    let parsedResponse;
    try {
      const jsonMatch = aiResponse.match(/```json\n?([\s\S]*?)\n?```/) || aiResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiResponse;
      parsedResponse = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      throw new Error('AI returned invalid JSON format');
    }

    const requiredFields = ['title', 'description', 'content', 'category', 'tags'];
    for (const field of requiredFields) {
      if (!(field in parsedResponse)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-edit-card function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process AI edit request';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
