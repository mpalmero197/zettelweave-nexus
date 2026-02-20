import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_REQUEST_SIZE = 5 * 1024 * 1024;
const MAX_CONTENT_LENGTH = 50000;

const categorizeSchema = z.object({
  title: z.string().max(500),
  content: z.string().max(MAX_CONTENT_LENGTH),
  method: z.enum(['dewey', 'luhmann', 'folgezettel', 'thematic']),
  existingNumbers: z.array(z.string()).max(1000)
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
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Request too large' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    const token = authHeader?.replace('Bearer ', '') || '';
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (!authHeader || authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData = await req.json();
    const validation = categorizeSchema.safeParse(requestData);
    
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request data', details: validation.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { title, content, method, existingNumbers } = validation.data;

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

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (response.status === 402) {
      return new Response(JSON.stringify({ error: 'AI usage limit reached. Please add credits to continue.' }), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!response.ok) {
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

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
      error: 'Failed to categorize card'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
