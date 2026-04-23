import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { mapData, linkedCards, mapTitle } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Build a text representation of the mind map
    const nodes = mapData?.nodes || {};
    const rootId = mapData?.rootId;

    function buildTree(nodeId: string, depth: number): string {
      const node = nodes[nodeId];
      if (!node) return "";
      const indent = "  ".repeat(depth);
      let text = `${indent}- ${node.emoji ? node.emoji + " " : ""}${node.text}`;
      if (node.note) text += `\n${indent}  Note: ${node.note}`;
      
      // Include linked card content if available
      const linkedCardId = node.linked_card_id;
      if (linkedCardId && linkedCards) {
        const card = linkedCards.find((c: any) => c.id === linkedCardId);
        if (card) {
          text += `\n${indent}  [Linked Card: "${card.title}"] ${card.content?.slice(0, 200) || ""}`;
        }
      }

      if (!node.collapsed && node.children) {
        for (const childId of node.children) {
          text += "\n" + buildTree(childId, depth + 1);
        }
      }
      return text;
    }

    const treeText = rootId ? buildTree(rootId, 0) : "No content";
    const nodeCount = Object.keys(nodes).length;

    const systemPrompt = `You are a study guide creator. Given a hierarchical mind map, produce a comprehensive study guide in the style of NotebookLM. The guide should be well-structured markdown with these sections:

## Overview
A 2-3 paragraph summary of the subject matter.

## Key Concepts
Each major branch becomes a section with clear explanations. Use ### for subsections.

## Key Terms
A glossary of important terms extracted from the nodes, formatted as a definition list.

## Review Questions
5-10 questions with answers to test understanding. Format as numbered list with answers below each.

## Study Tips
3-5 practical tips for learning and retaining this material.

Be thorough but concise. Use the node hierarchy to understand topic relationships. If linked cards provide extra context, incorporate that information.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a study guide for this mind map titled "${mapTitle || 'Untitled'}" with ${nodeCount} nodes:\n\n${treeText}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const guide = result.choices?.[0]?.message?.content || "Failed to generate study guide.";

    return new Response(JSON.stringify({ guide }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-study-guide error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
