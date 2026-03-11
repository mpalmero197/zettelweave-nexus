import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SearchHistoryItem {
  id: string;
  query: string;
  intent: string;
  timestamp: number;
  resultCount: number;
  hasImages?: boolean;
  hasVideos?: boolean;
  hasCitations?: boolean;
}

const MAX_HISTORY_ITEMS = 50;

// Helper for table not yet in generated types
const historyTable = () => supabase.from('search_history' as any);

export function useSearchHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await historyTable()
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(MAX_HISTORY_ITEMS);
    if (data) {
      setHistory((data as any[]).map((d: any) => ({
        id: d.id,
        query: d.query,
        intent: d.intent,
        timestamp: new Date(d.created_at).getTime(),
        resultCount: d.result_count,
        hasImages: d.has_images,
        hasVideos: d.has_videos,
        hasCitations: d.has_citations,
      })));
    }
  }, [user]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const addToHistory = async (item: Omit<SearchHistoryItem, 'id' | 'timestamp'>) => {
    if (!user) return;
    const { data } = await historyTable()
      .insert({
        user_id: user.id,
        query: item.query,
        intent: item.intent,
        result_count: item.resultCount,
        has_images: item.hasImages || false,
        has_videos: item.hasVideos || false,
        has_citations: item.hasCitations || false,
      } as any)
      .select()
      .single();
    if (data) {
      const d = data as any;
      const newItem: SearchHistoryItem = {
        id: d.id,
        query: d.query,
        intent: d.intent,
        timestamp: new Date(d.created_at).getTime(),
        resultCount: d.result_count,
        hasImages: d.has_images,
        hasVideos: d.has_videos,
        hasCitations: d.has_citations,
      };
      setHistory(prev => [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS));
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    await historyTable().delete().eq('user_id', user.id);
    setHistory([]);
  };

  const removeItem = async (id: string) => {
    await historyTable().delete().eq('id', id);
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  return { history, addToHistory, clearHistory, removeItem };
}
