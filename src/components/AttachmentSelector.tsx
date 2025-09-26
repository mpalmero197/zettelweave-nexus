import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileAudio, Paperclip, Search, Play, Download, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  mime_type: string;
  duration?: number;
  created_at: string;
}

interface AttachmentSelectorProps {
  open: boolean;
  onClose: () => void;
  onAttach: (attachmentIds: string[]) => void;
  title: string;
  multiple?: boolean;
}

export function AttachmentSelector({ 
  open, 
  onClose, 
  onAttach, 
  title, 
  multiple = false 
}: AttachmentSelectorProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open && user) {
      loadAttachments();
    }
  }, [open, user]);

  const loadAttachments = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setAttachments(data || []);
    } catch (error) {
      console.error('Error loading attachments:', error);
      toast({
        title: "Error loading attachments",
        description: "Unable to load your attachments. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAttachmentToggle = (attachmentId: string) => {
    if (multiple) {
      setSelectedAttachments(prev => 
        prev.includes(attachmentId)
          ? prev.filter(id => id !== attachmentId)
          : [...prev, attachmentId]
      );
    } else {
      setSelectedAttachments([attachmentId]);
    }
  };

  const handleAttach = () => {
    onAttach(selectedAttachments);
    setSelectedAttachments([]);
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredAttachments = attachments.filter(attachment =>
    attachment.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    attachment.file_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getAudioUrl = async (attachment: Attachment) => {
    try {
      const { data } = await supabase.storage
        .from(attachment.storage_path.includes('snippet') ? 'audio-snippets' : 'meeting-recordings')
        .createSignedUrl(attachment.storage_path, 60);
      
      return data?.signedUrl;
    } catch (error) {
      console.error('Error getting audio URL:', error);
      return null;
    }
  };

  const playAudio = async (attachment: Attachment) => {
    const url = await getAudioUrl(attachment);
    if (url) {
      const audio = new Audio(url);
      audio.play();
    }
  };

  const downloadAttachment = async (attachment: Attachment) => {
    const url = await getAudioUrl(attachment);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paperclip className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search attachments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Attachments List */}
          <ScrollArea className="flex-1 min-h-[300px] max-h-[400px]">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading attachments...
              </div>
            ) : filteredAttachments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? 'No attachments match your search.' : 'No attachments found.'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedAttachments.includes(attachment.id)
                        ? 'bg-primary/10 border-primary'
                        : 'bg-card hover:bg-muted/50'
                    }`}
                    onClick={() => handleAttachmentToggle(attachment.id)}
                  >
                    <div className="flex items-start gap-3">
                      <FileAudio className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-medium text-sm truncate">
                            {attachment.file_name}
                          </h4>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                playAudio(attachment);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Play className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadAttachment(attachment);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {attachment.file_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.file_size)}
                          </span>
                          {attachment.duration && (
                            <span className="text-xs text-muted-foreground">
                              {formatDuration(attachment.duration)}
                            </span>
                          )}
                        </div>
                        
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(attachment.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Selected Count */}
          {selectedAttachments.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedAttachments.length} attachment{selectedAttachments.length !== 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAttach}
            disabled={selectedAttachments.length === 0}
          >
            Attach {selectedAttachments.length > 0 && `(${selectedAttachments.length})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}