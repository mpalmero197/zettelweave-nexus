import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Heading1, 
  Heading2, 
  List, 
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Save,
  Eye,
  BookOpen,
  Tag as TagIcon,
  Calendar
} from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { z } from 'zod';
import { sanitizeUserInput } from '@/utils/security';
import DOMPurify from 'dompurify';

const isHtmlContent = (content: string) => /<[a-z][\s\S]*>/i.test(content);

interface Note {
  id: string;
  title: string;
  content: string;
  is_favorite: boolean;
  tags: string[];
  notebook_id?: string;
  created_at: string;
  updated_at: string;
}

interface Notebook {
  id: string;
  name: string;
  color: string;
}

interface EditNoteDialogProps {
  note: Note;
  notebooks: Notebook[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedNote: Note) => void;
}

const noteSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  content: z.string().max(100000, 'Content must be less than 100,000 characters'),
  tags: z.array(z.string()).max(50, 'Maximum 50 tags allowed')
});

export function EditNoteDialog({ note, notebooks, isOpen, onClose, onSave }: EditNoteDialogProps) {
  const [formData, setFormData] = useState({
    title: note.title,
    content: note.content,
    notebook_id: note.notebook_id,
    tags: note.tags,
  });
  const [newTag, setNewTag] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: note.title,
        content: note.content,
        notebook_id: note.notebook_id,
        tags: note.tags,
      });
      setValidationErrors({});
    }
  }, [note, isOpen]);

  const handleSave = () => {
    // Validate
    const validation = noteSchema.safeParse({
      title: formData.title,
      content: formData.content,
      tags: formData.tags
    });

    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach(err => {
        errors[err.path[0] as string] = err.message;
      });
      setValidationErrors(errors);
      return;
    }

    // Sanitize all user inputs to prevent XSS and code injection
    const updatedNote: Note = {
      ...note,
      title: sanitizeUserInput(formData.title.trim()),
      content: sanitizeUserInput(formData.content),
      notebook_id: formData.notebook_id,
      tags: formData.tags.map(tag => sanitizeUserInput(tag)),
      updated_at: new Date().toISOString()
    };
    onSave(updatedNote);
  };

  const addTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = document.getElementById('note-content') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = formData.content.substring(start, end);
    const beforeText = formData.content.substring(0, start);
    const afterText = formData.content.substring(end);
    
    const newContent = beforeText + before + selected + after + afterText;
    setFormData(prev => ({ ...prev, content: newContent }));
    
    // Set cursor position after insertion
    setTimeout(() => {
      const newPos = start + before.length + selected.length;
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const getNotebookName = (notebookId?: string) => {
    if (!notebookId) return 'No Notebook';
    const notebook = notebooks.find(nb => nb.id === notebookId);
    return notebook?.name || 'Unknown';
  };

  const getNotebookColor = (notebookId?: string) => {
    if (!notebookId) return '#6b7280';
    const notebook = notebooks.find(nb => nb.id === notebookId);
    return notebook?.color || '#6b7280';
  };

  const wordCount = formData.content.split(/\s+/).filter(Boolean).length;
  const charCount = formData.content.length;
  const sanitizedPreviewContent = useMemo(() => DOMPurify.sanitize(formData.content), [formData.content]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Edit Note
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Title and Metadata */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Note title..."
                className={validationErrors.title ? 'border-destructive' : ''}
              />
              {validationErrors.title && (
                <p className="text-sm text-destructive">{validationErrors.title}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="notebook">
                  <BookOpen className="h-4 w-4 inline mr-1" />
                  Notebook
                </Label>
                <Select 
                  value={formData.notebook_id || 'no-notebook'} 
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    notebook_id: value === 'no-notebook' ? undefined : value 
                  }))}
                >
                  <SelectTrigger id="notebook">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-notebook">No Notebook</SelectItem>
                    {notebooks.map(notebook => (
                      <SelectItem key={notebook.id} value={notebook.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: notebook.color }} 
                          />
                          {notebook.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tags">
                  <TagIcon className="h-4 w-4 inline mr-1" />
                  Tags
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add tag..."
                    className="flex-1"
                  />
                  <Button onClick={addTag} size="sm" type="button">Add</Button>
                </div>
              </div>
            </div>

            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {formData.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 hover:bg-transparent"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Content Editor */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview">
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </TabsTrigger>
              </TabsList>
              <div className="text-xs text-muted-foreground flex items-center gap-4">
                <span>{wordCount} words</span>
                <span>{charCount} characters</span>
              </div>
            </div>

            <TabsContent value="edit" className="mt-2 flex-1 min-h-0 overflow-hidden data-[state=active]:flex data-[state=inactive]:hidden">
              {/* Markdown Toolbar */}
              <div className="flex flex-wrap gap-1 p-2 bg-muted/50 rounded-md">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => insertMarkdown('**', '**')}
                  title="Bold"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => insertMarkdown('*', '*')}
                  title="Italic"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => insertMarkdown('~~', '~~')}
                  title="Strikethrough"
                >
                  <Strikethrough className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-8" />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => insertMarkdown('\n# ')}
                  title="Heading 1"
                >
                  <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => insertMarkdown('\n## ')}
                  title="Heading 2"
                >
                  <Heading2 className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-8" />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => insertMarkdown('\n- ')}
                  title="Bullet List"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => insertMarkdown('\n1. ')}
                  title="Numbered List"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => insertMarkdown('\n> ')}
                  title="Quote"
                >
                  <Quote className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => insertMarkdown('`', '`')}
                  title="Code"
                >
                  <Code className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-8" />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => insertMarkdown('[', '](url)')}
                  title="Link"
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => insertMarkdown('![alt](', ')')}
                  title="Image"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </div>

              <ScrollArea className="flex-1 border rounded-md">
                <Textarea
                  id="note-content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your note content here... (Markdown supported)"
                  className="min-h-[400px] border-0 focus-visible:ring-0 font-mono resize-none"
                />
              </ScrollArea>
              {validationErrors.content && (
                <p className="text-sm text-destructive">{validationErrors.content}</p>
              )}
            </TabsContent>

            <TabsContent value="preview" className="mt-2 flex-1 min-h-0 overflow-hidden data-[state=active]:flex data-[state=inactive]:hidden">
              <ScrollArea className="h-full border rounded-md">
                <div className="p-6 prose prose-sm max-w-none dark:prose-invert">
                  {isHtmlContent(formData.content) ? (
                    <div dangerouslySetInnerHTML={{ __html: sanitizedPreviewContent }} />
                  ) : (
                    <ReactMarkdown>{formData.content || '*No content to preview*'}</ReactMarkdown>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Footer Metadata */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <div 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: getNotebookColor(formData.notebook_id) }} 
                />
                {getNotebookName(formData.notebook_id)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Created: {format(new Date(note.created_at), 'PPP')}
              </span>
            </div>
            <span>Last updated: {format(new Date(note.updated_at), 'PPp')}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
