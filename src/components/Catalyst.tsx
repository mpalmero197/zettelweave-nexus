import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
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
  Save,
  Upload,
  FolderOpen,
  Image as ImageIcon,
} from 'lucide-react';
import { useZettelCards } from '@/hooks/useZettelCards';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { exportCatalystToPDF, exportCatalystToDOCX, exportCatalystToEPUB } from '@/utils/catalystExportUtils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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

interface CatalystDocument {
  id: string;
  title: string;
  content: string;
  selected_source: string;
  selected_items: string[];
  word_count: number;
  created_at: string;
  updated_at: string;
}

// Validation schemas
const MAX_CONTENT_LENGTH = 50000;

const writingSuggestionSchema = z.object({
  text: z.string().min(1, "Content is required").max(MAX_CONTENT_LENGTH, "Content must be less than 50,000 characters"),
  type: z.enum(['outline', 'brainstorm', 'expand', 'critique'])
});

const plagiarismCheckSchema = z.object({
  text: z.string().min(1, "Content is required").max(MAX_CONTENT_LENGTH, "Content must be less than 50,000 characters"),
  referenceTexts: z.array(z.string()).nullable().optional()
});

export function Catalyst() {
  const { cards } = useZettelCards();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedSource, setSelectedSource] = useState<ContentSource>('cards');
  const [editorContent, setEditorContent] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState('');
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [plagiarismResult, setPlagiarismResult] = useState<PlagiarismResult | null>(null);
  const [isCheckingPlagiarism, setIsCheckingPlagiarism] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);

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

  // Fetch saved documents
  const { data: savedDocuments = [] } = useQuery({
    queryKey: ['catalyst_documents', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('catalyst_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as CatalystDocument[];
    },
    enabled: !!user,
  });

  // Save document mutation
  const saveDocumentMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const docData = {
        user_id: user.id,
        title: documentTitle,
        content: editorContent,
        selected_source: selectedSource,
        selected_items: Array.from(selectedItems),
        word_count: wordCount,
      };

      if (currentDocId) {
        const { data, error } = await supabase
          .from('catalyst_documents')
          .update(docData)
          .eq('id', currentDocId)
          .eq('user_id', user.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('catalyst_documents')
          .insert([docData])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      setCurrentDocId(data.id);
      queryClient.invalidateQueries({ queryKey: ['catalyst_documents'] });
      toast({
        title: 'Document saved',
        description: 'Your work has been saved to Pendragon',
      });
      setShowSaveDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to save',
        description: error.message,
        variant: 'destructive',
      });
    },
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

  const insertFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          const fileRef = `\n\n[File: ${file.name}]\n${result.substring(0, 500)}...\n\n`;
          setEditorContent(prev => prev + fileRef);
          updateWordCount(editorContent + fileRef);
          toast({
            title: 'File inserted',
            description: `${file.name} has been added to your content`,
          });
        }
      };
      
      if (file.type.startsWith('image/') || file.name.endsWith('.tiff')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const updateWordCount = (text: string) => {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
  };

  const handleEditorChange = (text: string) => {
    if (text.length > MAX_CONTENT_LENGTH) {
      toast({
        title: 'Content too long',
        description: `Content cannot exceed ${MAX_CONTENT_LENGTH.toLocaleString()} characters`,
        variant: 'destructive',
      });
      return;
    }
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

    const validation = writingSuggestionSchema.safeParse({ 
      text: editorContent, 
      type 
    });

    if (!validation.success) {
      toast({
        title: 'Validation error',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setIsGeneratingSuggestions(true);
    setSuggestions('');

    try {
      const { data, error } = await supabase.functions.invoke('generate-writing-suggestions', {
        body: validation.data,
      });

      if (error) throw error;

      setSuggestions(data.suggestions);
      toast({
        title: 'Suggestions ready!',
        description: 'Check the suggestions panel for ideas.',
      });
    } catch (error: any) {
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

    const selectedContent = contentItems
      .filter(item => selectedItems.has(item.id))
      .map(item => item.content);

    const validation = plagiarismCheckSchema.safeParse({ 
      text: editorContent,
      referenceTexts: selectedContent.length > 0 ? selectedContent : null,
    });

    if (!validation.success) {
      toast({
        title: 'Validation error',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setIsCheckingPlagiarism(true);
    setPlagiarismResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('check-plagiarism', {
        body: validation.data,
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

  const handleSaveToLocal = () => {
    const blob = new Blob([JSON.stringify({
      title: documentTitle,
      content: editorContent,
      selected_source: selectedSource,
      selected_items: Array.from(selectedItems),
      word_count: wordCount,
      saved_at: new Date().toISOString(),
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentTitle.replace(/\s+/g, '_')}.catalyst.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Saved locally', description: 'Document downloaded to your computer.' });
  };

  const handleLoadFromLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        setDocumentTitle(data.title || 'Untitled Document');
        setEditorContent(data.content || '');
        setSelectedSource(data.selected_source || 'cards');
        setSelectedItems(new Set(data.selected_items || []));
        updateWordCount(data.content || '');
        setCurrentDocId(null);
        toast({ title: 'Loaded!', description: 'Document loaded from file.' });
      } catch (error) {
        toast({
          title: 'Failed to load',
          description: 'Invalid file format',
          variant: 'destructive',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadFromCloud = (doc: CatalystDocument) => {
    setDocumentTitle(doc.title);
    setEditorContent(doc.content);
    setSelectedSource(doc.selected_source as ContentSource);
    setSelectedItems(new Set(doc.selected_items));
    updateWordCount(doc.content);
    setCurrentDocId(doc.id);
    setShowLoadDialog(false);
    toast({ title: 'Loaded!', description: 'Document loaded from Pendragon.' });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
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
        
        <div className="flex items-center gap-2">
          <Input
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            className="w-64"
            placeholder="Document title..."
          />
        </div>
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
                    
                    {/* Save/Load Dropdown */}
                    <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Save className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Save Document</DialogTitle>
                          <DialogDescription>Choose where to save your work</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-2">
                          <Button 
                            className="w-full" 
                            onClick={() => saveDocumentMutation.mutate()}
                            disabled={saveDocumentMutation.isPending}
                          >
                            {saveDocumentMutation.isPending ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                            ) : (
                              <><Save className="mr-2 h-4 w-4" />Save to Pendragon</>
                            )}
                          </Button>
                          <Button variant="outline" className="w-full" onClick={handleSaveToLocal}>
                            <Download className="mr-2 h-4 w-4" />
                            Save to Desktop
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Load Document</DialogTitle>
                          <DialogDescription>Open a saved document or load from your desktop</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".json,.catalyst.json"
                              onChange={handleLoadFromLocal}
                              className="hidden"
                            />
                            <Button 
                              variant="outline" 
                              className="w-full" 
                              onClick={() => fileInputRef.current?.click()}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              Load from Desktop
                            </Button>
                          </div>
                          
                          <div className="border-t pt-4">
                            <p className="text-sm font-medium mb-2">Saved Documents</p>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {savedDocuments.map(doc => (
                                <Button
                                  key={doc.id}
                                  variant="ghost"
                                  className="w-full justify-start"
                                  onClick={() => handleLoadFromCloud(doc)}
                                >
                                  <FileText className="mr-2 h-4 w-4" />
                                  <div className="flex-1 text-left">
                                    <p className="font-medium">{doc.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(doc.updated_at).toLocaleDateString()} • {doc.word_count} words
                                    </p>
                                  </div>
                                </Button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Export Dropdown */}
                    <Select onValueChange={(value) => {
                      if (value === 'pdf') exportCatalystToPDF(documentTitle, editorContent);
                      else if (value === 'docx') exportCatalystToDOCX(documentTitle, editorContent);
                      else if (value === 'epub') exportCatalystToEPUB(documentTitle, editorContent);
                      else if (value === 'kpf') {
                        toast({
                          title: 'KPF Export',
                          description: 'KPF format coming soon. Use EPUB for now.',
                        });
                      }
                    }}>
                      <SelectTrigger className="w-32">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="docx">DOCX</SelectItem>
                        <SelectItem value="epub">EPUB</SelectItem>
                        <SelectItem value="kpf">KPF (Soon)</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Insert File Button */}
                    <input
                      type="file"
                      accept=".tiff,.jpg,.jpeg,.dta"
                      multiple
                      className="hidden"
                      id="file-insert"
                      onChange={insertFile}
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => document.getElementById('file-insert')?.click()}
                    >
                      <ImageIcon className="h-4 w-4" />
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
                maxLength={MAX_CONTENT_LENGTH}
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
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">Issues Detected</span>
                          </div>
                          <ul className="space-y-1 text-sm">
                            {plagiarismResult.issues.map((issue, i) => (
                              <li key={i} className="text-muted-foreground">• {issue}</li>
                            ))}
                          </ul>
                          <div className="mt-4">
                            <p className="text-sm font-medium mb-2">Suggestions:</p>
                            <ul className="space-y-1 text-sm">
                              {plagiarismResult.suggestions.map((suggestion, i) => (
                                <li key={i} className="text-muted-foreground">• {suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          <span className="text-sm font-medium">Content is original!</span>
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
  );
}
