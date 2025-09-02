import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ZettelCard } from '@/types/zettel';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Loader2 } from 'lucide-react';

interface AIEditDialogProps {
  card: ZettelCard;
  onCardUpdate: (updatedCard: ZettelCard) => void;
  trigger?: React.ReactNode;
}

export function AIEditDialog({ card, onCardUpdate, trigger }: AIEditDialogProps) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleAIEdit = async () => {
    if (!prompt.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a prompt for AI editing',
        variant: 'destructive'
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-edit-card', {
        body: {
          card: {
            title: card.title,
            description: card.description,
            content: card.content,
            category: card.category,
            tags: card.tags
          },
          prompt
        }
      });

      if (error) throw error;

      const updatedCard: ZettelCard = {
        ...card,
        title: data.title,
        description: data.description,
        content: data.content,
        category: data.category,
        tags: data.tags,
        modified: new Date()
      };

      onCardUpdate(updatedCard);
      setOpen(false);
      setPrompt('');
      
      toast({
        title: 'Success',
        description: 'Card updated with AI assistance!'
      });
    } catch (error: any) {
      toast({
        title: 'AI Edit Failed',
        description: error.message || 'Failed to process AI edit request',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Bot className="h-4 w-4 mr-2" />
            AI Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Edit Card
          </DialogTitle>
          <DialogDescription>
            Describe how you'd like to modify this card. The AI will help improve the content, structure, or add relevant information.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-accent/20 p-3 rounded-md">
            <h4 className="font-medium mb-1">{card.title}</h4>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {card.description || card.content.substring(0, 150)}...
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="ai-prompt">What would you like to change?</Label>
            <Textarea
              id="ai-prompt"
              placeholder="e.g., 'Make this more concise', 'Add examples', 'Improve the structure', 'Expand on the main concepts'..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAIEdit}
              disabled={isProcessing || !prompt.trim()}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isProcessing ? 'Processing...' : 'Apply AI Edit'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}