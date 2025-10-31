import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LinkSuggestion {
  cardId: string;
  cardTitle: string;
  relationshipType: 'related' | 'builds-on' | 'contrasts' | 'example' | 'supports';
  reasoning: string;
  strength: number;
}

export const useSmartLinking = () => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);

  const getSuggestions = async (currentCardId: string, allCards: any[]) => {
    setLoading(true);
    setSuggestions([]);

    try {
      const { data, error } = await supabase.functions.invoke('suggest-smart-links', {
        body: {
          cardId: currentCardId,
          allCards: allCards,
        },
      });

      if (error) throw error;

      const sortedSuggestions = (data?.suggestions || []).sort(
        (a: LinkSuggestion, b: LinkSuggestion) => b.strength - a.strength
      );

      setSuggestions(sortedSuggestions);
      return sortedSuggestions;
    } catch (error: any) {
      console.error('Smart linking error:', error);
      toast.error('Failed to generate link suggestions', {
        description: error.message || 'Please try again.',
      });
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    suggestions,
    getSuggestions,
  };
};
