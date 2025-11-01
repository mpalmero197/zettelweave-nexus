import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get the last user message
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    
    console.log("Processing message:", lastUserMessage);
    console.log("Perplexity API key available:", !!PERPLEXITY_API_KEY);
    
    // Determine if this is a knowledge base query or internet search query
    // Knowledge base queries: summarize my notes, find connections, what did I write about X
    // Internet queries: current time, recent events, when was X written, who is Y, what is happening
    const knowledgeBaseKeywords = /\b(my|our|I|we|summarize|connection|link|note|card|wrote|saved|recorded)\b/i;
    const isKnowledgeBaseQuery = knowledgeBaseKeywords.test(lastUserMessage);
    
    console.log("Is knowledge base query:", isKnowledgeBaseQuery);
    
    // Try internet search first for non-knowledge-base queries if Perplexity is available
    if (!isKnowledgeBaseQuery && PERPLEXITY_API_KEY) {
      console.log("Attempting Perplexity search for:", lastUserMessage);
      
      try {
        const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama-3.1-sonar-large-128k-online',
            messages: [
              {
                role: 'system',
                content: 'You are ALICE (Adaptive Learning & Intelligence Companion Engine). Provide accurate, verified, current information in a clear, organized, and summarized format. Always cite sources when presenting facts. Be concise and precise.'
              },
              {
                role: 'user',
                content: lastUserMessage
              }
            ],
            temperature: 0.2,
            top_p: 0.9,
            max_tokens: 2000,
          }),
        });

        console.log("Perplexity response status:", perplexityResponse.status);
        
        if (perplexityResponse.ok) {
          const perplexityData = await perplexityResponse.json();
          const searchResult = perplexityData.choices?.[0]?.message?.content || "I couldn't find relevant information.";
          console.log("Perplexity search successful, returning result");
          
          return new Response(
            JSON.stringify({ response: searchResult }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          const errorText = await perplexityResponse.text();
          console.error("Perplexity API error:", perplexityResponse.status, errorText);
        }
      } catch (perplexityError) {
        console.error("Perplexity error:", perplexityError);
        // Fall through to Lovable AI
      }
    } else {
      console.log("Using Lovable AI - Knowledge base query or no Perplexity key");
    }

    // Build context-aware system prompt
    let contextInfo = "";
    if (context) {
      if (context.cards && context.cards.length > 0) {
        contextInfo += `\n\nUser's Zettelkasten Cards (${context.cards.length} total):\n`;
        contextInfo += context.cards.slice(0, 20).map((c: any) => 
          `- [${c.category}] ${c.title}: ${c.content.substring(0, 200)}${c.content.length > 200 ? '...' : ''}`
        ).join('\n');
        if (context.cards.length > 20) {
          contextInfo += `\n... and ${context.cards.length - 20} more cards`;
        }
      }
      
      if (context.notes && context.notes.length > 0) {
        contextInfo += `\n\nUser's Notes (${context.notes.length} total):\n`;
        contextInfo += context.notes.slice(0, 10).map((n: any) => 
          `- ${n.title}: ${n.content.substring(0, 150)}${n.content.length > 150 ? '...' : ''}`
        ).join('\n');
        if (context.notes.length > 10) {
          contextInfo += `\n... and ${context.notes.length - 10} more notes`;
        }
      }

      if (context.stickyNotes && context.stickyNotes.length > 0) {
        contextInfo += `\n\nUser's Sticky Notes: ${context.stickyNotes.length} items`;
      }

      if (context.scratchPad && context.scratchPad.length > 0) {
        contextInfo += `\n\nUser's Scratch Pad: ${context.scratchPad.length} items`;
      }
    }

    const systemPrompt = `You are ALICE (Adaptive Learning & Intelligence Companion Engine), an intelligent assistant for a knowledge management system called Pendragon. You have access to the user's complete knowledge base including their Zettelkasten cards, notes, sticky notes, and scratch pad.${contextInfo}

Your capabilities:
- Search and reference the user's cards and notes when answering questions
- Find connections and patterns across their knowledge base
- Summarize content and extract key insights
- Provide contextual suggestions based on their existing content
- Help organize and structure their knowledge
- Answer questions using their saved information
- Search the internet for current information when needed

When referencing content:
- Cite specific cards or notes by title
- Quote relevant passages when helpful
- Suggest related content from their knowledge base
- Point out patterns or connections you notice

Keep responses clear, concise, and actionable. Always prioritize information from the user's knowledge base when available.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const assistantResponse = data.choices?.[0]?.message?.content || "I apologize, but I couldn't generate a response.";

    return new Response(
      JSON.stringify({ response: assistantResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
