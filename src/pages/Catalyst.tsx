import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Lightbulb, 
  Loader2, 
  Copy, 
  Download, 
  FileText, 
  BookOpen,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Brain,
  PenTool,
  Search,
  Plus,
} from 'lucide-react';
import { useZettelCards } from '@/hooks/useZettelCards';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

type ContentSource = 'cards' | 'notes';

interface ContentItem {
  id: string;
  title: string;
  content: string;
  description?: string;
}

interface PlagiarismResult {
  originalityScore: number;
  isPlagiarized: boolean;
  issues: string[];
  suggestions: string[];
}

export default function Catalyst() {
  const { cards } = useZettelCards();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedSource, setSelectedSource] = useState<ContentSource>('cards');
  const [editorContent, setEditorContent] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState('');
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [plagiarismResult, setPlagiarismResult] = useState<PlagiarismResult | null>(null);
  const [isCheckingPlagiarism, setIsCheckingPlagiarism] = useState(false);
  const [wordCount, setWordCount] = useState(0);

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
    enabled: !!user,
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
        }));
      case 'notes':
        return notes.map(note => ({
          id: note.id,
          title: note.title,
          content: note.content,
          description: '',
        }));
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

  const insertReference = (item: ContentItem) => {
    const reference = `\n\n[Reference: ${item.title}]\n${item.content}\n\n`;
    setEditorContent(prev => prev + reference);
    updateWordCount(editorContent + reference);
  };

  const updateWordCount = (text: string) => {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
  };

  const handleEditorChange = (text: string) => {
    setEditorContent(text);
    updateWordCount(text);
  };

  const handleGenerateSuggestions = async (type: string) => {
    if (!editorContent.trim()) {
      toast({
        title: 'No content',
        description: 'Write some content first to get suggestions.',
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingSuggestions(true);
    setSuggestions('');

    try {
      const { data, error } = await supabase.functions.invoke('generate-writing-suggestions', {
        body: { text: editorContent, type },
      });

      if (error) throw error;

      setSuggestions(data.suggestions);
      toast({
        title: 'Suggestions ready!',
        description: 'Check the suggestions panel for ideas.',
      });
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      toast({
        title: 'Failed to generate suggestions',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const handleCheckPlagiarism = async () => {
    if (!editorContent.trim()) {
      toast({
        title: 'No content',
        description: 'Write some content first to check for plagiarism.',
        variant: 'destructive',
      });
      return;
    }

    setIsCheckingPlagiarism(true);
    setPlagiarismResult(null);

    try {
      const selectedContent = contentItems
        .filter(item => selectedItems.has(item.id))
        .map(item => item.content);

      const { data, error } = await supabase.functions.invoke('check-plagiarism', {
        body: { 
          text: editorContent,
          referenceTexts: selectedContent.length > 0 ? selectedContent : null,
        },
      });

      if (error) throw error;

      setPlagiarismResult(data);
      
      if (data.isPlagiarized) {
        toast({
          title: 'Plagiarism detected',
          description: `Originality score: ${data.originalityScore}%. Review the issues.`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Content is original',
          description: `Originality score: ${data.originalityScore}%`,
        });
      }
    } catch (error: any) {
      console.error('Error checking plagiarism:', error);
      toast({
        title: 'Failed to check plagiarism',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingPlagiarism(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editorContent);
    toast({ title: 'Copied!', description: 'Content copied to clipboard.' });
  };

  const handleDownload = () => {
    const blob = new Blob([editorContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `catalyst-content-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded!', description: 'Content has been downloaded.' });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl">
              <Lightbulb className="h-8 w-8 text-primary" />
            </div>
            Catalyst
          </h1>
          <p className="text-muted-foreground">
            Transform your knowledge into original content with AI-assisted ideation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Knowledge Base Panel */}
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="text-base">Knowledge Base</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedSource} onValueChange={(value) => {
                  setSelectedSource(value as ContentSource);
                  setSelectedItems(new Set());
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cards">Cards ({cards.length})</SelectItem>
                    <SelectItem value="notes">Notes ({notes.length})</SelectItem>
                  </SelectContent>
                </Select>

                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {contentItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={selectedItems.has(item.id)}
                        onCheckedChange={() => toggleItem(item.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.content.substring(0, 60)}...
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => insertReference(item)}
                          className="mt-1 h-6 text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Insert
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Editor Panel */}
          <div className="lg:col-span-2">
            <Card className="h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <PenTool className="h-5 w-5" />
                    Your Content
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{wordCount} words</Badge>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={handleCopy}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleDownload}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                <Textarea
                  value={editorContent}
                  onChange={(e) => handleEditorChange(e.target.value)}
                  placeholder="Start writing your original content here. Use your knowledge base for reference and get AI suggestions for ideas..."
                  className="flex-1 min-h-[500px] resize-none font-mono text-sm"
                />
                
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => handleGenerateSuggestions('brainstorm')}
                    disabled={isGeneratingSuggestions}
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Brainstorm Ideas
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleGenerateSuggestions('outline')}
                    disabled={isGeneratingSuggestions}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Create Outline
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleGenerateSuggestions('expand')}
                    disabled={isGeneratingSuggestions}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Expand Ideas
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleGenerateSuggestions('critique')}
                    disabled={isGeneratingSuggestions}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Get Feedback
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Suggestions & Plagiarism Panel */}
          <div className="lg:col-span-1">
            <Tabs defaultValue="suggestions" className="h-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
                <TabsTrigger value="plagiarism">Check</TabsTrigger>
              </TabsList>
              
              <TabsContent value="suggestions" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      AI Suggestions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isGeneratingSuggestions ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : suggestions ? (
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap text-sm">{suggestions}</p>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-sm text-muted-foreground">
                          Click a suggestion button to get AI-powered ideas
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="plagiarism" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Originality Check</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={handleCheckPlagiarism}
                      disabled={isCheckingPlagiarism}
                      className="w-full"
                    >
                      {isCheckingPlagiarism ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Check Originality
                        </>
                      )}
                    </Button>

                    {plagiarismResult && (
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Originality Score</span>
                            <span className="text-sm font-bold">
                              {plagiarismResult.originalityScore}%
                            </span>
                          </div>
                          <Progress value={plagiarismResult.originalityScore} />
                        </div>

                        {plagiarismResult.isPlagiarized ? (
                          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-destructive">Issues Found</p>
                              <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside">
                                {plagiarismResult.issues.map((issue, i) => (
                                  <li key={i}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                Content is Original
                              </p>
                            </div>
                          </div>
                        )}

                        {plagiarismResult.suggestions.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-2">Suggestions</p>
                            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                              {plagiarismResult.suggestions.map((suggestion, i) => (
                                <li key={i}>{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
