import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    console.log('Analyzing cache patterns for user:', user.id);

    // Get current time info
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay();

    // Analyze activity logs from the past 30 days
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const { data: activityLogs, error: logsError } = await supabaseClient
      .from('user_activity_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (logsError) {
      console.error('Error fetching activity logs:', logsError);
      throw logsError;
    }

    console.log(`Found ${activityLogs?.length || 0} activity logs`);

    // Analyze patterns for each hour/day combination
    const patterns: Record<string, {
      resources: Record<string, { id: string; type: string; count: number }>;
      totalAccess: number;
    }> = {};

    activityLogs?.forEach(log => {
      const key = `${log.hour_of_day}_${log.day_of_week}`;
      if (!patterns[key]) {
        patterns[key] = { resources: {}, totalAccess: 0 };
      }
      
      patterns[key].totalAccess++;
      
      if (log.resource_id && log.resource_type) {
        const resourceKey = `${log.resource_type}_${log.resource_id}`;
        if (!patterns[key].resources[resourceKey]) {
          patterns[key].resources[resourceKey] = {
            id: log.resource_id,
            type: log.resource_type,
            count: 0
          };
        }
        patterns[key].resources[resourceKey].count++;
      }
    });

    // Generate predictions for each hour/day combination with sufficient data
    const predictions = [];
    const minAccessThreshold = 3; // Minimum accesses to consider a pattern

    for (const [timeKey, pattern] of Object.entries(patterns)) {
      if (pattern.totalAccess < minAccessThreshold) continue;

      const [hour, day] = timeKey.split('_').map(Number);
      
      // Group resources by type
      const resourcesByType: Record<string, string[]> = {};
      
      // Sort resources by frequency
      const sortedResources = Object.values(pattern.resources)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 most accessed resources

      sortedResources.forEach(resource => {
        if (!resourcesByType[resource.type]) {
          resourcesByType[resource.type] = [];
        }
        resourcesByType[resource.type].push(resource.id);
      });

      // Create predictions for each resource type
      for (const [resourceType, resourceIds] of Object.entries(resourcesByType)) {
        const confidence = Math.min(
          sortedResources.filter(r => r.type === resourceType)
            .reduce((sum, r) => sum + r.count, 0) / pattern.totalAccess,
          1.0
        );

        predictions.push({
          user_id: user.id,
          resource_type: resourceType,
          resource_ids: resourceIds,
          hour_of_day: hour,
          day_of_week: day,
          confidence_score: confidence
        });
      }
    }

    console.log(`Generated ${predictions.length} predictions`);

    // Upsert predictions
    if (predictions.length > 0) {
      const { error: upsertError } = await supabaseClient
        .from('cache_predictions')
        .upsert(predictions, {
          onConflict: 'user_id,resource_type,hour_of_day,day_of_week'
        });

      if (upsertError) {
        console.error('Error upserting predictions:', upsertError);
        throw upsertError;
      }
    }

    // Get predictions for current time window (±2 hours)
    const hourWindow = [-2, -1, 0, 1, 2].map(offset => 
      (currentHour + offset + 24) % 24
    );

    const { data: currentPredictions, error: predictionsError } = await supabaseClient
      .from('cache_predictions')
      .select('*')
      .eq('user_id', user.id)
      .eq('day_of_week', currentDay)
      .in('hour_of_day', hourWindow)
      .gte('confidence_score', 0.3)
      .order('confidence_score', { ascending: false });

    if (predictionsError) {
      console.error('Error fetching predictions:', predictionsError);
      throw predictionsError;
    }

    return new Response(
      JSON.stringify({
        predictions: currentPredictions || [],
        analysis: {
          totalLogs: activityLogs?.length || 0,
          patternsFound: Object.keys(patterns).length,
          predictionsGenerated: predictions.length,
          currentTimeWindow: {
            hour: currentHour,
            day: currentDay
          }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-cache-patterns function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
