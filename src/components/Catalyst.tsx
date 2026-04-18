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
  Users,
  GraduationCap,
  Briefcase,
} from 'lucide-react';
import { useZettelCards } from '@/hooks/useZettelCards';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePremiumAccess } from '@/hooks/usePremiumAccess';
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
import { CatalystCollaborators } from '@/components/catalyst/CatalystCollaborators';
import { CatalystPresenceBar } from '@/components/catalyst/CatalystPresenceBar';
import { ResumeOptimizer } from '@/components/ResumeOptimizer';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
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
  selected_items: string[] | null;
  word_count: number;
  theme_id?: string;
  is_master_document?: boolean;
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
  const { hasAccess: hasPremium } = usePremiumAccess();
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
  const [showShareDialog, setShowShareDialog] = useState(false);
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
  const [showCollabDialog, setShowCollabDialog] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [catalystMode, setCatalystMode] = useState<'writer' | 'resume'>('writer');
  const [documentTheme, setDocumentTheme] = useState('default');
  const [showNewTemplateDialog, setShowNewTemplateDialog] = useState(false);

const DOCUMENT_TEMPLATES = [
  { id: 'blank', title: 'Blank Document', description: 'Start from scratch', icon: <FileText className="h-4 w-4" />, content: '' },
  { id: 'essay', title: 'Essay', description: 'Academic formatting with intro and conclusion', icon: <BookOpen className="h-4 w-4" />, content: '<h1>Essay Title</h1>\n<h2>Introduction</h2>\n<p>Begin your essay here. State your thesis clearly and outline your main arguments.</p>\n<h2>Body Paragraph 1</h2>\n<p>First main point supporting your thesis, with evidence and analysis.</p>\n<h2>Conclusion</h2>\n<p>Summarize your findings and restate your thesis in a new way.</p>' },
  { id: 'research', title: 'Research Paper', description: 'Structured for scientific or academic research', icon: <GraduationCap className="h-4 w-4" />, content: '<h1>Research Title</h1>\n<h2>Abstract</h2>\n<p>A brief summary of your research, methodology, and findings.</p>\n<h2>Introduction</h2>\n<p>Background context and research questions.</p>\n<h2>Methodology</h2>\n<p>Description of your methods and data collection.</p>\n<h2>Results</h2>\n<p>Presentation of your findings.</p>\n<h2>Discussion</h2>\n<p>Interpretation of the results and implications.</p>\n<h2>References</h2>\n<ul><li>Citation 1</li><li>Citation 2</li></ul>' },
  { id: 'blog', title: 'Blog Post', description: 'Engaging format for online readers', icon: <Globe className="h-4 w-4" />, content: '<h1>Catchy Blog Post Title</h1>\n<h2>Hook Your Reader</h2>\n<p>Start with an engaging opening that draws the reader in and explains why this post matters.</p>\n<h2>Main Takeaway 1</h2>\n<p>Elaborate on your first point. Keep paragraphs relatively short for readability.</p>\n<h2>Main Takeaway 2</h2>\n<p>Provide actionable advice or interesting insights.</p>\n<h2>Conclusion & Call to Action</h2>\n<p>Wrap up the post and ask readers to comment, subscribe, or share.</p>' },
  { id: 'business', title: 'Business Report', description: 'Professional corporate reporting', icon: <Briefcase className="h-4 w-4" />, content: '<h1>Executive Summary</h1>\n<p>A high-level overview of the report\'s purpose, findings, and recommendations.</p>\n<h2>Background</h2>\n<p>Context for the report and objectives.</p>\n<h2>Findings</h2>\n<p>Detailed analysis of the data or situation.</p>\n<h2>Recommendations</h2>\n<ul><li>Recommendation 1</li><li>Recommendation 2</li></ul>\n<h2>Appendix</h2>\n<p>Supporting documents and data.</p>' },
  { id: 'creative', title: 'Creative Writing', description: 'Narrative structure for fiction', icon: <PenTool className="h-4 w-4" />, content: '<h1>Chapter One</h1>\n<p>The story begins here. Set the scene, introduce the characters, and establish the narrative voice.</p>\n<p>Use descriptive language to bring the world to life. Show, don\'t tell.</p>' },
  { id: 'meeting', title: 'Meeting Notes', description: 'Organized minutes and action items', icon: <Users className="h-4 w-4" />, content: '<h1>Meeting Notes: [Project/Team]</h1>\n<p><strong>Date:</strong> YYYY-MM-DD<br/><strong>Attendees:</strong> [Names]</p>\n<h2>Agenda</h2>\n<ul><li>Topic 1</li><li>Topic 2</li></ul>\n<h2>Discussion Points</h2>\n<p>Detailed notes on what was discussed for each topic.</p>\n<h2>Action Items</h2>\n<ul><li>[ ] Task 1 - Assigned to: Name - Due: Date</li><li>[ ] Task 2 - Assigned to: Name - Due: Date</li></ul>' },
];

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
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as CatalystDocument[];
    },
    enabled: !!user,
  });

  // Fetch pending invitations for me
  const { data: pendingInvitations = [] } = useQuery({
    queryKey: ['catalyst_pending_invitations', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: collabs, error: collabError } = await supabase
        .from('catalyst_collaborators')
        .select('*')
        .eq('collaborator_id', user.id)
        .eq('status', 'pending');
      if (collabError) throw collabError;
      if (!collabs || collabs.length === 0) return [];

      // Fetch owner profiles and doc titles
      const ownerIds = [...new Set(collabs.map(c => c.owner_id))];
      const docIds = collabs.map(c => c.document_id);

      const [{ data: profiles }, { data: docs }] = await Promise.all([
        supabase.from('profiles').select('user_id, display_name').in('user_id', ownerIds),
        supabase.from('catalyst_documents').select('id, title, word_count, updated_at').in('id', docIds),
      ]);

      return collabs.map(c => ({
        ...c,
        owner_name: profiles?.find(p => p.user_id === c.owner_id)?.display_name || 'Unknown',
        doc_title: docs?.find(d => d.id === c.document_id)?.title || 'Untitled',
        doc_word_count: docs?.find(d => d.id === c.document_id)?.word_count || 0,
        doc_updated_at: docs?.find(d => d.id === c.document_id)?.updated_at || c.created_at,
      }));
    },
    enabled: !!user,
  });

  // Fetch documents shared with me (accepted)
  const { data: sharedDocuments = [] } = useQuery({
    queryKey: ['catalyst_shared_documents', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: collabs, error: collabError } = await supabase
        .from('catalyst_collaborators')
        .select('document_id, permission')
        .eq('collaborator_id', user.id)
        .eq('status', 'accepted');
      if (collabError) throw collabError;
      if (!collabs || collabs.length === 0) return [];
      
      const docIds = collabs.map(c => c.document_id);
      const { data, error } = await supabase
        .from('catalyst_documents')
        .select('*')
        .in('id', docIds)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      
      return (data || []).map(doc => ({
        ...doc,
        _permission: collabs.find(c => c.document_id === doc.id)?.permission || 'view',
      })) as (CatalystDocument & { _permission?: string })[];
    },
    enabled: !!user,
  });

  const acceptInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('catalyst_collaborators')
        .update({ status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalyst_pending_invitations'] });
      queryClient.invalidateQueries({ queryKey: ['catalyst_shared_documents'] });
      toast({ title: 'Invitation accepted', description: 'You can now access this document.' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    },
  });

  const declineInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('catalyst_collaborators')
        .update({ status: 'declined' })
        .eq('id', invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalyst_pending_invitations'] });
      toast({ title: 'Invitation declined' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    },
  });

  // Fetch trashed documents
  const { data: trashedDocuments = [] } = useQuery({
    queryKey: ['catalyst_trashed_documents', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('catalyst_documents')
        .select('*')
        .eq('user_id', user.id)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return data as CatalystDocument[];
    },
    enabled: !!user,
  });

  const softDeleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      if (!user) throw new Error('Not authenticated');
      const deletedAt = new Date().toISOString();
      const permanentDeleteAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
      const { error } = await supabase
        .from('catalyst_documents')
        .update({ deleted_at: deletedAt, permanent_delete_at: permanentDeleteAt })
        .eq('id', docId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalyst_documents'] });
      queryClient.invalidateQueries({ queryKey: ['catalyst_trashed_documents'] });
      toast({ title: 'Document moved to trash', description: 'It will be permanently deleted in 30 days.' });
      setDeletingDocId(null);
    },
    onError: (error: any) => {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
    },
  });

  const restoreDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('catalyst_documents')
        .update({ deleted_at: null, permanent_delete_at: null })
        .eq('id', docId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalyst_documents'] });
      queryClient.invalidateQueries({ queryKey: ['catalyst_trashed_documents'] });
      toast({ title: 'Document restored' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to restore', description: error.message, variant: 'destructive' });
    },
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
        theme_id: documentTheme,
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
          exportCatalystToPDF(documentTitle, editorContent, documentTheme);
          break;
        case 'docx':
          await exportCatalystToDOCX(documentTitle, editorContent, documentTheme);
          break;
        case 'epub':
          await exportCatalystToEPUB(documentTitle, editorContent, documentTheme);
          break;
        case 'kpf':
          await exportCatalystToKPF(documentTitle, editorContent, documentTheme);
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
      theme_id: documentTheme,
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
        setDocumentTheme(data.theme_id || 'default');
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
    setSelectedSource((doc.selected_source || 'cards') as ContentSource);
    setSelectedItems(new Set(doc.selected_items || []));
    setDocumentTheme(doc.theme_id || 'default');
    setCurrentDocId(doc.id);
    setShowLoadDialog(false);
    toast({ title: 'Loaded!', description: 'Document loaded from Pendragon.' });
  };

  const handleNewDocumentClick = () => {
    setShowNewTemplateDialog(true);
  };

  const createNewDocument = (template: typeof DOCUMENT_TEMPLATES[0]) => {
    setDocumentTitle(template.id === 'blank' ? 'Untitled Document' : template.title);
    setEditorContent(template.content);
    setSelectedItems(new Set());
    setDocumentTheme('default');
    setCurrentDocId(null);
    setWordCount(0);
    setSuggestions('');
    setPlagiarismResult(null);
    setShowNewTemplateDialog(false);
    toast({ title: 'New document', description: `Started a new ${template.title.toLowerCase()}.` });
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

  // Real-time content sync via Supabase Broadcast
  useEffect(() => {
    if (!currentDocId || !user) return;

    const channel = supabase.channel(`catalyst-content-${currentDocId}`);
    
    channel.on('broadcast', { event: 'content-update' }, (payload) => {
      if (payload.payload.user_id !== user.id) {
        setEditorContent(payload.payload.content);
        setWordCount(payload.payload.word_count || 0);
      }
    }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentDocId, user]);

  // Broadcast content changes to collaborators
  useEffect(() => {
    if (!currentDocId || !user) return;
    const channel = supabase.channel(`catalyst-content-${currentDocId}`);
    const timer = setTimeout(() => {
      channel.send({
        type: 'broadcast',
        event: 'content-update',
        payload: { user_id: user.id, content: editorContent, word_count: wordCount },
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [editorContent, currentDocId, user]);


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
          
          {catalystMode === 'writer' && (
            <div className="flex items-center gap-2">
              <Input
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                className="w-64"
                placeholder="Document title..."
                aria-label="Document title"
              />
              <Badge variant="outline" className="px-3 py-1">
                {wordCount.toLocaleString()} words
              </Badge>
              <span
                className="text-xs text-muted-foreground"
                aria-live="assertive"
              >
                {saveDocumentMutation.isPending ? (
                  <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Saving…</span>
                ) : currentDocId ? (
                  <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Saved</span>
                ) : (
                  <span className="text-muted-foreground/60">Unsaved</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-2 mt-4">
          <Button
            variant={catalystMode === 'writer' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCatalystMode('writer')}
          >
            <PenTool className="h-4 w-4 mr-2" />
            Writer
          </Button>
          <Button
            variant={catalystMode === 'resume' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCatalystMode('resume')}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Resume AI
          </Button>
        </div>
      </div>

      {catalystMode === 'resume' ? (
        <ResumeOptimizer />
      ) : (
        <>
        {/* Action Bar */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Button onClick={handleNewDocumentClick} variant="outline" size="sm">
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
              <Button variant="outline" size="sm" className="relative">
                <FolderOpen className="h-4 w-4 mr-2" />
                Load
                {pendingInvitations.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {pendingInvitations.length}
                  </span>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Load Document</DialogTitle>
                <DialogDescription>Open a saved document</DialogDescription>
              </DialogHeader>
              <Tabs defaultValue={pendingInvitations.length > 0 ? "shared" : "cloud"}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="cloud">My Docs</TabsTrigger>
                  <TabsTrigger value="shared" className="relative">
                    Shared
                    {pendingInvitations.length > 0 && (
                      <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                        {pendingInvitations.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="trash">Trash</TabsTrigger>
                  <TabsTrigger value="local">File</TabsTrigger>
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
                            className="hover:bg-muted/50 transition-colors"
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 cursor-pointer" onClick={() => handleLoadFromCloud(doc)}>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold">{doc.title}</h4>
                                    {doc.is_master_document && (
                                      <Badge variant="secondary" className="text-xs">
                                        <Brain className="h-3 w-3 mr-1" />
                                        Auto
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {doc.word_count.toLocaleString()} words
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Updated: {new Date(doc.updated_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  onClick={(e) => { e.stopPropagation(); setDeletingDocId(doc.id); }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="shared">
                  <ScrollArea className="h-[400px] pr-4">
                    {/* Pending Invitations */}
                    {pendingInvitations.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Pending Invitations ({pendingInvitations.length})
                        </h4>
                        <div className="space-y-2">
                          {pendingInvitations.map((invite: any) => (
                            <Card key={invite.id} className="border-primary/30 bg-primary/5">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold truncate">{invite.doc_title}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      From: {invite.owner_name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="outline" className="text-xs capitalize">{invite.permission}</Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(invite.invited_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <Button
                                      size="sm"
                                      onClick={() => acceptInvitationMutation.mutate(invite.id)}
                                      disabled={acceptInvitationMutation.isPending}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                      Accept
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => declineInvitationMutation.mutate(invite.id)}
                                      disabled={declineInvitationMutation.isPending}
                                    >
                                      Decline
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Accepted shared docs */}
                    {sharedDocuments.length === 0 && pendingInvitations.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No shared documents or invitations</p>
                    ) : sharedDocuments.length > 0 && (
                      <div>
                        {pendingInvitations.length > 0 && (
                          <h4 className="text-sm font-semibold text-muted-foreground mb-2">Shared with you</h4>
                        )}
                        <div className="space-y-2">
                          {sharedDocuments.map((doc: any) => (
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
                                      {doc.word_count?.toLocaleString() || 0} words
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Updated: {new Date(doc.updated_at).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <Badge variant="outline" className="text-xs capitalize">{doc._permission}</Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="trash">
                  <ScrollArea className="h-[400px] pr-4">
                    {trashedDocuments.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">Trash is empty</p>
                    ) : (
                      <div className="space-y-2">
                        {trashedDocuments.map((doc: any) => (
                          <Card key={doc.id} className="hover:bg-muted/50 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold">{doc.title}</h4>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Deleted: {new Date(doc.deleted_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => restoreDocMutation.mutate(doc.id)}
                                  disabled={restoreDocMutation.isPending}
                                >
                                  Restore
                                </Button>
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

          {/* Delete confirmation */}
          {deletingDocId && (
            <Dialog open={!!deletingDocId} onOpenChange={() => setDeletingDocId(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Move to Trash?</DialogTitle>
                  <DialogDescription>
                    This document will be moved to trash and permanently deleted after 30 days. You can restore it from the Trash tab before then.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeletingDocId(null)}>Cancel</Button>
                  <Button variant="destructive" onClick={() => softDeleteMutation.mutate(deletingDocId)} disabled={softDeleteMutation.isPending}>
                    {softDeleteMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    Move to Trash
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <div className="h-6 w-px bg-border mx-2" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowShareDialog(true)}
            disabled={!currentDocId}
            title={currentDocId ? "Share with friend" : "Save document first to share"}
          >
            <Users className="h-4 w-4 mr-2" />
            Share
          </Button>

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

          {/* Collab button */}
          <Button variant="outline" size="sm" onClick={() => setShowCollabDialog(true)}>
            <Users className="h-4 w-4 mr-2" />
            Collab
          </Button>

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
                    <CatalystPresenceBar documentId={currentDocId} />
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
                documentTheme={documentTheme}
                onThemeChange={setDocumentTheme}
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
      </>
      )}
      <CatalystImportDialog 
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={handleImport}
      />

      {/* Template Selection Dialog */}
      <Dialog open={showNewTemplateDialog} onOpenChange={setShowNewTemplateDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Choose a Template</DialogTitle>
            <DialogDescription>
              Start with a pre-formatted structure to jumpstart your writing.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 py-4">
              {DOCUMENT_TEMPLATES.map((template) => (
                <Card 
                  key={template.id} 
                  className="cursor-pointer hover:border-primary transition-colors flex flex-col h-full"
                  onClick={() => createNewDocument(template)}
                >
                  <CardHeader className="p-4 pb-2 flex flex-row items-center gap-2 space-y-0">
                    <div className="bg-primary/10 p-2 rounded-md text-primary">
                      {template.icon}
                    </div>
                    <CardTitle className="text-base">{template.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 flex-1 flex flex-col">
                    <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                    {template.content && (
                      <div className="mt-auto p-2 bg-muted/50 rounded text-[10px] text-muted-foreground line-clamp-3 overflow-hidden" dangerouslySetInnerHTML={{ __html: template.content.replace(/<[^>]*>?/gm, ' ') }} />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Collaborators Dialog */}
      <CatalystCollaborators
        documentId={currentDocId}
        documentTitle={documentTitle}
        open={showCollabDialog}
        onOpenChange={setShowCollabDialog}
      />
    </div>
  );
}
