import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EDGE_FUNCTIONS = [
  'check-subscription',
  'ai-search',
  'ai-assistant-chat',
  'ai-categorize-card',
  'ai-edit-card',
  'ai-reorganize-cards',
  'analyze-cache-patterns',
  'catalyst-ai-enhance-content',
  'catalyst-ai-generate-chapter',
  'catalyst-ai-generate-citations',
  'check-plagiarism',
  'classify-intent',
  'create-checkout',
  'customer-portal',
  'dictionary-lookup',
  'execute-workflows',
  'export-user-data',
  'fetch-url-content',
  'find-similar-content',
  'generate-embedding',
  'generate-image',
  'generate-writing-suggestions',
  'scratchpad-sync',
  'suggest-smart-links',
  'transcribe-audio',
  'transcribe-audio-ai',
  'web-search',
];

const DATABASE_TABLES = [
  'profiles',
  'zettel_cards',
  'notes',
  'notebooks',
  'files',
  'attachments',
  'recordings',
  'calendar_events',
  'project_tasks',
  'workflows',
  'workflow_executions',
  'workflow_results',
  'catalyst_documents',
  'catalyst_chapters',
  'catalyst_citations',
  'feature_requests',
  'error_reports',
  'subscriptions',
  'user_preferences',
  'dashboard_layouts',
];

interface TestResult {
  name: string;
  status: 'success' | 'error';
  duration: number;
  error?: string;
  details?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("[TOOL-TESTS] Starting automated tool tests...");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create admin client for storing results
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create regular client for testing
    const testClient = createClient(supabaseUrl, supabaseAnonKey);

    const results: TestResult[] = [];

    // Test auth system
    console.log("[TOOL-TESTS] Testing auth system...");
    const authStart = Date.now();
    try {
      const { error } = await testClient.auth.getSession();
      results.push({
        name: 'auth:session',
        status: error ? 'error' : 'success',
        duration: Date.now() - authStart,
        error: error?.message,
        details: 'Auth system reachable'
      });
    } catch (e: any) {
      results.push({
        name: 'auth:session',
        status: 'error',
        duration: Date.now() - authStart,
        error: e.message
      });
    }

    // Test storage
    console.log("[TOOL-TESTS] Testing storage system...");
    const storageStart = Date.now();
    try {
      const { data, error } = await adminClient.storage.listBuckets();
      results.push({
        name: 'storage:buckets',
        status: error ? 'error' : 'success',
        duration: Date.now() - storageStart,
        error: error?.message,
        details: `${data?.length || 0} buckets available`
      });
    } catch (e: any) {
      results.push({
        name: 'storage:buckets',
        status: 'error',
        duration: Date.now() - storageStart,
        error: e.message
      });
    }

    // Test database tables
    console.log("[TOOL-TESTS] Testing database tables...");
    for (const table of DATABASE_TABLES) {
      const tableStart = Date.now();
      try {
        const { count, error } = await adminClient
          .from(table)
          .select('*', { count: 'exact', head: true });

        results.push({
          name: `db:${table}`,
          status: error ? 'error' : 'success',
          duration: Date.now() - tableStart,
          error: error?.message,
          details: error ? undefined : `Table accessible (${count ?? 0} rows)`
        });
      } catch (e: any) {
        results.push({
          name: `db:${table}`,
          status: 'error',
          duration: Date.now() - tableStart,
          error: e.message
        });
      }
    }

    // Test edge functions (ping only)
    console.log("[TOOL-TESTS] Testing edge functions...");
    for (const funcName of EDGE_FUNCTIONS) {
      // Skip testing self
      if (funcName === 'run-tool-tests') continue;
      
      const funcStart = Date.now();
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/${funcName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ test: true, ping: true }),
        });

        const duration = Date.now() - funcStart;

        // Consider 4xx errors as "function working but validation failed" which is expected
        if (response.ok || response.status === 400 || response.status === 401 || response.status === 422) {
          results.push({
            name: funcName,
            status: 'success',
            duration,
            details: `Function reachable (${response.status})`
          });
        } else {
          results.push({
            name: funcName,
            status: 'error',
            duration,
            error: `HTTP ${response.status}`
          });
        }
      } catch (e: any) {
        results.push({
          name: funcName,
          status: 'error',
          duration: Date.now() - funcStart,
          error: e.message || 'Connection failed'
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    const passed = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;

    console.log(`[TOOL-TESTS] Tests complete: ${passed} passed, ${failed} failed in ${totalDuration}ms`);

    // Parse triggered_by from request body
    let triggeredBy = 'scheduled';
    try {
      const body = await req.json();
      if (body?.triggered_by) {
        triggeredBy = body.triggered_by;
      }
    } catch {
      // No body or invalid JSON, use default
    }

    // Store results in database
    const { error: insertError } = await adminClient
      .from('tool_test_history')
      .insert({
        total_tests: results.length,
        passed,
        failed,
        duration_ms: totalDuration,
        results,
        triggered_by: triggeredBy
      });

    if (insertError) {
      console.error("[TOOL-TESTS] Failed to store results:", insertError);
    } else {
      console.log("[TOOL-TESTS] Results stored successfully");
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_tests: results.length,
        passed,
        failed,
        duration_ms: totalDuration,
        results
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      }
    );

  } catch (error: any) {
    console.error("[TOOL-TESTS] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});
