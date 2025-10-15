import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ZettelCard, ORGANIZATION_METHODS } from '@/types/zettel';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { generateZettelNumber, categorizeContent } from '@/utils/deweySystem';
import { sanitizeCardInput, validateZettelCard, createCardLimiter } from '@/utils/security';

export const useZettelCards = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [organizationMethod, setOrganizationMethod] = useState<string>(() => {
    return localStorage.getItem('zettel-organization-method') || 'dewey';
  });

  const { data: cards = [], isLoading, error } = useQuery({
    queryKey: ['zettel-cards', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('zettel_cards')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
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
        created: card.created_at,
        modified: card.updated_at
      })) as ZettelCard[];
    },
    enabled: !!user,
  });

  // Helper function to calculate similarity between two cards
  const calculateCardSimilarity = (content1: string, content2: string): number => {
    const c1 = content1.toLowerCase().trim();
    const c2 = content2.toLowerCase().trim();
    
    if (c1 === c2) return 1;
    
    const words1 = new Set(c1.split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(c2.split(/\s+/).filter(w => w.length > 3));
    
    if (words1.size === 0 || words2.size === 0) return 0;
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  };

  const createCardMutation = useMutation({
    mutationFn: async (newCard: Omit<ZettelCard, 'id' | 'created' | 'modified'>) => {
      if (!user) throw new Error('User not authenticated');

      // Rate limiting
      if (!createCardLimiter.isAllowed(user.id)) {
        throw new Error('Rate limit exceeded. Please wait before creating more cards.');
      }

      // Validate and sanitize input
      const validation = validateZettelCard(newCard);
      if (!validation.valid) {
        throw new Error(`Invalid card data: ${validation.errors.join(', ')}`);
      }

      // Sanitize content to prevent XSS
      const sanitizedCard = {
        ...newCard,
        title: sanitizeCardInput(newCard.title),
        content: sanitizeCardInput(newCard.content),
        description: sanitizeCardInput(newCard.description || ''),
      };

      // Check for duplicate cards automatically (only if title AND content match)
      const newContent = `${sanitizedCard.title} ${sanitizedCard.content}`;
      let duplicateCard: ZettelCard | null = null;
      let highestSimilarity = 0;
      
      for (const existingCard of cards) {
        // Check if titles are identical or very similar
        const titleSimilarity = calculateCardSimilarity(
          sanitizedCard.title.toLowerCase(), 
          existingCard.title.toLowerCase()
        );
        
        // Only consider it a duplicate if titles are very similar (>=0.9)
        if (titleSimilarity >= 0.9) {
          const existingContent = `${existingCard.title} ${existingCard.content}`;
          const similarity = calculateCardSimilarity(newContent, existingContent);
          
          if (similarity > highestSimilarity) {
            highestSimilarity = similarity;
            if (similarity >= 0.95) {
              duplicateCard = existingCard;
            }
          }
        }
      }
      
      // If duplicate found, merge automatically
      if (duplicateCard) {
        const mergedTags = [...new Set([...(duplicateCard.tags || []), ...(sanitizedCard.tags || [])])].slice(0, 50);
        const mergedLinkedCards = [...new Set([...(duplicateCard.linkedCards || []), ...(sanitizedCard.linkedCards || [])])].slice(0, 100);
        const useNewContent = (sanitizedCard.content || '').length > (duplicateCard.content || '').length;
        
        const { data, error } = await supabase
          .from('zettel_cards')
          .update({
            content: useNewContent ? sanitizedCard.content : duplicateCard.content,
            description: useNewContent ? sanitizedCard.description : duplicateCard.description,
            tags: mergedTags,
            linked_cards: mergedLinkedCards,
            image_url: duplicateCard.image_url || sanitizedCard.imageUrl,
            video_url: duplicateCard.video_url || sanitizedCard.videoUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', duplicateCard.id)
          .select()
          .single();

        if (error) throw error;

        // Generate embedding for the merged card
        if (data) {
          supabase.functions.invoke('generate-embedding', {
            body: {
              contentId: data.id,
              contentType: 'zettel_card',
              text: `${data.title} ${data.content}`
            }
          }).catch(err => console.error('Error generating embedding:', err));
        }

        return { data, merged: true, originalTitle: duplicateCard.title };
      }

      // Generate a unique number if not provided
      let cardNumber = sanitizedCard.number;
      if (!cardNumber || cardNumber.trim() === '') {
        const existingNumbers = cards.map(c => c.number);
        cardNumber = generateNumberForMethod(organizationMethod, sanitizedCard.category, existingNumbers);
      }

      // Auto-categorize if category is default or empty
      let category = sanitizedCard.category;
      if (!category || category === '000') {
        category = categorizeContent(sanitizedCard.content, sanitizedCard.title);
      }

      const { data, error } = await supabase
        .from('zettel_cards')
        .insert({
          user_id: user.id,
          number: cardNumber,
          title: sanitizedCard.title,
          description: sanitizedCard.description,
          content: sanitizedCard.content,
          category: category,
          tags: sanitizedCard.tags || [],
          linked_cards: sanitizedCard.linkedCards || [],
          image_url: sanitizedCard.imageUrl,
          video_url: sanitizedCard.videoUrl
        })
        .select()
        .single();

      if (error) throw error;

      // Generate embedding for the new card
      if (data) {
        supabase.functions.invoke('generate-embedding', {
          body: {
            contentId: data.id,
            contentType: 'zettel_card',
            text: `${sanitizedCard.title} ${sanitizedCard.content}`
          }
        }).catch(err => console.error('Error generating embedding:', err));
      }

      return { data, merged: false };
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['zettel-cards'] });
      
      if (result.merged) {
        toast({ 
          title: 'Duplicate detected and merged!', 
          description: `Card was automatically merged with "${result.originalTitle}"`,
        });
      } else {
        toast({ title: 'Card created successfully!' });
      }
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

      // Validate and sanitize input
      const validation = validateZettelCard(updatedCard);
      if (!validation.valid) {
        throw new Error(`Invalid card data: ${validation.errors.join(', ')}`);
      }

      // Sanitize content to prevent XSS
      const sanitizedCard = {
        ...updatedCard,
        title: sanitizeCardInput(updatedCard.title),
        content: sanitizeCardInput(updatedCard.content),
        description: sanitizeCardInput(updatedCard.description || ''),
      };

      const { data, error } = await supabase
        .from('zettel_cards')
        .update({
          title: sanitizedCard.title,
          description: sanitizedCard.description,
          content: sanitizedCard.content,
          category: sanitizedCard.category,
          tags: sanitizedCard.tags || [],
          linked_cards: sanitizedCard.linkedCards || [],
          image_url: sanitizedCard.imageUrl,
          video_url: sanitizedCard.videoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedCard.id)
        .eq('user_id', user.id)
        .select()
        .maybeSingle();

      if (error) throw error;

      // Regenerate embedding for the updated card
      if (data) {
        supabase.functions.invoke('generate-embedding', {
          body: {
            contentId: data.id,
            contentType: 'zettel_card',
            text: `${sanitizedCard.title} ${sanitizedCard.content}`
          }
        }).catch(err => console.error('Error generating embedding:', err));
      }

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

      // Get user preferences for auto-delete days
      let { data: prefs } = await supabase
        .from('user_preferences')
        .select('auto_delete_days')
        .eq('user_id', user.id)
        .single();

      const deleteDays = prefs?.auto_delete_days || 30;
      const permanentDeleteAt = new Date();
      permanentDeleteAt.setDate(permanentDeleteAt.getDate() + deleteDays);

      const { error } = await supabase
        .from('zettel_cards')
        .update({ 
          deleted_at: new Date().toISOString(),
          permanent_delete_at: permanentDeleteAt.toISOString()
        })
        .eq('id', cardId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zettel-cards'] });
      toast({ title: 'Card moved to recycle bin' });
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

  const mergeDuplicateCardsMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('User not authenticated');
      
      const duplicatePairs: Array<{ original: ZettelCard; duplicate: ZettelCard }> = [];
      
      // Find duplicate pairs
      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          const card1 = cards[i];
          const card2 = cards[j];
          
          // Check title similarity first
          const titleSimilarity = calculateCardSimilarity(
            card1.title.toLowerCase(),
            card2.title.toLowerCase()
          );
          
          if (titleSimilarity >= 0.9) {
            const content1 = `${card1.title} ${card1.content}`;
            const content2 = `${card2.title} ${card2.content}`;
            const contentSimilarity = calculateCardSimilarity(content1, content2);
            
            if (contentSimilarity >= 0.95) {
              // Keep the one with longer content as original
              const [original, duplicate] = (card1.content?.length || 0) >= (card2.content?.length || 0)
                ? [card1, card2]
                : [card2, card1];
              
              duplicatePairs.push({ original, duplicate });
            }
          }
        }
      }
      
      // Merge duplicates
      for (const { original, duplicate } of duplicatePairs) {
        const mergedTags = [...new Set([...(original.tags || []), ...(duplicate.tags || [])])].slice(0, 50);
        const mergedLinkedCards = [...new Set([...(original.linkedCards || []), ...(duplicate.linkedCards || [])])].slice(0, 100);
        
        await supabase
          .from('zettel_cards')
          .update({
            tags: mergedTags,
            linked_cards: mergedLinkedCards,
            image_url: original.imageUrl || duplicate.imageUrl,
            video_url: original.videoUrl || duplicate.videoUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', original.id);
        
        // Delete the duplicate
        await supabase
          .from('zettel_cards')
          .delete()
          .eq('id', duplicate.id)
          .eq('user_id', user.id);
      }
      
      return duplicatePairs.length;
    },
    onSuccess: (mergedCount) => {
      queryClient.invalidateQueries({ queryKey: ['zettel-cards'] });
      if (mergedCount > 0) {
        toast({ 
          title: `Merged ${mergedCount} duplicate card${mergedCount > 1 ? 's' : ''}!`,
          description: 'Similar cards have been automatically combined.',
        });
      }
    },
    onError: (error) => {
      toast({ 
        title: 'Error merging duplicates', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Auto-check for duplicates when cards load
  useEffect(() => {
    if (cards.length > 1 && !isLoading) {
      mergeDuplicateCardsMutation.mutate();
    }
  }, [cards.length > 0 && !isLoading]);

  // Helper function to generate numbers based on organization method
  const generateNumberForMethod = (method: string, category: string, existingNumbers: string[]): string => {
    switch (method) {
      case 'dewey':
        return generateZettelNumber(category, existingNumbers);
      case 'luhmann':
        const nextNumber = existingNumbers.length + 1;
        return nextNumber.toString();
      case 'folgezettel':
        const lastNumber = existingNumbers
          .filter(n => n.includes('.'))
          .map(n => parseFloat(n))
          .filter(n => !isNaN(n))
          .sort((a, b) => b - a)[0] || 0;
        return (Math.floor(lastNumber) + 1) + '.1';
      case 'thematic':
        const themeMap: Record<string, string> = {
          '000': 'COMP', '100': 'PHIL', '200': 'RELI', '300': 'SOCI',
          '400': 'LANG', '500': 'SCIE', '600': 'TECH', '700': 'ARTS',
          '800': 'LITE', '900': 'HIST'
        };
        const prefix = themeMap[category] || 'MISC';
        const themeNumbers = existingNumbers
          .filter(n => n.startsWith(prefix))
          .map(n => parseInt(n.split('-')[1]) || 0)
          .filter(n => !isNaN(n));
        const nextThemeNumber = themeNumbers.length > 0 ? Math.max(...themeNumbers) + 1 : 1;
        return `${prefix}-${nextThemeNumber.toString().padStart(3, '0')}`;
      default:
        return `${Date.now()}`;
    }
  };

  const updateOrganizationMethod = (method: string) => {
    setOrganizationMethod(method);
    localStorage.setItem('zettel-organization-method', method);
  };

  return {
    cards,
    isLoading,
    error,
    organizationMethod,
    updateOrganizationMethod,
    createCard: createCardMutation.mutate,
    updateCard: updateCardMutation.mutate,
    deleteCard: deleteCardMutation.mutate,
    deleteAllCards: deleteAllCardsMutation.mutate,
    mergeDuplicates: mergeDuplicateCardsMutation.mutate,
    isCreating: createCardMutation.isPending,
    isUpdating: updateCardMutation.isPending,
    isDeleting: deleteCardMutation.isPending,
    isDeletingAll: deleteAllCardsMutation.isPending,
    isMergingDuplicates: mergeDuplicateCardsMutation.isPending
  };
};