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
    const { card, prompt } = await req.json();

    console.log('AI Edit Request:', { card: card.title, prompt });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI Response:', aiResponse);

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
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to process AI edit request'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});