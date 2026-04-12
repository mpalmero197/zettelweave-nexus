import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

let queryClientModule: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  queryClientModule = await import('@tanstack/react-query');
} catch {}

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
  // Try to get queryClient if available — safe to call unconditionally
  let queryClient: any = null;
  try {
    const { useQueryClient } = require('@tanstack/react-query');
    queryClient = useQueryClient();
  } catch {}

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
          if (opts.queryKeys && queryClient) {
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
