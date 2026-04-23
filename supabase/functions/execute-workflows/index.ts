import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Checking for workflows to execute...");

    // Get active workflows that are due for execution
    const { data: workflows, error: workflowsError } = await supabase
      .from("workflows")
      .select("*")
      .eq("status", "active")
      .or(`next_execution_at.is.null,next_execution_at.lte.${new Date().toISOString()}`);

    if (workflowsError) {
      console.error("Error fetching workflows:", workflowsError);
      throw workflowsError;
    }

    console.log(`Found ${workflows?.length || 0} workflows to execute`);

    const results = [];

    for (const workflow of workflows || []) {
      try {
        console.log(`Executing workflow: ${workflow.name} (${workflow.id})`);

        // Create execution record
        const { data: execution, error: executionError } = await supabase
          .from("workflow_executions")
          .insert({
            workflow_id: workflow.id,
            user_id: workflow.user_id,
            status: "active",
          })
          .select()
          .single();

        if (executionError) {
          console.error("Error creating execution:", executionError);
          continue;
        }

        const config = workflow.config;
        const topics = config.topics || [];
        const keywords = config.keywords || [];
        const maxResults = config.max_results || 5;
        const targetNotebookId = config.target_notebook_id;

        let workflowResults = [];

        // Execute workflow based on type
        if (workflow.workflow_type === "monitor_topic" && topics.length > 0) {
          // Search for each topic
          for (const topic of topics) {
            const searchQuery = keywords.length > 0
              ? `${topic} ${keywords.join(" ")}`
              : topic;

            console.log(`Searching for: ${searchQuery}`);

            // Call web search
            if (PERPLEXITY_API_KEY) {
              try {
                const searchResponse = await fetch("https://api.perplexity.ai/chat/completions", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    model: "sonar-pro",
                    messages: [
                      {
                        role: "system",
                        content: `You are monitoring the topic "${topic}". Find the most relevant and recent information. Focus on: ${keywords.join(", ")}`,
                      },
                      {
                        role: "user",
                        content: searchQuery,
                      },
                    ],
                    max_tokens: 2000,
                    return_images: false,
                    return_related_questions: false,
                    search_recency_filter: "week",
                  }),
                });

                if (searchResponse.ok) {
                  const searchData = await searchResponse.json();
                  const result = searchData.choices?.[0]?.message?.content || "";
                  const citations = searchData.citations || [];

                  if (result) {
                    // Use AI to extract key findings
                    if (LOVABLE_API_KEY) {
                      const analysisResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                              content: `Extract ${maxResults} key findings from the search results. Each finding should be concise and actionable.`,
                            },
                            {
                              role: "user",
                              content: result,
                            },
                          ],
                          tools: [{
                            type: "function",
                            function: {
                              name: "extract_findings",
                              parameters: {
                                type: "object",
                                properties: {
                                  findings: {
                                    type: "array",
                                    items: {
                                      type: "object",
                                      properties: {
                                        title: { type: "string" },
                                        summary: { type: "string" },
                                        relevance_score: { type: "number" },
                                      },
                                    },
                                  },
                                },
                                required: ["findings"],
                              },
                            },
                          }],
                          tool_choice: { type: "function", function: { name: "extract_findings" } },
                        }),
                      });

                      if (analysisResponse.ok) {
                        const analysisData = await analysisResponse.json();
                        const toolCall = analysisData.choices?.[0]?.message?.tool_calls?.[0];
                        
                        if (toolCall?.function?.arguments) {
                          const findings = JSON.parse(toolCall.function.arguments).findings || [];

                          for (const finding of findings.slice(0, maxResults)) {
                            // Save finding to database
                            const { data: workflowResult, error: resultError } = await supabase
                              .from("workflow_results")
                              .insert({
                                workflow_id: workflow.id,
                                execution_id: execution.id,
                                user_id: workflow.user_id,
                                title: finding.title || topic,
                                content: finding.summary || result,
                                source_url: citations[0] || null,
                                metadata: { topic, keywords, citations },
                                relevance_score: finding.relevance_score || 0.8,
                                saved_to_notebook_id: targetNotebookId,
                              })
                              .select()
                              .single();

                            if (!resultError) {
                              // Auto-save to notebook as a note
                              if (targetNotebookId) {
                                await supabase.from("notes").insert({
                                  user_id: workflow.user_id,
                                  notebook_id: targetNotebookId,
                                  title: finding.title || topic,
                                  content: finding.summary || result,
                                  tags: [topic, ...keywords],
                                });
                              }

                              workflowResults.push(workflowResult);
                            }
                          }
                        }
                      }
                    }
                  }
                }
              } catch (searchError) {
                console.error("Search error:", searchError);
              }
            }
          }
        }

        // Update execution as completed
        await supabase
          .from("workflow_executions")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            results_count: workflowResults.length,
            results: workflowResults,
          })
          .eq("id", execution.id);

        // Update workflow
        const nextExecutionAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to 24 hours
        await supabase
          .from("workflows")
          .update({
            last_executed_at: new Date().toISOString(),
            next_execution_at: nextExecutionAt.toISOString(),
            execution_count: (workflow.execution_count || 0) + 1,
          })
          .eq("id", workflow.id);

        results.push({
          workflow_id: workflow.id,
          execution_id: execution.id,
          results_count: workflowResults.length,
        });

        console.log(`Workflow ${workflow.name} completed with ${workflowResults.length} results`);
      } catch (error) {
        console.error(`Error executing workflow ${workflow.id}:`, error);
        
        // Update execution as failed
        await supabase
          .from("workflow_executions")
          .update({
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: error instanceof Error ? error.message : "Unknown error",
          })
          .eq("id", execution.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Executed ${results.length} workflows`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Workflow execution error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
