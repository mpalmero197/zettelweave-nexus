import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Download, Save, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';

interface StudyGuideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  isLoading: boolean;
  loadingText?: string;
  mapTitle?: string;
}

export function StudyGuideDialog({ open, onOpenChange, content, isLoading, loadingText, mapTitle }: StudyGuideDialogProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleSaveAsNote = async () => {
    if (!user) { toast.error('Please sign in'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('notes').insert({
        user_id: user.id,
        title: `Study Guide: ${mapTitle || 'Mind Map'}`,
        content: content,
        tags: ['study-guide', 'mind-map'],
      });
      if (error) throw error;
      toast.success('Saved as note');
    } catch {
      toast.error('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF();
      const title = `Study Guide: ${mapTitle || 'Mind Map'}`;
      doc.setFontSize(16);
      doc.text(title, 20, 20);
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(content, 170);
      let y = 35;
      for (const line of lines) {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(line, 20, y);
        y += 6;
      }
      doc.save(`study-guide-${Date.now()}.pdf`);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Study Guide
          </DialogTitle>
          <DialogDescription>AI-generated study guide from your mind map</DialogDescription>
        </DialogHeader>

        {!isLoading && content && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleCopy}>
              <Copy className="h-3 w-3 mr-1" />Copy
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleSaveAsNote} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
              Save as Note
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleDownloadPDF}>
              <Download className="h-3 w-3 mr-1" />PDF
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground animate-pulse">{loadingText || 'Generating study guide...'}</p>
            </div>
          ) : content ? (
            <div className="prose prose-sm dark:prose-invert max-w-none px-1">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">No content generated yet</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
