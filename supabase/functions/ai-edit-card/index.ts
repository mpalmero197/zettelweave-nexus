import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Validate input
    const validationResult = editCardSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return new Response(
        JSON.stringify({ error: 'Invalid input data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { card, prompt } = validationResult.data;

    console.log('Processing AI edit for card:', card.id || 'new card');

    // Retry with exponential backoff for rate limits
    let retries = 3;
    let delay = 1000; // Start with 1 second delay
    let response: Response | undefined;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
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

      if (response.ok) {
        break; // Success, exit retry loop
      }

      if (response.status === 429 && attempt < retries) {
        console.log(`Rate limited (attempt ${attempt + 1}/${retries + 1}), waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }

      if (response.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please wait a few minutes and try again.');
      }

      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    if (!response) {
      throw new Error('No response received from OpenAI API');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Parse the AI response as JSON
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      throw new Error('AI returned invalid JSON format');
    }

    // Validate the response structure
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
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});