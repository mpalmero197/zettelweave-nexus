import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  FileUp,
  Trash2,
  Share2,
  Globe,
  List,
  Maximize2,
  Minimize2,
  Printer,
  Lock,
} from 'lucide-react';
import { useZettelCards } from '@/hooks/useZettelCards';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { exportCatalystToPDF, exportCatalystToDOCX, exportCatalystToEPUB, exportCatalystToKPF } from '@/utils/catalystExportUtils';
import { 
  exportToBlogHTML, 
  exportToMedium, 
  exportToWordPress, 
  shareToTwitter, 
  shareToFacebook, 
  shareToLinkedIn, 
  shareToPinterest,
  exportForSubstack,
  exportForGhost 
} from '@/utils/catalystSocialExportUtils';
import { importFile, getSupportedFileTypes } from '@/utils/fileImportUtils';
import { CatalystImportDialog } from '@/components/CatalystImportDialog';
import { CatalystStatsBar } from '@/components/catalyst/CatalystStatsBar';
import { CatalystOutlinePanel } from '@/components/catalyst/CatalystOutlinePanel';
import { CatalystSplitEditor } from '@/components/catalyst/CatalystSplitEditor';
import { CatalystWritingGoals } from '@/components/catalyst/CatalystWritingGoals';
import { CatalystSnapshots } from '@/components/catalyst/CatalystSnapshots';
import { CatalystComments } from '@/components/catalyst/CatalystComments';
import { CatalystAgentsPanel } from '@/components/catalyst/CatalystAgentsPanel';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

// No character limit for the editor
const writingSuggestionSchema = z.object({
  text: z.string().min(1, "Content is required"),
  type: z.enum(['outline', 'brainstorm', 'expand', 'critique'])
});

const plagiarismCheckSchema = z.object({
  text: z.string().min(1, "Content is required"),
  referenceTexts: z.array(z.string()).nullable().optional()
});

