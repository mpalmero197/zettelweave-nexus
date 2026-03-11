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

export function useSearchHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(MAX_HISTORY_ITEMS);
    if (data) {
      setHistory(data.map((d: any) => ({
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
    const { data } = await supabase
      .from('search_history')
      .insert({
        user_id: user.id,
        query: item.query,
        intent: item.intent,
        result_count: item.resultCount,
        has_images: item.hasImages || false,
        has_videos: item.hasVideos || false,
        has_citations: item.hasCitations || false,
      })
      .select()
      .single();
    if (data) {
      const newItem: SearchHistoryItem = {
        id: data.id,
        query: data.query,
        intent: data.intent,
        timestamp: new Date(data.created_at).getTime(),
        resultCount: data.result_count,
        hasImages: data.has_images,
        hasVideos: data.has_videos,
        hasCitations: data.has_citations,
      };
      setHistory(prev => [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS));
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    await supabase.from('search_history').delete().eq('user_id', user.id);
    setHistory([]);
  };

  const removeItem = async (id: string) => {
    await supabase.from('search_history').delete().eq('id', id);
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  return { history, addToHistory, clearHistory, removeItem };
}
