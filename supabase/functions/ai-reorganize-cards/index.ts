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

function extractJsonArray(raw: string): unknown[] {
  // Remove markdown fences
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // Find array boundaries
  const start = cleaned.indexOf('[');
  const end = cleaned.lastIndexOf(']');

  if (start === -1) throw new Error('No JSON array found in response');

  cleaned = end > start ? cleaned.substring(start, end + 1) : cleaned.substring(start);

  // Remove control characters
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, (ch) => ch === '\n' || ch === '\t' ? ch : '');

  try {
    return JSON.parse(cleaned);
  } catch {
    // Fix trailing commas
    cleaned = cleaned.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

    // Check for truncation and attempt repair
    const openBrackets = (cleaned.match(/\[/g) || []).length;
    const closeBrackets = (cleaned.match(/\]/g) || []).length;
    const openBraces = (cleaned.match(/\{/g) || []).length;
    const closeBraces = (cleaned.match(/\}/g) || []).length;

    if (openBraces > closeBraces || openBrackets > closeBrackets) {
      console.warn(`JSON truncated: braces ${openBraces}/${closeBraces}, brackets ${openBrackets}/${closeBrackets}`);
      // Trim to last complete object
      const lastComplete = cleaned.lastIndexOf('}');
      if (lastComplete > 0) {
        cleaned = cleaned.substring(0, lastComplete + 1);
        // Close any remaining open brackets
        let diff = (cleaned.match(/\[/g) || []).length - (cleaned.match(/\]/g) || []).length;
        while (diff-- > 0) cleaned += ']';
      }
    }

    return JSON.parse(cleaned);
  }
}

const BATCH_SIZE = 25;

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

    if (!lovableApiKey) {
      return respond(false, { error: 'AI service not configured' });
    }

    const organizationMethodDescriptions: Record<string, string> = {
      dewey: `Dewey Decimal Classification (000-999): Use the MOST SPECIFIC Dewey number possible.
Main classes: 000 Computer Science, 100 Philosophy, 200 Religion, 300 Social Sciences, 400 Language, 500 Science, 600 Technology, 700 Arts, 800 Literature, 900 History.`,
      luhmann: "Luhmann System: Alphanumeric branching (1, 1a, 1a1, 1a2, 1b, 2, 2a, etc.)",
      folgezettel: "Folgezettel System: Sequential decimal numbering (1.1, 1.2, 1.2.1, 1.2.2, 2.1, etc.)",
      thematic: "Thematic Organization: Topic-based prefixes (PHIL-001, HIST-001, SCI-001, etc.)"
    };

    // Process in batches to avoid token limits
    const batches: any[][] = [];
    for (let i = 0; i < cards.length; i += BATCH_SIZE) {
      batches.push(cards.slice(i, i + BATCH_SIZE));
    }

    const allReorganized: any[] = [];

    for (const batch of batches) {
      // Send only essential fields to reduce token usage
      const slimCards = batch.map((c: any) => ({
        id: c.id,
        title: c.title,
        content: (c.content || '').substring(0, 300),
        number: c.number,
        category: c.category,
        tags: c.tags || [],
        linkedCards: c.linkedCards || [],
      }));

      const systemPrompt = `You are a knowledge organization AI. Convert cards from ${fromMethod.toUpperCase()} to ${toMethod.toUpperCase()}.

TO SYSTEM: ${organizationMethodDescriptions[toMethod]}

RULES:
1. Only change: number, category, and linkedCards
2. Preserve id, title, content, tags exactly
3. Return a JSON array of objects with fields: id, title, content, number, category, tags, linkedCards
4. NO markdown fences, NO explanation — ONLY the raw JSON array`;

      const userPrompt = `Convert these ${batch.length} cards:\n${JSON.stringify(slimCards)}`;

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
          max_tokens: 16000,
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
        console.error('AI gateway error:', response.status, errorText);
        return respond(false, { error: `AI gateway error: ${response.status}` });
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      let batchResult: any[];
      try {
        batchResult = extractJsonArray(aiResponse) as any[];
      } catch (parseError) {
        console.error('JSON parse failed for batch. Raw response length:', aiResponse.length);
        console.error('Parse error:', parseError);
        return respond(false, { error: `AI returned invalid JSON. Try again or reduce card count.` });
      }

      if (!Array.isArray(batchResult)) {
        return respond(false, { error: 'AI response is not an array of cards' });
      }

      // Merge back any fields the AI stripped
      const merged = batchResult.map((rc: any) => {
        const original = batch.find((c: any) => c.id === rc.id);
        if (!original) return rc;
        return {
          ...original,
          number: rc.number ?? original.number,
          category: rc.category ?? original.category,
          linkedCards: rc.linkedCards ?? original.linkedCards ?? [],
        };
      });

      allReorganized.push(...merged);
    }

    // Validate we got cards back
    if (allReorganized.length === 0) {
      return respond(false, { error: 'No cards were returned from reorganization' });
    }

    // If some cards were lost in truncation, fill them with originals
    if (allReorganized.length < cards.length) {
      console.warn(`AI returned ${allReorganized.length}/${cards.length} cards — filling gaps`);
      const returnedIds = new Set(allReorganized.map((c: any) => c.id));
      for (const card of cards) {
        if (!returnedIds.has(card.id)) {
          allReorganized.push(card);
        }
      }
    }

    return respond(true, { reorganizedCards: allReorganized });

  } catch (error) {
    console.error('Error in ai-reorganize-cards function:', error);
    return respond(false, { error: error instanceof Error ? error.message : 'Failed to reorganize cards' });
  }
});
