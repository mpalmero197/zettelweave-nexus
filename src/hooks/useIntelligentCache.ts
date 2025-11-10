import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface CachePrediction {
  resource_type: string;
  resource_ids: string[];
  confidence_score: number;
  hour_of_day: number;
  day_of_week: number;
}

interface CachedData {
  [key: string]: {
    data: any;
    cachedAt: number;
    expiresAt: number;
  };
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const ANALYSIS_INTERVAL = 10 * 60 * 1000; // Run analysis every 10 minutes

export const useIntelligentCache = () => {
  const { user } = useAuth();
  const [cache, setCache] = useState<CachedData>({});
  const [predictions, setPredictions] = useState<CachePrediction[]>([]);
  const [isPreloading, setIsPreloading] = useState(false);

  // Analyze patterns and get predictions
  const analyzePatternsAndPreload = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('analyze-cache-patterns');
      
      if (error) {
        console.error('Error analyzing patterns:', error);
        return;
      }

      if (data?.predictions) {
        setPredictions(data.predictions);
        await preloadPredictedContent(data.predictions);
      }
    } catch (error) {
      console.error('Error in pattern analysis:', error);
    }
  }, [user]);

  // Pre-load predicted content based on patterns
  const preloadPredictedContent = useCallback(async (predictions: CachePrediction[]) => {
    if (!user || predictions.length === 0) return;

    setIsPreloading(true);

    try {
      // Group predictions by resource type
      const predictionsByType = predictions.reduce((acc, pred) => {
        if (!acc[pred.resource_type]) {
          acc[pred.resource_type] = [];
        }
        acc[pred.resource_type].push(...pred.resource_ids);
        return acc;
      }, {} as Record<string, string[]>);

      // Pre-load each resource type
      for (const [resourceType, resourceIds] of Object.entries(predictionsByType)) {
        const uniqueIds = [...new Set(resourceIds)].slice(0, 20); // Limit to top 20

        if (resourceType === 'card') {
          const { data: cards } = await supabase
            .from('zettel_cards')
            .select('*')
            .in('id', uniqueIds)
            .is('deleted_at', null);

          cards?.forEach(card => {
            const cacheKey = `card_${card.id}`;
            setCache(prev => ({
              ...prev,
              [cacheKey]: {
                data: card,
                cachedAt: Date.now(),
                expiresAt: Date.now() + CACHE_DURATION
              }
            }));
          });
        } else if (resourceType === 'note') {
          const { data: notes } = await supabase
            .from('notes')
            .select('*')
            .in('id', uniqueIds)
            .is('deleted_at', null);

          notes?.forEach(note => {
            const cacheKey = `note_${note.id}`;
            setCache(prev => ({
              ...prev,
              [cacheKey]: {
                data: note,
                cachedAt: Date.now(),
                expiresAt: Date.now() + CACHE_DURATION
              }
            }));
          });
        } else if (resourceType === 'notebook') {
          const { data: notebooks } = await supabase
            .from('notebooks')
            .select('*')
            .in('id', uniqueIds);

          notebooks?.forEach(notebook => {
            const cacheKey = `notebook_${notebook.id}`;
            setCache(prev => ({
              ...prev,
              [cacheKey]: {
                data: notebook,
                cachedAt: Date.now(),
                expiresAt: Date.now() + CACHE_DURATION
              }
            }));
          });
        }
      }

      console.log('Pre-loaded content based on patterns:', Object.keys(predictionsByType));
    } catch (error) {
      console.error('Error pre-loading content:', error);
    } finally {
      setIsPreloading(false);
    }
  }, [user]);

  // Get cached data
  const getCached = useCallback((resourceType: string, resourceId: string) => {
    const cacheKey = `${resourceType}_${resourceId}`;
    const cached = cache[cacheKey];

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    return null;
  }, [cache]);

  // Set cache data
  const setCacheData = useCallback((resourceType: string, resourceId: string, data: any) => {
    const cacheKey = `${resourceType}_${resourceId}`;
    setCache(prev => ({
      ...prev,
      [cacheKey]: {
        data,
        cachedAt: Date.now(),
        expiresAt: Date.now() + CACHE_DURATION
      }
    }));
  }, []);

  // Clear expired cache entries
  const clearExpiredCache = useCallback(() => {
    setCache(prev => {
      const now = Date.now();
      const updated = { ...prev };
      
      Object.keys(updated).forEach(key => {
        if (updated[key].expiresAt <= now) {
          delete updated[key];
        }
      });

      return updated;
    });
  }, []);

  // Initialize and set up periodic analysis
  useEffect(() => {
    if (!user) return;

    // Initial analysis
    analyzePatternsAndPreload();

    // Set up periodic analysis
    const analysisInterval = setInterval(analyzePatternsAndPreload, ANALYSIS_INTERVAL);

    // Set up cache cleanup
    const cleanupInterval = setInterval(clearExpiredCache, 60000); // Every minute

    return () => {
      clearInterval(analysisInterval);
      clearInterval(cleanupInterval);
    };
  }, [user, analyzePatternsAndPreload, clearExpiredCache]);

  return {
    getCached,
    setCacheData,
    predictions,
    isPreloading,
    cacheStats: {
      totalEntries: Object.keys(cache).length,
      validEntries: Object.values(cache).filter(c => c.expiresAt > Date.now()).length
    }
  };
};
