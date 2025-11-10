import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useOfflineMode } from './useOfflineMode';
import { toast } from 'sonner';
import type { ZettelCard } from '@/types/zettel';

export const useOfflineZettelCards = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { 
    isOnline, 
    queueOperation, 
    storeOffline, 
    getOfflineData 
  } = useOfflineMode();

  // Fetch cards (with offline fallback)
  const { data: cards = [], isLoading, error } = useQuery({
    queryKey: ['zettel-cards', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('No user');

      // Try online fetch first
      if (isOnline) {
        const { data, error } = await supabase
          .from('zettel_cards')
          .select('*')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Store for offline use
        storeOffline('zettel_cards', data);
        return data;
      }

      // Use offline data when offline
      const offlineData = getOfflineData('zettel_cards');
      if (offlineData) {
        return offlineData;
      }

      throw new Error('No offline data available');
    },
    enabled: !!user,
  });

  // Create card mutation (with offline support)
  const createCardMutation = useMutation({
    mutationFn: async (newCard: Partial<ZettelCard>) => {
      if (!user) throw new Error('No user');

      const cardData = {
        title: newCard.title || '',
        content: newCard.content || '',
        category: newCard.category || '',
        number: newCard.number || '',
        tags: newCard.tags || [],
        description: newCard.description,
        linked_cards: [],
        attachments: [],
        user_id: user.id,
        id: `temp_${Date.now()}`, // Temporary ID for offline
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (!isOnline) {
        // Queue for sync and update local cache
        queueOperation('insert', 'zettel_cards', cardData);
        return cardData as any;
      }

      // Online: insert normally
      const { data, error } = await supabase
        .from('zettel_cards')
        .insert([cardData as any])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['zettel-cards'] });
      
      // Update offline cache
      const currentCards = getOfflineData('zettel_cards') || [];
      const updatedCards = Array.isArray(currentCards) ? [...currentCards, data] : [data];
      storeOffline('zettel_cards', updatedCards);

      toast.success(isOnline ? 'Card created' : 'Card saved offline');
    },
    onError: (error) => {
      console.error('Error creating card:', error);
      toast.error('Failed to create card');
    },
  });

  // Update card mutation (with offline support)
  const updateCardMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ZettelCard> }) => {
      if (!user) throw new Error('No user');

      const cardData = {
        ...updates,
        id,
        updated_at: new Date().toISOString(),
      };

      if (!isOnline) {
        // Queue for sync and update local cache
        queueOperation('update', 'zettel_cards', cardData);
        return cardData;
      }

      // Online: update normally
      const { data, error } = await supabase
        .from('zettel_cards')
        .update(cardData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['zettel-cards'] });
      
      // Update offline cache
      const currentCards = getOfflineData('zettel_cards') || [];
      const updatedCards = Array.isArray(currentCards) 
        ? currentCards.map((card: any) => card.id === data.id ? { ...card, ...data } : card)
        : [data];
      storeOffline('zettel_cards', updatedCards);

      toast.success(isOnline ? 'Card updated' : 'Card saved offline');
    },
    onError: (error) => {
      console.error('Error updating card:', error);
      toast.error('Failed to update card');
    },
  });

  // Delete card mutation (with offline support)
  const deleteCardMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('No user');

      if (!isOnline) {
        // Queue for sync
        queueOperation('delete', 'zettel_cards', { id });
        return { id };
      }

      // Online: soft delete
      const { error } = await supabase
        .from('zettel_cards')
        .update({ 
          deleted_at: new Date().toISOString(),
          permanent_delete_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      return { id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['zettel-cards'] });
      
      // Update offline cache
      const currentCards = getOfflineData('zettel_cards') || [];
      const updatedCards = Array.isArray(currentCards)
        ? currentCards.filter((card: any) => card.id !== data.id)
        : [];
      storeOffline('zettel_cards', updatedCards);

      toast.success(isOnline ? 'Card deleted' : 'Card deletion queued');
    },
    onError: (error) => {
      console.error('Error deleting card:', error);
      toast.error('Failed to delete card');
    },
  });

  return {
    cards,
    isLoading,
    error,
    createCard: createCardMutation.mutate,
    updateCard: updateCardMutation.mutate,
    deleteCard: deleteCardMutation.mutate,
    isCreating: createCardMutation.isPending,
    isUpdating: updateCardMutation.isPending,
    isDeleting: deleteCardMutation.isPending,
  };
};
