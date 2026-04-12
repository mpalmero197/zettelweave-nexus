import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Subscribe to Supabase Realtime changes on a table and auto-invalidate React Query cache,
 * or call a custom callback for non-React-Query components.
 */
export function useRealtimeSync(
  tableName: string,
  opts: {
    userId?: string;
    queryKeys?: string[][];
    onChanged?: () => void;
  }
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!opts.userId) return;

    const channel = supabase
      .channel(`realtime-${tableName}-${opts.userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          filter: `user_id=eq.${opts.userId}`,
        },
        () => {
          if (opts.queryKeys) {
            opts.queryKeys.forEach((key) => {
              queryClient.invalidateQueries({ queryKey: key });
            });
          }
          opts.onChanged?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, opts.userId]);
}
