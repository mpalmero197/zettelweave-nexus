import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2, Copy, Download } from 'lucide-react';
import { useZettelCards } from '@/hooks/useZettelCards';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function AIContentGeneratorWidget() {
  const { cards } = useZettelCards();
  const { toast } = useToast();
  const [contentType, setContentType] = useState<string>('essay');
  const [instructions, setInstructions] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  const handleGenerate = async () => {
    if (cards.length === 0) {
      toast({
        title: 'No cards available',
        description: 'Create some Zettelkasten cards first to generate content.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');

    try {
      // Use all cards or selected cards
      const notesToUse = selectedCards.length > 0 
        ? cards.filter(card => selectedCards.includes(card.id))
        : cards;

      const { data, error } = await supabase.functions.invoke('generate-long-form-content', {
        body: {
          notes: notesToUse.map(card => ({
            title: card.title,
            content: card.content,
            description: card.description,
          })),
          contentType,
          instructions,
        },
      });

      if (error) throw error;

      setGeneratedContent(data.content);
      toast({
        title: 'Content generated!',
        description: `Your ${contentType} has been created successfully.`,
      });
    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: 'Generation failed',
        description: error.message || 'Failed to generate content. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    toast({
      title: 'Copied!',
      description: 'Content copied to clipboard.',
    });
  };

  const handleDownload = () => {
    const blob = new Blob([generatedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated-${contentType}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Downloaded!',
      description: 'Content has been downloaded.',
    });
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          AI Content Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Content Type</label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="essay">Essay</SelectItem>
                <SelectItem value="book">Book Chapter</SelectItem>
                <SelectItem value="thesis">Thesis Section</SelectItem>
                <SelectItem value="dissertation">Dissertation Chapter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Additional Instructions (Optional)
            </label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Provide specific guidance for the AI (e.g., tone, focus areas, length)..."
              className="min-h-[80px]"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || cards.length === 0}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate from {cards.length} Card{cards.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>

        {generatedContent && (
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Generated Content</label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
            <Textarea
              value={generatedContent}
              readOnly
              className="flex-1 min-h-[200px] font-mono text-sm"
            />
          </div>
        )}

        {!generatedContent && !isGenerating && (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground">
                Generate long-form content from your Zettelkasten cards
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
