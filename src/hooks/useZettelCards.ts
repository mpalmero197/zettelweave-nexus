import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ZettelCard } from '@/types/zettel';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const useZettelCards = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cards = [], isLoading, error } = useQuery({
    queryKey: ['zettel-cards', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('zettel_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((card: any) => ({
        id: card.id,
        number: card.number,
        title: card.title,
        description: card.description || '',
        content: card.content,
        category: card.category,
        tags: card.tags || [],
        linkedCards: card.linked_cards || [],
        imageUrl: card.image_url,
        videoUrl: card.video_url,
        created: new Date(card.created_at),
        modified: new Date(card.updated_at)
      })) as ZettelCard[];
    },
    enabled: !!user,
  });

  const createCardMutation = useMutation({
    mutationFn: async (newCard: Omit<ZettelCard, 'id' | 'created' | 'modified'>) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('zettel_cards')
        .insert({
          user_id: user.id,
          number: newCard.number,
          title: newCard.title,
          description: newCard.description,
          content: newCard.content,
          category: newCard.category,
          tags: newCard.tags,
          linked_cards: newCard.linkedCards,
          image_url: newCard.imageUrl,
          video_url: newCard.videoUrl
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zettel-cards'] });
      toast({ title: 'Card created successfully!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error creating card', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const updateCardMutation = useMutation({
    mutationFn: async (updatedCard: ZettelCard) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('zettel_cards')
        .update({
          title: updatedCard.title,
          description: updatedCard.description,
          content: updatedCard.content,
          category: updatedCard.category,
          tags: updatedCard.tags,
          linked_cards: updatedCard.linkedCards,
          image_url: updatedCard.imageUrl,
          video_url: updatedCard.videoUrl
        })
        .eq('id', updatedCard.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zettel-cards'] });
      toast({ title: 'Card updated successfully!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error updating card', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const deleteCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('zettel_cards')
        .delete()
        .eq('id', cardId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zettel-cards'] });
      toast({ title: 'Card deleted successfully!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error deleting card', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const deleteAllCardsMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('zettel_cards')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zettel-cards'] });
      toast({ title: 'All cards deleted successfully!' });
    },
    onError: (error) => {
      toast({ 
        title: 'Error deleting cards', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    cards,
    isLoading,
    error,
    createCard: createCardMutation.mutate,
    updateCard: updateCardMutation.mutate,
    deleteCard: deleteCardMutation.mutate,
    deleteAllCards: deleteAllCardsMutation.mutate,
    isCreating: createCardMutation.isPending,
    isUpdating: updateCardMutation.isPending,
    isDeleting: deleteCardMutation.isPending,
    isDeletingAll: deleteAllCardsMutation.isPending
  };
};