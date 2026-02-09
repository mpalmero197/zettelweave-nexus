import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, ChevronRight, ChevronDown, Trash2, Sparkles, GripVertical, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Chapter {
  id: string;
  title: string;
  content: string;
  level: number;
  order_index: number;
  word_count: number;
  parent_id?: string;
  status?: string;
  children?: Chapter[];
}

interface ChapterManagerProps {
  documentId: string;
  chapters: Chapter[];
  onChaptersChange: () => void;
  onChapterSelect: (chapter: Chapter) => void;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-muted text-muted-foreground' },
  { value: 'in-progress', label: 'In Progress', color: 'bg-blue-500/20 text-blue-600' },
  { value: 'revised', label: 'Revised', color: 'bg-yellow-500/20 text-yellow-600' },
  { value: 'final', label: 'Final', color: 'bg-green-500/20 text-green-600' },
];

export function ChapterManager({ documentId, chapters, onChaptersChange, onChapterSelect }: ChapterManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterParent, setNewChapterParent] = useState<string>('');
  const [generatingChapter, setGeneratingChapter] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
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
      if (newSet.has(chapterId)) newSet.delete(chapterId);
      else newSet.add(chapterId);
      return newSet;
    });
  };

  const handleAddChapter = async () => {
    if (!newChapterTitle.trim() || !user) return;

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
      toast({ title: 'Chapter added' });
      setShowAddDialog(false);
      setNewChapterTitle('');
      setNewChapterParent('');
      onChaptersChange();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleGenerateChapter = async () => {
    if (!generateParams.title.trim() || !user) return;

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

      toast({ title: 'AI chapter generated!' });
      setShowGenerateDialog(false);
      setGenerateParams({ title: '', outline: '', context: '', documentType: 'academic', tone: 'professional' });
      onChaptersChange();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setGeneratingChapter(false);
    }
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!confirm('Delete this chapter?')) return;
    try {
      const { error } = await supabase.from('catalyst_chapters').delete().eq('id', chapterId);
      if (error) throw error;
      toast({ title: 'Chapter deleted' });
      onChaptersChange();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleStatusChange = async (chapterId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('catalyst_chapters')
        .update({ status })
        .eq('id', chapterId);
      if (error) throw error;
      onChaptersChange();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDragStart = (e: React.DragEvent, chapterId: string) => {
    setDraggedId(chapterId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const flatList = chapters.sort((a, b) => a.order_index - b.order_index);
    const draggedIdx = flatList.findIndex(c => c.id === draggedId);
    const targetIdx = flatList.findIndex(c => c.id === targetId);

    if (draggedIdx === -1 || targetIdx === -1) return;

    const reordered = [...flatList];
    const [moved] = reordered.splice(draggedIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    // Update order indices
    const updates = reordered.map((ch, i) => 
      supabase.from('catalyst_chapters').update({ order_index: i }).eq('id', ch.id)
    );
    await Promise.all(updates);
    setDraggedId(null);
    onChaptersChange();
  };

  const getStatusStyle = (status?: string) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  };

  const renderChapter = (chapter: Chapter, depth = 0) => {
    const isExpanded = expandedChapters.has(chapter.id);
    const hasChildren = chapter.children && chapter.children.length > 0;
    const statusInfo = getStatusStyle(chapter.status);

    return (
      <div key={chapter.id} style={{ marginLeft: `${depth * 16}px` }} className="mb-1">
        <div
          className={`flex items-center gap-1.5 p-2 rounded-lg hover:bg-muted/50 group transition-colors ${draggedId === chapter.id ? 'opacity-50' : ''}`}
          draggable
          onDragStart={(e) => handleDragStart(e, chapter.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, chapter.id)}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground/40 cursor-grab shrink-0" />
          
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 shrink-0"
            onClick={() => hasChildren && toggleExpand(chapter.id)}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
            ) : <div className="w-3.5" />}
          </Button>

          <div className="flex-1 cursor-pointer min-w-0" onClick={() => onChapterSelect(chapter)}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{chapter.title}</span>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${statusInfo.color}`}>
                {statusInfo.label}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">{chapter.word_count} words</span>
          </div>

          <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 shrink-0">
            <Select value={chapter.status || 'draft'} onValueChange={(v) => handleStatusChange(chapter.id, v)}>
              <SelectTrigger className="h-6 w-[80px] text-[10px] border-0 bg-transparent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
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
    chapters.forEach(ch => map.set(ch.id, { ...ch, children: [] }));
    chapters.forEach(ch => {
      const node = map.get(ch.id)!;
      if (ch.parent_id) {
        const parent = map.get(ch.parent_id);
        if (parent) parent.children!.push(node);
        else tree.push(node);
      } else {
        tree.push(node);
      }
    });
    return tree.sort((a, b) => a.order_index - b.order_index);
  };

  const chapterTree = buildTree(chapters);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Chapters</h3>
        <div className="flex gap-1">
          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                AI
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
                    placeholder="e.g., Introduction"
                    value={generateParams.title}
                    onChange={(e) => setGenerateParams({ ...generateParams, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Document Type</label>
                    <Select value={generateParams.documentType} onValueChange={(v) => setGenerateParams({ ...generateParams, documentType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="academic">Academic</SelectItem>
                        <SelectItem value="thesis">Thesis</SelectItem>
                        <SelectItem value="book">Book</SelectItem>
                        <SelectItem value="article">Article</SelectItem>
                        <SelectItem value="essay">Essay</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tone</label>
                    <Select value={generateParams.tone} onValueChange={(v) => setGenerateParams({ ...generateParams, tone: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <label className="text-sm font-medium">Outline (optional)</label>
                  <Textarea
                    placeholder="Key points..."
                    value={generateParams.outline}
                    onChange={(e) => setGenerateParams({ ...generateParams, outline: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Context (optional)</label>
                  <Textarea
                    placeholder="Background info..."
                    value={generateParams.context}
                    onChange={(e) => setGenerateParams({ ...generateParams, context: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>Cancel</Button>
                <Button onClick={handleGenerateChapter} disabled={generatingChapter}>
                  {generatingChapter && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Generate
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Chapter</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    placeholder="Chapter title..."
                    value={newChapterTitle}
                    onChange={(e) => setNewChapterTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Parent (optional)</label>
                  <Select value={newChapterParent} onValueChange={setNewChapterParent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Top level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Top level</SelectItem>
                      {chapters.map(ch => (
                        <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button onClick={handleAddChapter}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg p-1.5 max-h-[400px] overflow-y-auto">
        {chapterTree.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">No chapters yet</p>
          </div>
        ) : (
          chapterTree.map(ch => renderChapter(ch))
        )}
      </div>
    </div>
  );
}
