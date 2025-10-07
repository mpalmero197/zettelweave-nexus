import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SimilarItem {
  id: string;
  title: string;
  content: string;
  created_at: string;
  similarity: number;
}

export const useSimilarContent = () => {
  const [loading, setLoading] = useState(false);
  const [similarItems, setSimilarItems] = useState<SimilarItem[]>([]);

  const generateEmbedding = async (contentId: string, contentType: 'zettel_card' | 'note', text: string) => {
    try {
      const { error } = await supabase.functions.invoke('generate-embedding', {
        body: { contentId, contentType, text }
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Don't show error to user, this is a background operation
    }
  };

  const findSimilar = async (
    contentId: string,
    contentType: 'zettel_card' | 'note',
    similarityThreshold: number = 0.85
  ) => {
    setLoading(true);
    setSimilarItems([]);

    try {
      const { data, error } = await supabase.functions.invoke('find-similar-content', {
        body: {
          contentId,
          contentType,
          similarityThreshold,
          maxResults: 5
        }
      });

      if (error) throw error;

      setSimilarItems(data.similar || []);
      
      if (!data.similar || data.similar.length === 0) {
        toast.info('No similar content found');
      }

      return data.similar || [];
    } catch (error) {
      console.error('Error finding similar content:', error);
      toast.error('Failed to find similar content');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const mergeContent = async (
    sourceId: string,
    destinationId: string,
    mergedContent: string,
    contentType: 'zettel_card' | 'note'
  ) => {
    try {
      const tableName = contentType === 'zettel_card' ? 'zettel_cards' : 'notes';

      // Update destination with merged content
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ content: mergedContent })
        .eq('id', destinationId);

      if (updateError) throw updateError;

      // Delete source
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', sourceId);

      if (deleteError) throw deleteError;

      // Generate new embedding for merged content
      await generateEmbedding(destinationId, contentType, mergedContent);

    } catch (error) {
      console.error('Error merging content:', error);
      throw error;
    }
  };

  return {
    loading,
    similarItems,
    findSimilar,
    mergeContent,
    generateEmbedding,
  };
};