export function Catalyst() {
  const { cards } = useZettelCards();
  const { user } = useAuth();
  const { toast } = useToast();
  const { hasPremium } = useSubscription();
  const queryClient = useQueryClient();
  const localLoadRef = useRef<HTMLInputElement>(null);
  
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
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [recommendations, setRecommendations] = useState<Array<{id: string; type: string; title: string; content: string; relevance: string}>>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionStartWordCount] = useState(0);
  const [sessionStartTime] = useState(() => new Date());
  const [activeAssistantTab, setActiveAssistantTab] = useState('suggestions');

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

  const { data: scratchpadNotesData = [] } = useQuery({
    queryKey: ['scratchpad_notes', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('scratchpad_notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

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
    const reference = `<blockquote><strong>Reference: ${item.title}</strong><br/>${item.content}</blockquote><p></p>`;
    setEditorContent(prev => prev + reference);
  };

  const insertRecommendation = (rec: { id: string; type: string; title: string; content: string }) => {
    // Fetch full content based on type
    let fullContent = rec.content;
    
    if (rec.type === 'card') {
      const card = cards.find(c => c.id === rec.id);
      if (card) fullContent = card.content;
    } else if (rec.type === 'note') {
      const note = notes.find(n => n.id === rec.id);
      if (note) fullContent = note.content;
    } else if (rec.type === 'sticky') {
      const stickyNotes = JSON.parse(localStorage.getItem('sticky-notes:v1') || '[]');
      const sticky = stickyNotes.find((s: any) => s.id === rec.id);
      if (sticky) fullContent = sticky.content;
    } else if (rec.type === 'scratchpad') {
      const scratchPad = JSON.parse(localStorage.getItem('scratchpad:notes:v1') || '[]');
      const scratch = scratchPad.find((s: any) => s.id === rec.id);
      if (scratch) fullContent = scratch.content;
    }

    const reference = `<blockquote><strong>Reference: ${rec.title}</strong><br/>${fullContent}</blockquote><p></p>`;
    setEditorContent(prev => prev + reference);
    
    toast({
      title: 'Content inserted',
      description: `Added ${rec.type} to your document.`,
    });
  };

  const insertSelectedItems = () => {
    const itemsToInsert = contentItems.filter(item => selectedItems.has(item.id));
    if (itemsToInsert.length === 0) {
      toast({
        title: 'No items selected',
        description: 'Select items using checkboxes to insert multiple at once.',
        variant: 'destructive',
      });
      return;
    }

    let combinedContent = editorContent;
    itemsToInsert.forEach(item => {
      const reference = `<blockquote><strong>Reference: ${item.title}</strong><br/>${item.content}</blockquote><p></p>`;
      combinedContent += reference;
    });
    
    setEditorContent(combinedContent);
    toast({
      title: 'Items inserted',
      description: `${itemsToInsert.length} item(s) added to your document.`,
    });
  };

  const handleImport = (content: string, fileName: string) => {
    setEditorContent(prev => prev + content);
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

    const plainText = editorContent.replace(/<[^>]*>/g, '');
    const validation = writingSuggestionSchema.safeParse({ 
      text: plainText, 
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

    const plainText = editorContent.replace(/<[^>]*>/g, '');
    const validation = plagiarismCheckSchema.safeParse({ 
      text: plainText,
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

  const handleExport = async (format: 'pdf' | 'docx' | 'epub' | 'kpf') => {
    try {
      switch (format) {
        case 'pdf':
          exportCatalystToPDF(documentTitle, editorContent);
          break;
        case 'docx':
          await exportCatalystToDOCX(documentTitle, editorContent);
          break;
        case 'epub':
          await exportCatalystToEPUB(documentTitle, editorContent);
          break;
        case 'kpf':
          await exportCatalystToKPF(documentTitle, editorContent);
          break;
      }
      toast({
        title: 'Export successful',
        description: `Document exported as ${format.toUpperCase()}`,
      });
    } catch (error: any) {
      toast({
        title: 'Export failed',
        description: error.message,
        variant: 'destructive',
      });
    }
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
    if (e.target) e.target.value = '';
  };

  const convertMarkdownToHtml = (text: string): string => {
    // If it already contains HTML tags, assume it's already converted
    if (/<(h[1-6]|p|ul|ol|blockquote|strong|em)\b/.test(text)) return text;

    let html = text;
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>');
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/((?:^[\-\*] .+\n?)+)/gm, (block) => {
      const items = block.trim().split('\n').map(line =>
        `<li>${line.replace(/^[\-\*] /, '')}</li>`
      ).join('');
      return `<ul>${items}</ul>`;
    });
    html = html.replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
      const items = block.trim().split('\n').map(line =>
        `<li>${line.replace(/^\d+\. /, '')}</li>`
      ).join('');
      return `<ol>${items}</ol>`;
    });
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    const lines = html.split('\n');
    const result: string[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (/^<(h[1-6]|ul|ol|li|blockquote|hr|p|div|pre|table)/.test(trimmed)) {
        result.push(trimmed);
      } else {
        result.push(`<p>${trimmed}</p>`);
      }
    }
    return result.join('');
  };

  const handleLoadFromCloud = (doc: CatalystDocument) => {
    setDocumentTitle(doc.title);
    setEditorContent(convertMarkdownToHtml(doc.content));
    setSelectedSource(doc.selected_source as ContentSource);
    setSelectedItems(new Set(doc.selected_items));
    setCurrentDocId(doc.id);
    setShowLoadDialog(false);
    toast({ title: 'Loaded!', description: 'Document loaded from Pendragon.' });
  };

  const handleNewDocument = () => {
    setDocumentTitle('Untitled Document');
    setEditorContent('');
    setSelectedItems(new Set());
    setCurrentDocId(null);
    setWordCount(0);
    setSuggestions('');
    setPlagiarismResult(null);
    toast({ title: 'New document', description: 'Started a new document.' });
  };

  // AI Recommendations based on current writing
  const handleGetRecommendations = async () => {
    if (!editorContent || editorContent.length < 50) {
      toast({ title: 'Need more content', description: 'Write at least a few sentences to get recommendations.', variant: 'destructive' });
      return;
    }

    setIsLoadingRecommendations(true);
    setRecommendations([]);

    try {
      // Get all content sources
      const stickyNotes = JSON.parse(localStorage.getItem('sticky-notes:v1') || '[]');
      const scratchPad = JSON.parse(localStorage.getItem('scratchpad:notes:v1') || '[]');

      const allSources = [
        ...cards.map(c => ({ id: c.id, type: 'card', title: c.title, content: c.content })),
        ...notes.map(n => ({ id: n.id, type: 'note', title: n.title, content: n.content })),
        ...stickyNotes.map((s: any) => ({ id: s.id, type: 'sticky', title: 'Sticky Note', content: s.content })),
        ...scratchPad.map((s: any) => ({ id: s.id, type: 'scratchpad', title: 'Scratch Note', content: s.content })),
      ];

      // Simple keyword matching algorithm
      const keywords = editorContent.toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 4)
        .slice(0, 20);

      const scored = allSources.map(source => {
        const sourceText = (source.title + ' ' + source.content).toLowerCase();
        const matches = keywords.filter(kw => sourceText.includes(kw)).length;
        return { ...source, score: matches };
      });

      const topRecommendations = scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(s => ({
          id: s.id,
          type: s.type,
          title: s.title,
          content: s.content.substring(0, 150) + '...',
          relevance: `${s.score} keyword${s.score > 1 ? 's' : ''} match`
        }));

      setRecommendations(topRecommendations);
      
      if (topRecommendations.length === 0) {
        toast({ title: 'No recommendations', description: 'No related content found based on your current writing.' });
      } else {
        toast({ title: 'Recommendations ready', description: `Found ${topRecommendations.length} related items.` });
      }
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      toast({ title: 'Error', description: 'Failed to generate recommendations', variant: 'destructive' });
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  // Auto-trigger recommendations when user pauses typing
  useEffect(() => {
    if (!editorContent || editorContent.length < 50) {
      setRecommendations([]);
      return;
    }

    const timer = setTimeout(() => {
      handleGetRecommendations();
    }, 3000); // Wait 3 seconds after user stops typing

    return () => clearTimeout(timer);
  }, [editorContent]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1800px]">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl">
              <Lightbulb className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Catalyst</h1>
              <p className="text-sm text-muted-foreground">Professional Writing Suite for Books, Theses & Research</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Input
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              className="w-64"
              placeholder="Document title..."
            />
            <Badge variant="outline" className="px-3 py-1">
              {wordCount.toLocaleString()} words
            </Badge>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <Button onClick={handleNewDocument} variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            New
          </Button>
          
          <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Document</DialogTitle>
                <DialogDescription>Choose where to save your document</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Button 
                  onClick={() => saveDocumentMutation.mutate()} 
                  className="w-full"
                  disabled={saveDocumentMutation.isPending}
                >
                  {saveDocumentMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Save to Pendragon Cloud
                </Button>
                <Button onClick={handleSaveToLocal} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download to Computer
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <FolderOpen className="h-4 w-4 mr-2" />
                Load
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Load Document</DialogTitle>
                <DialogDescription>Open a saved document</DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="cloud">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="cloud">Pendragon Cloud</TabsTrigger>
                  <TabsTrigger value="local">From Computer</TabsTrigger>
                </TabsList>
                <TabsContent value="cloud">
                  <ScrollArea className="h-[400px] pr-4">
                    {savedDocuments.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No saved documents</p>
                    ) : (
                      <div className="space-y-2">
                        {savedDocuments.map((doc) => (
                          <Card 
                            key={doc.id} 
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleLoadFromCloud(doc)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold">{doc.title}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {doc.word_count.toLocaleString()} words
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Updated: {new Date(doc.updated_at).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="local">
                  <div className="flex items-center justify-center py-12">
                    <Button onClick={() => localLoadRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                    <input
                      ref={localLoadRef}
                      type="file"
                      accept=".catalyst.json"
                      onChange={handleLoadFromLocal}
                      className="hidden"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

          <div className="h-6 w-px bg-border mx-2" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Document Formats</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('docx')}>
                <FileText className="h-4 w-4 mr-2" />
                DOCX (Word)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('epub')}>
                <BookOpen className="h-4 w-4 mr-2" />
                EPUB
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('kpf')}>
                <BookOpen className="h-4 w-4 mr-2" />
                Kindle (HTML)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Globe className="h-4 w-4 mr-2" />
                Publish
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Blog Platforms</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportToBlogHTML(documentTitle, editorContent)}>
                <Globe className="h-4 w-4 mr-2" />
                HTML Blog Post
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToMedium(documentTitle, editorContent)}>
                <FileText className="h-4 w-4 mr-2" />
                Medium (Markdown)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportForSubstack(documentTitle, editorContent)}>
                <FileText className="h-4 w-4 mr-2" />
                Substack
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToWordPress(documentTitle, editorContent)}>
                <FileText className="h-4 w-4 mr-2" />
                WordPress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportForGhost(documentTitle, editorContent)}>
                <FileText className="h-4 w-4 mr-2" />
                Ghost
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Social Media</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => shareToTwitter(documentTitle, editorContent)}>
                <Share2 className="h-4 w-4 mr-2" />
                X (Twitter)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => shareToFacebook(documentTitle)}>
                <Share2 className="h-4 w-4 mr-2" />
                Facebook
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => shareToLinkedIn(documentTitle, editorContent)}>
                <Share2 className="h-4 w-4 mr-2" />
                LinkedIn
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => shareToPinterest(documentTitle)}>
                <Share2 className="h-4 w-4 mr-2" />
                Pinterest
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-6 w-px bg-border mx-2" />

          <Button onClick={() => setShowImportDialog(true)} variant="outline" size="sm">
            <FileUp className="h-4 w-4 mr-2" />
            Import Files
          </Button>

          {/* Knowledge Base Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <BookOpen className="h-4 w-4 mr-2" />
                Knowledge Base
                {selectedItems.size > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">{selectedItems.size}</Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80" onCloseAutoFocus={(e) => e.preventDefault()}>
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Knowledge Base</span>
                <Select value={selectedSource} onValueChange={(value) => {
                  setSelectedSource(value as ContentSource);
                  setSelectedItems(new Set());
                }}>
                  <SelectTrigger className="h-7 w-auto text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cards">Cards ({cards.length})</SelectItem>
                    <SelectItem value="notes">Notes ({notes.length})</SelectItem>
                  </SelectContent>
                </Select>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {selectedItems.size > 0 && (
                <div className="px-2 py-1.5">
                  <Button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); insertSelectedItems(); }}
                    size="sm"
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Insert Selected ({selectedItems.size})
                  </Button>
                </div>
              )}
              <ScrollArea className="h-64">
                <div className="p-1 space-y-1">
                  {contentItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No {selectedSource} available
                    </p>
                  ) : (
                    contentItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-2 p-2 rounded-md hover:bg-accent transition-colors cursor-pointer"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleItem(item.id); }}
                      >
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleItem(item.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {item.description || item.content.substring(0, 100) + '...'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <title>${documentTitle || 'Untitled Document'}</title>
                    <style>
                      body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 12pt; line-height: 1.6; max-width: 8.5in; margin: 1in auto; color: #1a1a1a; }
                      h1 { font-size: 24pt; font-weight: 700; margin-bottom: 0.75em; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.3em; }
                      h2 { font-size: 18pt; font-weight: 700; margin-top: 1.25em; }
                      h3 { font-size: 14pt; font-weight: 600; margin-top: 1em; }
                      h4 { font-size: 13pt; font-weight: 600; font-style: italic; }
                      p { margin-bottom: 0.75em; }
                      ul, ol { margin-bottom: 0.75em; padding-left: 1.5em; }
                      blockquote { border-left: 3px solid #d1d5db; padding-left: 1em; margin: 1em 0; color: #4b5563; }
                      @media print { body { margin: 0; } }
                    </style>
                  </head>
                  <body>${editorContent}</body>
                  </html>
                `);
                printWindow.document.close();
                printWindow.print();
              }
            }}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Editor */}
        <div className={`lg:col-span-9 ${isFullscreen ? 'catalyst-fullscreen' : ''}`}>
          <Card className={isFullscreen ? 'border-0 shadow-none rounded-none h-full' : ''}>
            {!isFullscreen && (
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Document Editor</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {wordCount.toLocaleString()} words
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            )}
            <CardContent className={isFullscreen ? 'p-0 flex-1' : 'p-0'}>
              <CatalystSplitEditor
                content={editorContent}
                onChange={setEditorContent}
                onWordCountChange={setWordCount}
                focusMode={focusMode}
                onToggleFocusMode={() => setFocusMode(!focusMode)}
                isFullscreen={isFullscreen}
                onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
              />
            </CardContent>
            <CatalystStatsBar
              content={editorContent}
              wordCount={wordCount}
              sessionStartWordCount={sessionStartWordCount}
              sessionStartTime={sessionStartTime}
            />
          </Card>
        </div>

        {/* AI Assistant Sidebar */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Writing Tools</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={activeAssistantTab} onValueChange={setActiveAssistantTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="suggestions" className="text-xs">AI</TabsTrigger>
                  <TabsTrigger value="outline" className="text-xs">Outline</TabsTrigger>
                  <TabsTrigger value="tools" className="text-xs">Tools</TabsTrigger>
                  <TabsTrigger value="agents" className="text-xs" disabled={!hasPremium}>
                    {!hasPremium && <Lock className="h-3 w-3 mr-1" />}
                    Agents
                  </TabsTrigger>
                </TabsList>

                {/* Outline Tab */}
                <TabsContent value="outline" className="mt-4">
                  <CatalystOutlinePanel
                    content={editorContent}
                    onHeadingClick={(headingText) => {
                      // Scroll to heading in the editor
                      const editorEl = document.querySelector('.ProseMirror');
                      if (!editorEl) return;
                      const headings = editorEl.querySelectorAll('h1, h2, h3, h4');
                      for (const heading of headings) {
                        if (heading.textContent?.trim() === headingText) {
                          heading.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          break;
                        }
                      }
                    }}
                  />
                </TabsContent>

                <TabsContent value="suggestions" className="space-y-3 mt-4">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Get AI-powered writing assistance</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateSuggestions('outline')}
                        disabled={isGeneratingSuggestions || !editorContent.trim()}
                      >
                        <BookOpen className="h-3 w-3 mr-1" />
                        Outline
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateSuggestions('brainstorm')}
                        disabled={isGeneratingSuggestions || !editorContent.trim()}
                      >
                        <Brain className="h-3 w-3 mr-1" />
                        Ideas
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateSuggestions('expand')}
                        disabled={isGeneratingSuggestions || !editorContent.trim()}
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        Expand
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateSuggestions('critique')}
                        disabled={isGeneratingSuggestions || !editorContent.trim()}
                      >
                        <PenTool className="h-3 w-3 mr-1" />
                        Critique
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="h-[320px] border rounded-lg p-3">
                    {isGeneratingSuggestions ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : suggestions ? (
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap text-sm">{suggestions}</p>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm text-center py-8">
                        Select a suggestion type to get AI-powered writing help
                      </p>
                    )}
                  </ScrollArea>

                  {/* Recommendations Section */}
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-sm font-medium">Related Content</h4>
                        <p className="text-xs text-muted-foreground">Auto-suggested while you write</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleGetRecommendations}
                        disabled={isLoadingRecommendations || editorContent.length < 50}
                      >
                        {isLoadingRecommendations ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <ScrollArea className="h-[180px]">
                      {recommendations.length > 0 ? (
                        <div className="space-y-2">
                          {recommendations.map((rec) => (
                            <div
                              key={rec.id}
                              className="p-2 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() => insertRecommendation(rec)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-xs capitalize">{rec.type}</Badge>
                                    <p className="text-xs font-medium truncate">{rec.title}</p>
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {rec.content}
                                  </p>
                                  <p className="text-xs text-primary mt-1">{rec.relevance}</p>
                                </div>
                                <Plus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          {isLoadingRecommendations ? 'Searching...' : 'Write some content to see recommendations'}
                        </p>
                      )}
                    </ScrollArea>
                  </div>
                </TabsContent>

                <TabsContent value="tools" className="space-y-3 mt-4">
                  <Tabs defaultValue="goals">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="goals" className="text-[10px] px-1">Goals</TabsTrigger>
                      <TabsTrigger value="snapshots" className="text-[10px] px-1">History</TabsTrigger>
                      <TabsTrigger value="comments" className="text-[10px] px-1">Notes</TabsTrigger>
                      <TabsTrigger value="plagiarism" className="text-[10px] px-1">Check</TabsTrigger>
                    </TabsList>
                    <TabsContent value="goals" className="mt-3">
                      <CatalystWritingGoals
                        documentId={currentDocId}
                        currentWordCount={wordCount}
                      />
                    </TabsContent>
                    <TabsContent value="snapshots" className="mt-3">
                      <CatalystSnapshots
                        documentId={currentDocId}
                        currentContent={editorContent}
                        wordCount={wordCount}
                        onRestore={(content) => setEditorContent(content)}
                      />
                    </TabsContent>
                    <TabsContent value="comments" className="mt-3">
                      <CatalystComments documentId={currentDocId} />
                    </TabsContent>
                    <TabsContent value="plagiarism" className="mt-3 space-y-3">
                      <Button
                        onClick={handleCheckPlagiarism}
                        disabled={isCheckingPlagiarism}
                        className="w-full"
                      >
                        {isCheckingPlagiarism ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4 mr-2" />
                        )}
                        Check Originality
                      </Button>

                      {plagiarismResult && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            {plagiarismResult.isPlagiarized ? (
                              <AlertCircle className="h-5 w-5 text-destructive" />
                            ) : (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            )}
                            <div>
                              <p className="text-sm font-medium">
                                Originality: {plagiarismResult.originalityScore}%
                              </p>
                              <Progress value={plagiarismResult.originalityScore} className="h-2 mt-1" />
                            </div>
                          </div>

                          {plagiarismResult.issues.length > 0 && (
                            <ScrollArea className="h-[200px] border rounded-lg p-3">
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Issues:</p>
                                {plagiarismResult.issues.map((issue, i) => (
                                  <div key={i} className="text-xs bg-destructive/10 p-2 rounded">{issue}</div>
                                ))}
                                {plagiarismResult.suggestions.length > 0 && (
                                  <>
                                    <p className="text-sm font-medium mt-2">Suggestions:</p>
                                    {plagiarismResult.suggestions.map((s, i) => (
                                      <div key={i} className="text-xs bg-primary/10 p-2 rounded">{s}</div>
                                    ))}
                                  </>
                                )}
                              </div>
                            </ScrollArea>
                          )}
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </TabsContent>
                <TabsContent value="agents" className="mt-4">
                  {hasPremium ? (
                    <CatalystAgentsPanel
                      cards={cards.map(c => ({ id: c.id, title: c.title, content: c.content, type: 'card' as const, tags: c.tags }))}
                      notes={notes.map((n: any) => ({ id: n.id, title: n.title, content: n.content, type: 'note' as const, tags: n.tags }))}
                      scratchpadNotes={scratchpadNotesData.map((s: any) => ({ id: s.id, title: `Scratch ${s.id.slice(0, 6)}`, content: s.content, type: 'scratchpad' as const }))}
                      onDocumentGenerated={() => queryClient.invalidateQueries({ queryKey: ['catalyst_documents'] })}
                      documentContent={editorContent}
                      documentTitle={documentTitle}
                      onInsertCitations={(citations) => {
                        const sourcesHtml = '\n<hr><h2>Sources</h2><ol>' +
                          citations.map((c: any) => `<li>${c.content || c.metadata?.apa_citation || c.title}</li>`).join('') +
                          '</ol>';
                        setEditorContent(prev => prev + sourcesHtml);
                      }}
                      onInsertKnowledgeGap={(gap, mode) => {
                        const gapTitle = gap.title || 'Untitled Gap';
                        const gapContent = gap.metadata?.suggestion || gap.content || '';
                        const attribution = '<em>(Added by PendragonX)</em>';

                        if (mode === 'inline') {
                          // Try to find the section mentioned and insert after it
                          const section = gap.metadata?.section;
                          if (section) {
                            // Look for a heading that matches the section
                            const sectionRegex = new RegExp(`(<h[1-6][^>]*>[^<]*${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*</h[1-6]>)`, 'i');
                            const match = editorContent.match(sectionRegex);
                            if (match && match.index !== undefined) {
                              const insertPos = match.index + match[0].length;
                              const insertHtml = `<blockquote style="border-left: 3px solid hsl(var(--primary)); padding-left: 12px; margin: 12px 0;"><p><strong>Knowledge Gap: ${gapTitle}</strong></p><p>${gapContent}</p><p>${attribution}</p></blockquote>`;
                              setEditorContent(prev => prev.slice(0, insertPos) + insertHtml + prev.slice(insertPos));
                              return;
                            }
                          }
                          // Fallback: append to end with inline note
                          const fallbackHtml = `<blockquote style="border-left: 3px solid hsl(var(--primary)); padding-left: 12px; margin: 12px 0;"><p><strong>Knowledge Gap: ${gapTitle}</strong> (Section: ${section || 'General'})</p><p>${gapContent}</p><p>${attribution}</p></blockquote>`;
                          setEditorContent(prev => prev + fallbackHtml);
                        } else {
                          // Add to a "Knowledge Gaps" section at the end
                          const hasSection = editorContent.includes('<h2>Knowledge Gaps</h2>');
                          if (hasSection) {
                            // Append before closing of the section (before next <hr> or end)
                            const gapEntry = `<li><strong>${gapTitle}</strong>: ${gapContent} ${attribution}</li>`;
                            setEditorContent(prev => prev.replace('</ol>\n<!-- /knowledge-gaps -->', gapEntry + '</ol>\n<!-- /knowledge-gaps -->'));
                            // If marker not found, just append
                            if (!editorContent.includes('<!-- /knowledge-gaps -->')) {
                              const appendHtml = `\n<hr><h2>Knowledge Gaps</h2><ol><li><strong>${gapTitle}</strong>: ${gapContent} ${attribution}</li></ol>\n<!-- /knowledge-gaps -->`;
                              setEditorContent(prev => prev + appendHtml);
                            }
                          } else {
                            const sectionHtml = `\n<hr><h2>Knowledge Gaps</h2><ol><li><strong>${gapTitle}</strong>: ${gapContent} ${attribution}</li></ol>\n<!-- /knowledge-gaps -->`;
                            setEditorContent(prev => prev + sectionHtml);
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="text-center py-8 space-y-3">
                      <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
                      <h3 className="text-sm font-semibold">Premium Feature</h3>
                      <p className="text-xs text-muted-foreground">AI Agents require a premium subscription.</p>
                      <Button size="sm" variant="outline" onClick={() => window.location.href = '/subscription'}>
                        Upgrade to Premium
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Import Dialog */}
      <CatalystImportDialog 
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={handleImport}
      />
    </div>
  );
}
