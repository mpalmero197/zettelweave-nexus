import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation
function validateChatInput(messages: any, context: any): { valid: boolean; error?: string } {
  if (!Array.isArray(messages)) {
    return { valid: false, error: 'Messages must be an array' };
  }
  if (messages.length === 0) {
    return { valid: false, error: 'Messages array cannot be empty' };
  }
  if (messages.length > 50) {
    return { valid: false, error: 'Messages array cannot exceed 50 messages' };
  }
  
  for (const msg of messages) {
    if (!msg.role || !msg.content) {
      return { valid: false, error: 'Each message must have role and content' };
    }
    if (!['system', 'user', 'assistant'].includes(msg.role)) {
      return { valid: false, error: 'Invalid message role' };
    }
    if (typeof msg.content !== 'string') {
      return { valid: false, error: 'Message content must be a string' };
    }
    if (msg.content.length > 4000) {
      return { valid: false, error: 'Message content cannot exceed 4000 characters' };
    }
  }
  
  if (context) {
    if (context.cards && (!Array.isArray(context.cards) || context.cards.length > 100)) {
      return { valid: false, error: 'Context cards must be an array with max 100 items' };
    }
    if (context.notes && (!Array.isArray(context.notes) || context.notes.length > 100)) {
      return { valid: false, error: 'Context notes must be an array with max 100 items' };
    }
  }
  
  return { valid: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context, useInternet } = await req.json();
    
    // Validate input
    const validation = validateChatInput(messages, context);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get the last user message
    const lastUserMessage = messages[messages.length - 1]?.content || "";
    
    // Log only metadata, not user content
    console.log("Chat request", {
      messageCount: messages.length,
      lastMessageLength: lastUserMessage.length,
      hasContext: !!context,
      useInternet: !!useInternet,
      timestamp: new Date().toISOString()
    });
    console.log("Perplexity API key available:", !!PERPLEXITY_API_KEY);
    // Determine if this is a knowledge base query or internet search query
    // Knowledge base queries contain specific keywords about user's personal content
    const knowledgeBaseKeywords = /\b(my|our|I have|I've|we have|we've|summarize my|connection between my|link my|in my notes|in my cards|I wrote|I saved|I recorded|my notebook|show me my|find in my)\b/i;
    const isKnowledgeBaseQuery = knowledgeBaseKeywords.test(lastUserMessage);
    
    // Internet search indicators - current events, factual queries, real-time data, etc.
    const internetPatterns = [
      /\b(search|google|look up|lookup|find out)\b/i,
      /\b(current|today|now|latest|recent|this week|this month|this year)\b/i,
      /\b(who is|what is|when is|when did|when was|where is|why is|how to|how do|how does|how many)\b/i,
      /\b(news|weather|time|stock|price|score|result)\b/i,
      /\bwhat time is it\b/i,
      /\bdefine|explain|describe\b/i,
      /\b(flights?|hotels?|restaurants?|movies?|events?)\s+(in|near|at)\b/i,
      /\b(directions to|route to|how to get to)\b/i,
      /\b(population of|capital of|president of|located in)\b/i
    ];
    const hasInternetKeywords = internetPatterns.some(pattern => pattern.test(lastUserMessage));
    
    // Use internet search if: explicitly requested OR (has internet keywords AND is not specifically about user's knowledge base)
    const shouldSearchInternet = useInternet || (hasInternetKeywords && !isKnowledgeBaseQuery);
    
    console.log("Is knowledge base query:", isKnowledgeBaseQuery);
    console.log("Has internet keywords:", hasInternetKeywords);
    console.log("Should search internet:", shouldSearchInternet);
    
    // Try internet search first if Perplexity is available and appropriate
    if (shouldSearchInternet && PERPLEXITY_API_KEY) {
      console.log("Attempting Perplexity search for:", lastUserMessage);
      
      try {
        const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'sonar-pro',
            messages: [
              {
                role: 'system',
                content: 'You are ALICE (Adaptive Learning & Intelligence Companion Engine). Provide accurate, verified, current information in a clear, organized, and summarized format. Always cite sources when presenting facts. Be concise and precise. When relevant, provide 3 suggested follow-up questions at the end formatted as: "\n\n**Suggested searches:**\n1. [question]\n2. [question]\n3. [question]"'
              },
              {
                role: 'user',
                content: lastUserMessage
              }
            ],
            temperature: 0.2,
            top_p: 0.9,
            max_tokens: 2000,
            return_images: true,
            return_related_questions: true
          }),
        });

        console.log("Perplexity response status:", perplexityResponse.status);
        
        if (perplexityResponse.ok) {
          const perplexityData = await perplexityResponse.json();
          console.log("Perplexity response received", {
            hasChoices: perplexityData?.choices?.length > 0,
            timestamp: new Date().toISOString()
          });
          
          const searchResult = perplexityData.choices?.[0]?.message?.content || "I couldn't find relevant information.";
          const images = perplexityData.images || [];
          const citations = perplexityData.citations || [];
          const relatedQuestions = perplexityData.related_questions || [];
          
          console.log("Images found:", images.length);
          console.log("Citations found:", citations.length);
          console.log("Related questions found:", relatedQuestions.length);
          console.log("Perplexity search successful, returning result");
          
          return new Response(
            JSON.stringify({ 
              response: searchResult,
              source: "internet_search",
              query: lastUserMessage,
              images: images,
              citations: citations,
              relatedQuestions: relatedQuestions
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          const errorText = await perplexityResponse.text();
          console.error("Perplexity API error:", perplexityResponse.status, errorText);
          // Fall through to Lovable AI with knowledge base
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
      JSON.stringify({ 
        response: assistantResponse,
        source: "knowledge_base"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
