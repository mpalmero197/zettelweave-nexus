import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BLOCKLIST_SOURCES = [
  {
    name: "disposable-email-domains",
    url: "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf",
    reason: "Auto-scan: disposable email domain",
  },
  {
    name: "phishing-database",
    url: "https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-ACTIVE.txt",
    reason: "Auto-scan: active phishing domain",
  },
];

const MAX_NEW_DOMAINS_PER_RUN = 500;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch existing domains for dedup
    const { data: existingDomains, error: fetchErr } = await supabase
      .from("domain_restrictions")
      .select("domain");

    if (fetchErr) {
      console.error("Failed to fetch existing domains:", fetchErr);
      return new Response(JSON.stringify({ error: "Failed to fetch existing domains" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const existingSet = new Set((existingDomains ?? []).map((d: any) => d.domain.toLowerCase()));

    let totalNew = 0;
    let totalSkipped = 0;
    const sourceSummaries: Record<string, { fetched: number; new: number; errors?: string }> = {};

    for (const source of BLOCKLIST_SOURCES) {
      try {
        const resp = await fetch(source.url, {
          signal: AbortSignal.timeout(15000),
        });

        if (!resp.ok) {
          sourceSummaries[source.name] = { fetched: 0, new: 0, errors: `HTTP ${resp.status}` };
          continue;
        }

        const text = await resp.text();
        const lines = text
          .split("\n")
          .map((l) => l.trim().toLowerCase())
          .filter((l) => l && !l.startsWith("#") && !l.startsWith("//") && l.includes("."));

        sourceSummaries[source.name] = { fetched: lines.length, new: 0 };

        // Filter to only new domains
        const newDomains = lines.filter((d) => !existingSet.has(d));

        // Cap how many we insert per run across all sources
        const remaining = MAX_NEW_DOMAINS_PER_RUN - totalNew;
        if (remaining <= 0) break;

        const batch = newDomains.slice(0, remaining);

        if (batch.length > 0) {
          // Insert in chunks of 200 to avoid payload limits
          for (let i = 0; i < batch.length; i += 200) {
            const chunk = batch.slice(i, i + 200).map((domain) => ({
              domain,
              restriction_type: "banned",
              reason: source.reason,
            }));

            const { error: insertErr } = await supabase
              .from("domain_restrictions")
              .upsert(chunk, { onConflict: "domain", ignoreDuplicates: true });

            if (insertErr) {
              console.error(`Insert error for ${source.name}:`, insertErr);
              sourceSummaries[source.name].errors = insertErr.message;
            }
          }

          // Add to existing set for cross-source dedup
          batch.forEach((d) => existingSet.add(d));
          totalNew += batch.length;
          sourceSummaries[source.name].new = batch.length;
        }

        totalSkipped += newDomains.length - batch.length + (lines.length - newDomains.length);
      } catch (sourceErr) {
        console.error(`Error fetching ${source.name}:`, sourceErr);
        sourceSummaries[source.name] = {
          fetched: 0,
          new: 0,
          errors: sourceErr instanceof Error ? sourceErr.message : "Unknown error",
        };
      }
    }

    console.log(`Blocklist update complete: ${totalNew} new, ${totalSkipped} skipped`, sourceSummaries);

    return new Response(
      JSON.stringify({
        success: true,
        new_domains: totalNew,
        skipped: totalSkipped,
        sources: sourceSummaries,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("update-blocklist error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
