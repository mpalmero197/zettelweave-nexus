import { useEffect } from 'react';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { useIntelligentCache } from '@/hooks/useIntelligentCache';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const PRELOAD_LIMIT = 30;
const PRELOAD_DELAY_MS = 4000;

function shouldSkipPreload(): boolean {
  const conn: any = (navigator as any).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  if (conn.effectiveType && /^(slow-2g|2g)$/.test(conn.effectiveType)) return true;
  return false;
}

/**
 * Background component that manages offline data synchronization
 * and intelligent pre-loading based on usage patterns.
 *
 * Perf: waits until the browser is idle, respects Save-Data / slow
 * networks, and only fetches after PRELOAD_DELAY_MS so it never
 * competes with initial page render.
 */
export const OfflineDataManager = () => {
  const { user } = useAuth();
  const { isOnline, storeOffline } = useOfflineMode();
  const { setCacheData } = useIntelligentCache();

  useEffect(() => {
    if (!user || !isOnline || shouldSkipPreload()) return;

    let cancelled = false;
    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;

    const preloadEssentialData = async () => {
      if (cancelled) return;
      try {
        const [cardsRes, notesRes, notebooksRes] = await Promise.all([
          supabase.from('zettel_cards').select('*')
            .eq('user_id', user.id).is('deleted_at', null)
            .order('updated_at', { ascending: false }).limit(PRELOAD_LIMIT),
          supabase.from('notes').select('*')
            .eq('user_id', user.id).is('deleted_at', null)
            .order('updated_at', { ascending: false }).limit(PRELOAD_LIMIT),
          supabase.from('notebooks').select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false }).limit(PRELOAD_LIMIT),
        ]);
        if (cancelled) return;

        if (cardsRes.data) {
          storeOffline('zettel_cards', cardsRes.data);
          cardsRes.data.forEach((c: any) => setCacheData('card', c.id, c));
        }
        if (notesRes.data) {
          storeOffline('notes', notesRes.data);
          notesRes.data.forEach((n: any) => setCacheData('note', n.id, n));
        }
        if (notebooksRes.data) {
          storeOffline('notebooks', notebooksRes.data);
          notebooksRes.data.forEach((nb: any) => setCacheData('notebook', nb.id, nb));
        }
      } catch (error) {
        console.error('Error pre-loading data:', error);
      }
    };

    const schedule = () => {
      const ric: any = (window as any).requestIdleCallback;
      if (typeof ric === 'function') {
        idleHandle = ric(preloadEssentialData, { timeout: 6000 });
      } else {
        preloadEssentialData();
      }
    };

    timeoutHandle = window.setTimeout(schedule, PRELOAD_DELAY_MS);

    return () => {
      cancelled = true;
      if (timeoutHandle !== null) clearTimeout(timeoutHandle);
      const cic: any = (window as any).cancelIdleCallback;
      if (idleHandle !== null && typeof cic === 'function') cic(idleHandle);
    };
  }, [user, isOnline, storeOffline, setCacheData]);

  return null;
};
