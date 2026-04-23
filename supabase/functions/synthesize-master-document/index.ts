import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, subject_hint } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if user has auto_master_docs enabled
    const { data: profile } = await supabase
      .from("profiles")
      .select("auto_master_docs")
      .eq("user_id", user_id)
      .single();

    if (!profile?.auto_master_docs) {
      return new Response(JSON.stringify({ skipped: true, reason: "auto_master_docs disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all user content
    const [cardsRes, notesRes, docsRes] = await Promise.all([
      supabase.from("zettel_cards").select("id, title, content, category, tags").eq("user_id", user_id).is("deleted_at", null).limit(200),
      supabase.from("notes").select("id, title, content, tags").eq("user_id", user_id).is("deleted_at", null).limit(200),
      supabase.from("catalyst_documents").select("id, title, content").eq("user_id", user_id).is("deleted_at", null).eq("is_master_document", false).limit(100),
    ]);

    const cards = cardsRes.data || [];
    const notes = notesRes.data || [];
    const docs = docsRes.data || [];

    const totalItems = cards.length + notes.length + docs.length;
    if (totalItems < 3) {
      return new Response(JSON.stringify({ skipped: true, reason: "not enough content" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build content summary for clustering
    const contentSummary = [
      ...cards.map(c => `[Card] ${c.title}: ${(c.content || '').substring(0, 300)} (tags: ${(c.tags || []).join(', ')})`),
      ...notes.map(n => `[Note] ${n.title}: ${(n.content || '').substring(0, 300)} (tags: ${(n.tags || []).join(', ')})`),
      ...docs.map(d => `[Document] ${d.title}: ${(d.content || '').substring(0, 300)}`),
    ].join('\n');

    // Step 1: Ask AI to identify subject clusters
    const clusterPrompt = subject_hint
      ? `Focus on the subject "${subject_hint}". List all items related to it.`
      : `Analyze these items and identify distinct subject clusters (topics with 3+ related items). Return JSON array: [{"subject": "Topic Name", "keywords": ["k1","k2"], "item_indices": [0,1,5]}]`;

    const clusterResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a knowledge clustering expert. Return ONLY valid JSON arrays. No markdown fences.",
          },
          {
            role: "user",
            content: `${clusterPrompt}\n\nContent items:\n${contentSummary}`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!clusterResponse.ok) {
      throw new Error(`AI clustering failed: ${clusterResponse.status}`);
    }

    const clusterData = await clusterResponse.json();
    const clusterText = clusterData.choices?.[0]?.message?.content || "[]";

    let clusters: Array<{ subject: string; keywords: string[]; item_indices: number[] }>;
    try {
      const cleaned = clusterText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      clusters = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse clusters:", clusterText);
      return new Response(JSON.stringify({ error: "Failed to parse subject clusters" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter to clusters with 3+ items
    clusters = clusters.filter(c => c.item_indices && c.item_indices.length >= 3);

    if (clusters.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "no clusters with 3+ items" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const allContent = [
      ...cards.map(c => ({ type: 'Card', title: c.title, content: c.content || '' })),
      ...notes.map(n => ({ type: 'Note', title: n.title, content: n.content || '' })),
      ...docs.map(d => ({ type: 'Document', title: d.title, content: d.content || '' })),
    ];

    const results: string[] = [];

    for (const cluster of clusters.slice(0, 5)) {
      // Check if master doc subject already exists
      const { data: existingSubject } = await supabase
        .from("master_document_subjects")
        .select("id, catalyst_document_id")
        .eq("user_id", user_id)
        .eq("subject", cluster.subject)
        .single();

      // Gather source content for this cluster
      const sourceContent = cluster.item_indices
        .filter(i => i < allContent.length)
        .map(i => allContent[i])
        .map(item => `## Source: ${item.title} (${item.type})\n${item.content}`)
        .join('\n\n---\n\n');

      let existingDocContent = '';
      if (existingSubject?.catalyst_document_id) {
        const { data: existingDoc } = await supabase
          .from("catalyst_documents")
          .select("content")
          .eq("id", existingSubject.catalyst_document_id)
          .single();
        existingDocContent = existingDoc?.content || '';
      }

      // Step 2: Synthesize master document
      const synthesisPrompt = existingDocContent
        ? `You are updating an existing master document about "${cluster.subject}". Merge the new source materials with the existing document. Improve structure, add new information, and enhance writing quality. Keep all existing information unless contradicted by newer sources.\n\nEXISTING DOCUMENT:\n${existingDocContent}\n\nNEW SOURCE MATERIALS:\n${sourceContent}`
        : `Create a comprehensive master document about "${cluster.subject}" from these source materials. Use H1 for the title, H2-H3 for sections. Cite source titles. Write in clear, organized prose.\n\nSOURCE MATERIALS:\n${sourceContent}`;

      const synthesisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: "You are a knowledge synthesizer creating comprehensive, well-structured documents. Write in rich HTML format suitable for a document editor. Use <h1>, <h2>, <h3>, <p>, <ul>, <li>, <blockquote> tags. Do not use markdown.",
            },
            { role: "user", content: synthesisPrompt },
          ],
          temperature: 0.4,
          max_tokens: 4000,
        }),
      });

      if (!synthesisResponse.ok) {
        console.error(`Synthesis failed for ${cluster.subject}: ${synthesisResponse.status}`);
        continue;
      }

      const synthesisData = await synthesisResponse.json();
      const synthesizedContent = synthesisData.choices?.[0]?.message?.content || '';

      if (!synthesizedContent) continue;

      const wordCount = synthesizedContent.split(/\s+/).length;

      if (existingSubject?.catalyst_document_id) {
        // Update existing document
        await supabase
          .from("catalyst_documents")
          .update({
            content: synthesizedContent,
            word_count: wordCount,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingSubject.catalyst_document_id);

        await supabase
          .from("master_document_subjects")
          .update({
            last_synthesized_at: new Date().toISOString(),
            source_count: cluster.item_indices.length,
            keywords: cluster.keywords || [],
          })
          .eq("id", existingSubject.id);

        results.push(`Updated: ${cluster.subject}`);
      } else {
        // Create new catalyst document
        const { data: newDoc, error: docError } = await supabase
          .from("catalyst_documents")
          .insert({
            user_id,
            title: `Master: ${cluster.subject}`,
            content: synthesizedContent,
            selected_source: "master_synthesis",
            theme_id: "default",
            word_count: wordCount,
            is_master_document: true,
          })
          .select("id")
          .single();

        if (docError || !newDoc) {
          console.error("Failed to create catalyst doc:", docError);
          continue;
        }

        // Create or update subject tracker
        if (existingSubject) {
          await supabase
            .from("master_document_subjects")
            .update({
              catalyst_document_id: newDoc.id,
              last_synthesized_at: new Date().toISOString(),
              source_count: cluster.item_indices.length,
              keywords: cluster.keywords || [],
            })
            .eq("id", existingSubject.id);
        } else {
          await supabase.from("master_document_subjects").insert({
            user_id,
            subject: cluster.subject,
            keywords: cluster.keywords || [],
            catalyst_document_id: newDoc.id,
            last_synthesized_at: new Date().toISOString(),
            source_count: cluster.item_indices.length,
          });
        }

        results.push(`Created: ${cluster.subject}`);
      }
    }

    // Mark processed queue items as completed
    await supabase
      .from("synthesis_queue")
      .update({ status: "completed" })
      .eq("user_id", user_id)
      .eq("status", "pending");

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Synthesis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
