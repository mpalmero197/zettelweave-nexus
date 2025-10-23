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
    const { notes, contentType, instructions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!notes || !Array.isArray(notes) || notes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Notes array is required and must not be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Compile notes into a context for the AI
    const notesContext = notes.map((note, index) => 
      `Note ${index + 1} - ${note.title || 'Untitled'}:\n${note.content}`
    ).join('\n\n---\n\n');

    const contentTypePrompt = contentType === 'book' 
      ? 'Write a comprehensive book chapter or section'
      : contentType === 'essay'
      ? 'Write a well-structured essay'
      : contentType === 'thesis'
      ? 'Write a detailed thesis section with academic rigor'
      : contentType === 'dissertation'
      ? 'Write a dissertation chapter with extensive analysis'
      : 'Write comprehensive long-form content';

    const systemPrompt = `You are an expert writer helping to create ${contentType || 'long-form content'}. 
Use the provided notes as source material to generate high-quality, cohesive, and well-structured content.
The content should be thorough, well-researched based on the notes, and professionally written.

${instructions ? `Additional instructions: ${instructions}` : ''}

Format the output with proper headings, paragraphs, and structure.`;

    const userPrompt = `${contentTypePrompt} based on the following notes:

${notesContext}

Create a comprehensive, well-structured piece that synthesizes these notes into a cohesive narrative.`;

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
        max_tokens: 8000,
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
    const generatedContent = data.choices?.[0]?.message?.content;

    if (!generatedContent) {
      throw new Error('No content generated from AI');
    }

    return new Response(
      JSON.stringify({ content: generatedContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-long-form-content:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
