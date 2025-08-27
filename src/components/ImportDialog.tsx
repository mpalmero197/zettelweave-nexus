import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUp, Upload, FileText } from "lucide-react";
import { ZettelCard } from "@/types/zettel";
import { categorizeContent, generateZettelNumber, extractKeywords } from "@/utils/deweySystem";

interface ImportDialogProps {
  existingCards: ZettelCard[];
  onImportCards: (cards: Omit<ZettelCard, 'id' | 'created' | 'modified'>[]) => void;
  trigger?: React.ReactNode;
}

export function ImportDialog({ existingCards, onImportCards, trigger }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [parsing, setParsing] = useState(false);

  const parseMarkdownFile = async (file: File): Promise<Omit<ZettelCard, 'id' | 'created' | 'modified'>> => {
    const content = await file.text();
    
    // Extract title from filename or first heading
    let title = file.name.replace('.md', '').replace('.txt', '');
    const firstHeading = content.match(/^#\s+(.+)$/m);
    if (firstHeading) {
      title = firstHeading[1];
    }

    // Remove markdown headings from content for processing
    const cleanContent = content
      .replace(/^#+\s+.+$/gm, '') // Remove headings
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .trim();

    // Extract description from first paragraph
    const firstParagraph = cleanContent.split('\n\n')[0];
    const description = firstParagraph.length > 150 
      ? firstParagraph.substring(0, 147) + '...'
      : firstParagraph;

    // Auto-categorize and generate number
    const category = categorizeContent(cleanContent, title);
    const number = generateZettelNumber(category, existingCards.map(c => c.number));
    const tags = extractKeywords(title + " " + cleanContent);

    return {
      title,
      content: cleanContent,
      description,
      tags,
      category,
      number,
      linkedCards: [],
      author: "Imported"
    };
  };

  const handleImport = async () => {
    if (!files || files.length === 0) return;

    setParsing(true);
    try {
      const importedCards: Omit<ZettelCard, 'id' | 'created' | 'modified'>[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type === 'text/markdown' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
          const card = await parseMarkdownFile(file);
          importedCards.push(card);
        }
      }

      if (importedCards.length > 0) {
        onImportCards(importedCards);
        setOpen(false);
        setFiles(null);
      }
    } catch (error) {
      console.error('Error importing files:', error);
    } finally {
      setParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="bg-gradient-card hover:bg-secondary-hover">
            <FileUp className="h-4 w-4 mr-2" />
            Import Files
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Markdown Files
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="files">Select .md or .txt files</Label>
            <Input
              id="files"
              type="file"
              multiple
              accept=".md,.txt,text/markdown,text/plain"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground">
              You can select multiple markdown or text files to import as Zettel cards.
            </p>
          </div>

          {files && files.length > 0 && (
            <div className="space-y-2">
              <Label>Files to import:</Label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {Array.from(files).map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)}KB
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={!files || files.length === 0 || parsing}
            >
              {parsing ? (
                <>Processing...</>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import {files?.length || 0} files
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}