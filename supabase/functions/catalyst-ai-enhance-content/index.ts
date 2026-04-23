import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { content, action, context } = await req.json();
    
    if (!content || !action) {
      throw new Error('Content and action are required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('AI service not configured');
    }

    const actionPrompts: Record<string, string> = {
      paraphrase: `Paraphrase the following text while maintaining its meaning and tone. Make it sound fresh and natural:\n\n${content}`,
      expand: `Expand the following text with more detail, examples, and explanation. Add depth and substance:\n\n${content}`,
      summarize: `Summarize the following text concisely, capturing the key points:\n\n${content}`,
      improve: `Improve the following text by enhancing clarity, flow, and readability:\n\n${content}`,
      formalize: `Rewrite the following text in a more formal, academic style:\n\n${content}`,
      simplify: `Simplify the following text to make it clearer and easier to understand:\n\n${content}`,
    };

    const prompt = actionPrompts[action];
    if (!prompt) {
      throw new Error(`Unknown action: ${action}`);
    }

    const systemPrompt = `You are an expert writing assistant. ${context ? `Context: ${context}` : ''}`;

    console.log(`Performing ${action} on content...`);
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
          { role: 'user', content: prompt }
        ],
        temperature: action === 'paraphrase' ? 0.8 : 0.7,
        max_tokens: action === 'expand' ? 3000 : 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment and try again.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`Failed to ${action} content`);
    }

    const data = await response.json();
    const enhancedContent = data.choices?.[0]?.message?.content;

    if (!enhancedContent) {
      throw new Error('No enhanced content generated');
    }

    console.log(`Content ${action} completed successfully`);
    return new Response(
      JSON.stringify({ content: enhancedContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in catalyst-ai-enhance-content:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});