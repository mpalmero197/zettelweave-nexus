import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Download, X, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface FileRecord {
  id: string;
  file_name: string;
  file_type: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
}

interface FileViewerProps {
  file: FileRecord;
  onClose: () => void;
}

export function FileViewer({ file, onClose }: FileViewerProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [fileUrl, setFileUrl] = useState<string>('');

  useEffect(() => {
    loadFile();
  }, [file]);

  const loadFile = async () => {
    try {
      // Get signed URL for the file
      const { data: urlData, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(file.storage_path, 3600);

      if (urlError) throw urlError;
      setFileUrl(urlData.signedUrl);

      // For text-based files, fetch content
      if (isTextBased(file.mime_type)) {
        const { data, error } = await supabase.storage
          .from('documents')
          .download(file.storage_path);

        if (error) throw error;

        const text = await data.text();
        setContent(text);
      }
    } catch (error) {
      console.error('Error loading file:', error);
      toast.error('Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const isTextBased = (mimeType: string): boolean => {
    return (
      mimeType.includes('text') ||
      mimeType.includes('json') ||
      mimeType.includes('xml') ||
      mimeType.includes('csv') ||
      mimeType.includes('markdown')
    );
  };

  const isImage = (mimeType: string): boolean => {
    return mimeType.startsWith('image/');
  };

  const isPDF = (mimeType: string): boolean => {
    return mimeType.includes('pdf');
  };

  const isOfficeDoc = (mimeType: string): boolean => {
    return (
      mimeType.includes('word') ||
      mimeType.includes('document') ||
      mimeType.includes('spreadsheet') ||
      mimeType.includes('sheet') ||
      mimeType.includes('presentation') ||
      mimeType.includes('officedocument')
    );
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = file.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {file.file_name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <Tabs defaultValue="preview" className="h-full flex flex-col">
              <TabsList>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                {isTextBased(file.mime_type) && (
                  <TabsTrigger value="raw">Raw Content</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="preview" className="flex-1 overflow-hidden mt-4">
                <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
                  {isImage(file.mime_type) ? (
                    <img
                      src={fileUrl}
                      alt={file.file_name}
                      className="max-w-full h-auto mx-auto"
                    />
                  ) : isPDF(file.mime_type) ? (
                    <iframe
                      src={fileUrl}
                      className="w-full h-[60vh] border-0"
                      title={file.file_name}
                    />
                  ) : isOfficeDoc(file.mime_type) ? (
                    <iframe
                      src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`}
                      className="w-full h-[60vh] border-0"
                      title={file.file_name}
                    />
                  ) : isTextBased(file.mime_type) ? (
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {content}
                    </pre>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        Preview not available for this file type
                      </p>
                      <Button onClick={handleDownload} variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download to View
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {isTextBased(file.mime_type) && (
                <TabsContent value="raw" className="flex-1 overflow-hidden mt-4">
                  <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {content}
                    </pre>
                  </ScrollArea>
                </TabsContent>
              )}
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
