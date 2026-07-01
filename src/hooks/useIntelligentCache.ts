import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface CachePrediction {
  resource_type: string;
  resource_ids: string[];
  confidence_score: number;
  hour_of_day: number;
  day_of_week: number;
}

interface CacheEntry {
  data: any;
  cachedAt: number;
  expiresAt: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const ANALYSIS_INTERVAL = 15 * 60 * 1000; // 15 minutes
const INITIAL_DELAY = 8000; // wait 8s after mount before first analysis
const MAX_ENTRIES = 200; // hard cap to prevent unbounded growth
const CLEANUP_INTERVAL = 2 * 60 * 1000; // 2 minutes

// Respect user data-saver preferences
function shouldSkipPreload(): boolean {
  const conn: any = (navigator as any).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  if (conn.effectiveType && /^(slow-2g|2g)$/.test(conn.effectiveType)) return true;
  return false;
}

export const useIntelligentCache = () => {
  const { user } = useAuth();
  // Mutable cache in a ref — writes don't trigger re-renders
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const [predictions, setPredictions] = useState<CachePrediction[]>([]);
  const [isPreloading, setIsPreloading] = useState(false);
  const [entryCount, setEntryCount] = useState(0);

  // LRU-ish trim: evict oldest entries when over cap
  const trim = useCallback(() => {
    const cache = cacheRef.current;
    if (cache.size <= MAX_ENTRIES) return;
    const overflow = cache.size - MAX_ENTRIES;
    let removed = 0;
    for (const key of cache.keys()) {
      cache.delete(key);
      if (++removed >= overflow) break;
    }
  }, []);

  const setCacheData = useCallback((resourceType: string, resourceId: string, data: any) => {
    const key = `${resourceType}_${resourceId}`;
    cacheRef.current.set(key, {
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION,
    });
    trim();
  }, [trim]);

  const getCached = useCallback((resourceType: string, resourceId: string) => {
    const entry = cacheRef.current.get(`${resourceType}_${resourceId}`);
    if (entry && entry.expiresAt > Date.now()) return entry.data;
    return null;
  }, []);

  const clearExpiredCache = useCallback(() => {
    const now = Date.now();
    const cache = cacheRef.current;
    for (const [key, entry] of cache) {
      if (entry.expiresAt <= now) cache.delete(key);
    }
    setEntryCount(cache.size);
  }, []);

  const preloadPredictedContent = useCallback(async (preds: CachePrediction[]) => {
    if (!user || preds.length === 0 || shouldSkipPreload()) return;
    setIsPreloading(true);
    try {
      const byType = preds.reduce((acc, p) => {
        (acc[p.resource_type] ||= []).push(...p.resource_ids);
        return acc;
      }, {} as Record<string, string[]>);

      for (const [type, ids] of Object.entries(byType)) {
        const unique = [...new Set(ids)].slice(0, 20);
        const table = type === 'card' ? 'zettel_cards'
          : type === 'note' ? 'notes'
          : type === 'notebook' ? 'notebooks'
          : null;
        if (!table) continue;

        const q = (supabase as any).from(table).select('*').in('id', unique);
        const { data } = table === 'notebooks' ? await q : await q.is('deleted_at', null);
        data?.forEach((row: any) => setCacheData(type, row.id, row));
      }
      setEntryCount(cacheRef.current.size);
    } catch (err) {
      console.error('Error pre-loading content:', err);
    } finally {
      setIsPreloading(false);
    }
  }, [user, setCacheData]);

  const analyzePatternsAndPreload = useCallback(async () => {
    if (!user || shouldSkipPreload()) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase.functions.invoke('analyze-cache-patterns', {
        body: {},
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) return;
      if (data?.predictions) {
        setPredictions(data.predictions);
        await preloadPredictedContent(data.predictions);
      }
    } catch (err) {
      console.error('Error in pattern analysis:', err);
    }
  }, [user, preloadPredictedContent]);

  useEffect(() => {
    if (!user) return;

    // Defer first analysis so it doesn't compete with initial render
    let analysisInterval: number | null = null;
    const startTimer = window.setTimeout(() => {
      analyzePatternsAndPreload();
      analysisInterval = window.setInterval(analyzePatternsAndPreload, ANALYSIS_INTERVAL);
    }, INITIAL_DELAY);

    const cleanupInterval = window.setInterval(clearExpiredCache, CLEANUP_INTERVAL);

    return () => {
      clearTimeout(startTimer);
      if (analysisInterval !== null) clearInterval(analysisInterval);
      clearInterval(cleanupInterval);
    };
  }, [user, analyzePatternsAndPreload, clearExpiredCache]);

  return {
    getCached,
    setCacheData,
    predictions,
    isPreloading,
    cacheStats: {
      totalEntries: entryCount,
      validEntries: entryCount, // expired are cleared by CLEANUP_INTERVAL
    },
  };
};
