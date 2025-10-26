import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, ChevronRight, ChevronDown, Trash2, Edit2, Sparkles, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Chapter {
  id: string;
  title: string;
  content: string;
  level: number;
  order_index: number;
  word_count: number;
  parent_id?: string;
  children?: Chapter[];
}

interface ChapterManagerProps {
  documentId: string;
  chapters: Chapter[];
  onChaptersChange: () => void;
  onChapterSelect: (chapter: Chapter) => void;
}

export function ChapterManager({ documentId, chapters, onChaptersChange, onChapterSelect }: ChapterManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterParent, setNewChapterParent] = useState<string>('');
  const [generatingChapter, setGeneratingChapter] = useState(false);
  const [generateParams, setGenerateParams] = useState({
    title: '',
    outline: '',
    context: '',
    documentType: 'academic',
    tone: 'professional',
  });

  const toggleExpand = (chapterId: string) => {
    setExpandedChapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId);
      } else {
        newSet.add(chapterId);
      }
      return newSet;
    });
  };

  const handleAddChapter = async () => {
    if (!newChapterTitle.trim()) {
      toast({ title: 'Error', description: 'Please enter a chapter title', variant: 'destructive' });
      return;
    }

    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in', variant: 'destructive' });
      return;
    }

    try {
      const parentLevel = newChapterParent 
        ? chapters.find(c => c.id === newChapterParent)?.level || 0
        : 0;

      const { error } = await supabase
        .from('catalyst_chapters')
        .insert({
          user_id: user.id,
          document_id: documentId,
          title: newChapterTitle,
          content: '',
          parent_id: newChapterParent || null,
          level: parentLevel + 1,
          order_index: chapters.length,
        });

      if (error) throw error;

      toast({ title: 'Success', description: 'Chapter added successfully' });
      setShowAddDialog(false);
      setNewChapterTitle('');
      setNewChapterParent('');
      onChaptersChange();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleGenerateChapter = async () => {
    if (!generateParams.title.trim()) {
      toast({ title: 'Error', description: 'Please enter a chapter title', variant: 'destructive' });
      return;
    }

    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in', variant: 'destructive' });
      return;
    }

    setGeneratingChapter(true);
    try {
      const { data, error } = await supabase.functions.invoke('catalyst-ai-generate-chapter', {
        body: generateParams,
      });

      if (error) throw error;

      const { error: insertError } = await supabase
        .from('catalyst_chapters')
        .insert({
          user_id: user.id,
          document_id: documentId,
          title: generateParams.title,
          content: data.content,
          level: 1,
          order_index: chapters.length,
          word_count: data.content.split(/\s+/).length,
        });

      if (insertError) throw insertError;

      toast({ title: 'Success!', description: 'AI chapter generated successfully' });
      setShowGenerateDialog(false);
      setGenerateParams({ title: '', outline: '', context: '', documentType: 'academic', tone: 'professional' });
      onChaptersChange();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to generate chapter', variant: 'destructive' });
    } finally {
      setGeneratingChapter(false);
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm('Are you sure you want to delete this chapter?')) return;

    try {
      const { error } = await supabase
        .from('catalyst_chapters')
        .delete()
        .eq('id', chapterId);

      if (error) throw error;

      toast({ title: 'Success', description: 'Chapter deleted' });
      onChaptersChange();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const renderChapter = (chapter: Chapter, depth = 0) => {
    const isExpanded = expandedChapters.has(chapter.id);
    const hasChildren = chapter.children && chapter.children.length > 0;

    return (
      <div key={chapter.id} style={{ marginLeft: `${depth * 20}px` }} className="mb-1">
        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 group">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => hasChildren && toggleExpand(chapter.id)}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : (
              <div className="w-4" />
            )}
          </Button>
          
          <div className="flex-1 cursor-pointer" onClick={() => onChapterSelect(chapter)}>
            <div className="font-medium text-sm">{chapter.title}</div>
            <div className="text-xs text-muted-foreground">{chapter.word_count} words</div>
          </div>

          <div className="opacity-0 group-hover:opacity-100 flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => handleDeleteChapter(chapter.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {isExpanded && hasChildren && chapter.children?.map(child => renderChapter(child, depth + 1))}
      </div>
    );
  };

  const buildTree = (chapters: Chapter[]): Chapter[] => {
    const map = new Map<string, Chapter>();
    const tree: Chapter[] = [];

    chapters.forEach(chapter => {
      map.set(chapter.id, { ...chapter, children: [] });
    });

    chapters.forEach(chapter => {
      const node = map.get(chapter.id)!;
      if (chapter.parent_id) {
        const parent = map.get(chapter.parent_id);
        if (parent) {
          parent.children!.push(node);
        } else {
          tree.push(node);
        }
      } else {
        tree.push(node);
      }
    });

    return tree.sort((a, b) => a.order_index - b.order_index);
  };

  const chapterTree = buildTree(chapters);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Chapters</h3>
        <div className="flex gap-2">
          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Sparkles className="h-4 w-4 mr-2" />
                AI Generate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>AI Chapter Generator</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Chapter Title *</label>
                  <Input
                    placeholder="e.g., Introduction to Quantum Mechanics"
                    value={generateParams.title}
                    onChange={(e) => setGenerateParams({ ...generateParams, title: e.target.value })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Document Type</label>
                    <Select value={generateParams.documentType} onValueChange={(value) => setGenerateParams({ ...generateParams, documentType: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="academic">Academic/Research</SelectItem>
                        <SelectItem value="thesis">Thesis/Dissertation</SelectItem>
                        <SelectItem value="book">Book</SelectItem>
                        <SelectItem value="article">Article</SelectItem>
                        <SelectItem value="essay">Essay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tone</label>
                    <Select value={generateParams.tone} onValueChange={(value) => setGenerateParams({ ...generateParams, tone: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="academic">Academic</SelectItem>
                        <SelectItem value="conversational">Conversational</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Outline/Key Points (optional)</label>
                  <Textarea
                    placeholder="- Introduction to the topic&#10;- Main concepts&#10;- Examples and applications&#10;- Conclusion"
                    value={generateParams.outline}
                    onChange={(e) => setGenerateParams({ ...generateParams, outline: e.target.value })}
                    rows={5}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Context/Background (optional)</label>
                  <Textarea
                    placeholder="Provide any background information or context that should inform the chapter..."
                    value={generateParams.context}
                    onChange={(e) => setGenerateParams({ ...generateParams, context: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
                <Button onClick={handleGenerateChapter} disabled={generatingChapter}>
                  {generatingChapter && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Generate Chapter
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Chapter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Chapter</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Chapter Title</label>
                  <Input
                    placeholder="Enter chapter title..."
                    value={newChapterTitle}
                    onChange={(e) => setNewChapterTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Parent Chapter (optional)</label>
                  <Select value={newChapterParent} onValueChange={setNewChapterParent}>
                    <SelectTrigger>
                      <SelectValue placeholder="None (top level)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None (top level)</SelectItem>
                      {chapters.map(ch => (
                        <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button onClick={handleAddChapter}>Add Chapter</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg p-2 max-h-[400px] overflow-y-auto">
        {chapterTree.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No chapters yet. Add or generate your first chapter!</p>
          </div>
        ) : (
          chapterTree.map(chapter => renderChapter(chapter))
        )}
      </div>
    </div>
  );
}