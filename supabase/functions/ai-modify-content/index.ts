import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const modifySchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    type: z.enum(['note', 'card', 'scratchpad', 'stickynote']),
    title: z.string().max(500),
    content: z.string().max(50000),
  })).min(1).max(10),
  instruction: z.string().min(1).max(2000),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const parsed = modifySchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { items, instruction } = parsed.data;

    const itemDescriptions = items.map((item, i) =>
      `--- Item ${i + 1} (${item.type}: "${item.title}") ---\n${item.content}`
    ).join('\n\n');

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
            content: `You are an AI assistant that modifies user content (notes, cards, scratchpad entries, sticky notes). The user will provide one or more items and an instruction for how to modify them.

Return a JSON object with a "results" array. Each result must have:
- "id": the original item id
- "title": the modified title
- "content": the modified content
- "changes": a brief summary of what was changed (1-2 sentences)

If combining multiple items, return a single result with id set to the first item's id, and note in "changes" that items were combined.

Preserve the original meaning and important details unless the user explicitly asks to remove them. Apply the user's instruction carefully.`
          },
          {
            role: 'user',
            content: `Here are the items to modify:\n\n${itemDescriptions}\n\nInstruction: ${instruction}`
          }
        ],
        max_tokens: 4000,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: 'AI usage limit reached. Please add credits.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.choices[0].message.content;

    let parsed2;
    try {
      const jsonMatch = aiText.match(/```json\n?([\s\S]*?)\n?```/) || aiText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : aiText;
      parsed2 = JSON.parse(jsonStr);
    } catch {
      throw new Error('AI returned invalid JSON');
    }

    return new Response(JSON.stringify(parsed2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-modify-content:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
