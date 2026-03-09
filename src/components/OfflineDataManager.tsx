import { useEffect } from 'react';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { useIntelligentCache } from '@/hooks/useIntelligentCache';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Background component that manages offline data synchronization
 * and intelligent pre-loading based on usage patterns
 */
export const OfflineDataManager = () => {
  const { user } = useAuth();
  const { isOnline, storeOffline } = useOfflineMode();
  const { getCached, setCacheData } = useIntelligentCache();

  useEffect(() => {
    if (!user || !isOnline) return;

    // Pre-load frequently accessed data when online
    const preloadEssentialData = async () => {
      try {
        // Pre-load recent cards
        const { data: recentCards } = await supabase
          .from('zettel_cards')
          .select('*')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .limit(50);

        if (recentCards) {
          storeOffline('zettel_cards', recentCards);
          recentCards.forEach(card => {
            setCacheData('card', card.id, card);
          });
        }

        // Pre-load recent notes
        const { data: recentNotes } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .limit(50);

        if (recentNotes) {
          storeOffline('notes', recentNotes);
          recentNotes.forEach(note => {
            setCacheData('note', note.id, note);
          });
        }

        // Pre-load notebooks
        const { data: notebooks } = await supabase
          .from('notebooks')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (notebooks) {
          storeOffline('notebooks', notebooks);
          notebooks.forEach(notebook => {
            setCacheData('notebook', notebook.id, notebook);
          });
        }
      } catch (error) {
        console.error('Error pre-loading data:', error);
      }
    };

    preloadEssentialData();
  }, [user, isOnline]);

  // This component doesn't render anything
  return null;
};
