import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Edit3, Save } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface DocumentViewerProps {
  file: File;
  onClose: () => void;
  onSave?: (content: string) => void;
}

export function DocumentViewer({ file, onClose, onSave }: DocumentViewerProps) {
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFile = async () => {
      setIsLoading(true);
      try {
        if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
          // Text-based files
          const text = await file.text();
          setContent(text);
          setEditedContent(text);
        } else if (file.type === 'application/pdf') {
          // PDF files - would need a PDF library in a real implementation
          setContent('PDF viewing requires additional libraries. File uploaded successfully.');
        } else if (file.type.includes('word') || file.name.endsWith('.docx')) {
          // Word documents - would need a Word processing library
          setContent('Word document viewing requires additional libraries. File uploaded successfully.');
        } else {
          setContent('File type not supported for preview. File uploaded successfully.');
        }
      } catch (error) {
        console.error('Error loading file:', error);
        setContent('Error loading file content.');
        toast.error('Failed to load file content');
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [file]);

  const handleSave = () => {
    if (onSave) {
      onSave(editedContent);
      setContent(editedContent);
      setIsEditing(false);
      toast.success('Document saved!');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([isEditing ? editedContent : content], { type: file.type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold truncate">{file.name}</h3>
            <span className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(1)} KB
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {content && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="h-8 px-2"
                >
                  <Download className="h-3 w-3" />
                </Button>
                
                {file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt') ? (
                  <Button
                    variant={isEditing ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (isEditing) {
                        handleSave();
                      } else {
                        setIsEditing(true);
                      }
                    }}
                    className="h-8 px-2"
                  >
                    {isEditing ? <Save className="h-3 w-3" /> : <Edit3 className="h-3 w-3" />}
                  </Button>
                ) : null}
              </>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 px-2"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isEditing ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-full min-h-[400px] p-4 border border-border rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
              placeholder="Start typing..."
            />
          ) : (
            <div className="bg-background border border-border rounded-md p-4 h-full overflow-auto">
              {file.name.endsWith('.md') ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>
                    {content}
                  </ReactMarkdown>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-mono text-sm text-foreground">
                  {content}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {isEditing && (
          <div className="p-4 border-t border-border flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditing(false);
                setEditedContent(content);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
            >
              Save Changes
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}