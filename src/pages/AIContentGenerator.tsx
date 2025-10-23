import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Sparkles, Loader2, Copy, Download, FileText, StickyNote, BookOpen } from 'lucide-react';
import { useZettelCards } from '@/hooks/useZettelCards';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

type ContentSource = 'cards' | 'notes' | 'scratchpad';
type ContentType = 'essay' | 'book' | 'thesis' | 'dissertation';

interface ContentItem {
  id: string;
  title: string;
  content: string;
  description?: string;
  type: ContentSource;
}

export default function AIContentGenerator() {
  const { cards } = useZettelCards();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedSource, setSelectedSource] = useState<ContentSource>('cards');
  const [contentType, setContentType] = useState<ContentType>('essay');
  const [instructions, setInstructions] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Fetch notes
  const { data: notes = [] } = useQuery({
    queryKey: ['notes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && selectedSource === 'notes',
  });

  // Get content items based on selected source
  const getContentItems = (): ContentItem[] => {
    switch (selectedSource) {
      case 'cards':
        return cards.map(card => ({
          id: card.id,
          title: card.title,
          content: card.content,
          description: card.description,
          type: 'cards' as ContentSource,
        }));
      case 'notes':
        return notes.map(note => ({
          id: note.id,
          title: note.title,
          content: note.content,
          description: '',
          type: 'notes' as ContentSource,
        }));
      case 'scratchpad':
        return [];
      default:
        return [];
    }
  };

  const contentItems = getContentItems();

  const toggleItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    setSelectedItems(new Set(contentItems.map(item => item.id)));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const handleGenerate = async () => {
    if (selectedItems.size === 0) {
      toast({
        title: 'No content selected',
        description: 'Please select at least one item to generate content from.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');

    try {
      const selectedContent = contentItems.filter(item => selectedItems.has(item.id));

      const { data, error } = await supabase.functions.invoke('generate-long-form-content', {
        body: {
          notes: selectedContent.map(item => ({
            title: item.title,
            content: item.content,
            description: item.description,
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
    } catch (error: any) {
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

  const getSourceIcon = (source: ContentSource) => {
    switch (source) {
      case 'cards':
        return <FileText className="h-4 w-4" />;
      case 'notes':
        return <BookOpen className="h-4 w-4" />;
      case 'scratchpad':
        return <StickyNote className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            AI Content Generator
          </h1>
          <p className="text-muted-foreground">
            Create long-form content from your notes, cards, and more
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Content Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Source</label>
                  <Select value={selectedSource} onValueChange={(value) => {
                    setSelectedSource(value as ContentSource);
                    setSelectedItems(new Set());
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cards">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Zettelkasten Cards ({cards.length})
                        </div>
                      </SelectItem>
                      <SelectItem value="notes">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          Notes ({notes.length})
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Content Type</label>
                  <Select value={contentType} onValueChange={(value) => setContentType(value as ContentType)}>
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
                    className="min-h-[120px]"
                  />
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || selectedItems.size === 0}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate from {selectedItems.size} Item{selectedItems.size !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Middle Panel - Content Selection */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getSourceIcon(selectedSource)}
                    Select Items
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAll}>
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {contentItems.length > 0 ? (
                    contentItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => toggleItem(item.id)}
                      >
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleItem(item.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.content.substring(0, 100)}...
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      {getSourceIcon(selectedSource)}
                      <p className="text-sm text-muted-foreground mt-4">
                        No {selectedSource} available
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Generated Content */}
          <div className="lg:col-span-1">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Generated Content</CardTitle>
                  {generatedContent && (
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
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                {generatedContent ? (
                  <Textarea
                    value={generatedContent}
                    readOnly
                    className="flex-1 min-h-[600px] font-mono text-sm resize-none"
                  />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center p-8">
                    <div>
                      <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        Select content sources and click Generate to create your {contentType}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
