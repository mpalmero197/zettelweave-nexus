import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FileAudio, Play, Download, X } from 'lucide-react';
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

interface AttachmentDisplayProps {
  attachmentIds: string[];
  onRemove?: (attachmentId: string) => void;
  showControls?: boolean;
}

export function AttachmentDisplay({ 
  attachmentIds, 
  onRemove, 
  showControls = true 
}: AttachmentDisplayProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (attachmentIds.length > 0 && user) {
      loadAttachments();
    }
  }, [attachmentIds, user]);

  const loadAttachments = async () => {
    if (!user || attachmentIds.length === 0) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .in('id', attachmentIds)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setAttachments(data || []);
    } catch (error) {
      console.error('Error loading attachments:', error);
      toast({
        title: "Error loading attachments",
        description: "Unable to load attachments. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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

  if (attachmentIds.length === 0) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        Loading attachments...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-muted-foreground">
        Attachments ({attachments.length})
      </div>
      
      <div className="space-y-2">
        {attachments.map((attachment) => (
          <Card key={attachment.id} className="p-3">
            <CardContent className="p-0">
              <div className="flex items-center gap-3">
                <FileAudio className="h-4 w-4 text-primary flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                      {attachment.file_name}
                    </span>
                    
                    {showControls && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => playAudio(attachment)}
                          className="h-7 w-7 p-0"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadAttachment(attachment)}
                          className="h-7 w-7 p-0"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        {onRemove && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onRemove(attachment.id)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
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
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}