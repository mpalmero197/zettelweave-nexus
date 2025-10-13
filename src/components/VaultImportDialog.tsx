import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  Database, 
  FolderOpen,
  Image,
  Download,
  AlertCircle
} from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { toast } from "sonner";

interface VaultImportDialogProps {
  onImportCards: (cards: Omit<ZettelCardType, 'id' | 'created' | 'modified'>[]) => void;
}

interface ParsedFile {
  name: string;
  content: string;
  path: string;
  type: 'markdown' | 'image' | 'other';
  size: number;
}

interface NotionPage {
  title: string;
  content: string;
  properties: Record<string, any>;
  children: NotionPage[];
}

export const VaultImportDialog = ({ onImportCards }: VaultImportDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [activeTab, setActiveTab] = useState("obsidian");

  const processObsidianVault = async (files: FileList) => {
    setIsProcessing(true);
    setProgress(0);
    
    const parsed: ParsedFile[] = [];
    const totalFiles = files.length;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress((i / totalFiles) * 100);
      
      if (file.name.startsWith('.')) continue; // Skip hidden files
      
      let type: 'markdown' | 'image' | 'other' = 'other';
      if (file.name.endsWith('.md')) type = 'markdown';
      else if (file.type.startsWith('image/')) type = 'image';
      
      let content = '';
      if (type === 'markdown') {
        content = await file.text();
      } else if (type === 'image') {
        content = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      }
      
      parsed.push({
        name: file.name,
        content,
        path: file.webkitRelativePath || file.name,
        type,
        size: file.size
      });
    }
    
    setParsedFiles(parsed);
    setProgress(100);
    setIsProcessing(false);
    
    toast(`Parsed ${parsed.length} files from Obsidian vault`);
  };

  const processNotionExport = async (files: FileList) => {
    setIsProcessing(true);
    setProgress(0);
    
    const parsed: ParsedFile[] = [];
    const totalFiles = files.length;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress((i / totalFiles) * 100);
      
      if (file.name.startsWith('.')) continue;
      
      let type: 'markdown' | 'image' | 'other' = 'other';
      if (file.name.endsWith('.md') || file.name.endsWith('.txt')) type = 'markdown';
      else if (file.type.startsWith('image/')) type = 'image';
      
      let content = '';
      if (type === 'markdown') {
        content = await file.text();
        // Clean up Notion export formatting
        content = content
          .replace(/!\[.*?\]\((.*?)\)/g, '![]($1)') // Fix image links
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove internal links
          .trim();
      } else if (type === 'image') {
        content = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
      }
      
      parsed.push({
        name: file.name,
        content,
        path: file.webkitRelativePath || file.name,
        type,
        size: file.size
      });
    }
    
    setParsedFiles(parsed);
    setProgress(100);
    setIsProcessing(false);
    
    toast(`Parsed ${parsed.length} files from Notion export`);
  };

  const convertToZettelCards = () => {
    const cards: Omit<ZettelCardType, 'id' | 'created' | 'modified'>[] = [];
    
    parsedFiles.forEach((file, index) => {
      if (file.type === 'markdown') {
        // Extract title from filename or first heading
        let title = file.name.replace(/\.md$/, '');
        const firstHeading = file.content.match(/^#\s+(.+)$/m);
        if (firstHeading) {
          title = firstHeading[1];
        }
        
        // Extract tags from content
        const tagMatches = file.content.match(/#[\w-]+/g);
        const tags = tagMatches ? tagMatches.map(tag => tag.slice(1)) : [];
        
        // Determine category based on folder structure or content
        let category = "000"; // Default to General Knowledge
        const pathParts = file.path.split('/');
        if (pathParts.length > 1) {
          const folder = pathParts[0].toLowerCase();
          if (folder.includes('science')) category = "500";
          else if (folder.includes('literature')) category = "800";
          else if (folder.includes('history')) category = "900";
          else if (folder.includes('art')) category = "700";
          else if (folder.includes('philosophy')) category = "100";
          else if (folder.includes('language')) category = "400";
        }
        
        // Generate description from first paragraph
        const firstParagraph = file.content
          .replace(/^#.*$/gm, '') // Remove headings
          .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
          .split('\n\n')[0]
          .trim()
          .substring(0, 200);
        
        cards.push({
          title,
          content: file.content,
          description: firstParagraph || "Imported from external source",
          category,
          number: `${category}.${String(index + 1).padStart(3, '0')}`,
          tags: [...tags, activeTab === "obsidian" ? "obsidian" : "notion", "imported"],
          linkedCards: [],
          imageUrl: undefined
        });
      } else if (file.type === 'image') {
        // Create card for standalone images
        cards.push({
          title: `Image: ${file.name}`,
          content: `Imported image from ${activeTab} vault.`,
          description: `Image file: ${file.name}`,
          category: "700", // Arts category
          number: `700.${String(index + 1).padStart(3, '0')}`,
          tags: ["image", activeTab === "obsidian" ? "obsidian" : "notion", "imported"],
          linkedCards: [],
          imageUrl: file.content
        });
      }
    });
    
    onImportCards(cards);
    setIsOpen(false);
    setParsedFiles([]);
    toast(`Successfully imported ${cards.length} cards!`);
  };

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    if (activeTab === "obsidian") {
      await processObsidianVault(files);
    } else {
      await processNotionExport(files);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Import Vault
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Knowledge Vault</DialogTitle>
          <DialogDescription>
            Import your entire Obsidian vault or Notion export into PendragonX
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="obsidian" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Obsidian Vault
            </TabsTrigger>
            <TabsTrigger value="notion" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Notion Export
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="obsidian" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Obsidian Vault Import</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="obsidian-files">Select Vault Folder</Label>
                  <Input
                    id="obsidian-files"
                    type="file"
                    {...({ webkitdirectory: "" } as any)}
                    multiple
                    onChange={handleFileSelection}
                    disabled={isProcessing}
                    className="cursor-pointer"
                  />
                  <p className="text-sm text-muted-foreground">
                    Select your entire Obsidian vault folder. All markdown files and images will be imported.
                  </p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Import Instructions</h4>
                      <ul className="text-sm text-blue-700 mt-2 space-y-1">
                        <li>• Click "Choose Folder" and select your Obsidian vault directory</li>
                        <li>• All .md files will be converted to zettel cards</li>
                        <li>• Images will be preserved and linked</li>
                        <li>• Tags and wikilinks will be extracted</li>
                        <li>• Folder structure will determine categories</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="notion" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notion Export Import</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notion-files">Select Notion Export</Label>
                  <Input
                    id="notion-files"
                    type="file"
                    {...({ webkitdirectory: "" } as any)}
                    multiple
                    onChange={handleFileSelection}
                    disabled={isProcessing}
                    className="cursor-pointer"
                  />
                  <p className="text-sm text-muted-foreground">
                    Select the unzipped Notion export folder. All pages and media will be imported.
                  </p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-900">Export Instructions</h4>
                      <ol className="text-sm text-green-700 mt-2 space-y-1">
                        <li>1. In Notion, go to Settings & Members → Settings</li>
                        <li>2. Click "Export all workspace content"</li>
                        <li>3. Choose "Markdown & CSV" format</li>
                        <li>4. Download and unzip the export</li>
                        <li>5. Select the unzipped folder here</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Processing files...</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}
        
        {parsedFiles.length > 0 && !isProcessing && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Import Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>{parsedFiles.filter(f => f.type === 'markdown').length} Markdown files</span>
                </div>
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  <span>{parsedFiles.filter(f => f.type === 'image').length} Images</span>
                </div>
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  <span>{parsedFiles.filter(f => f.type === 'other').length} Other files</span>
                </div>
              </div>
              
              <div className="max-h-40 overflow-y-auto border rounded p-2">
                {parsedFiles.slice(0, 10).map((file, index) => (
                  <div key={index} className="flex items-center justify-between py-1 text-sm">
                    <span className="truncate">{file.path}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {(file.size / 1024).toFixed(1)}KB
                    </span>
                  </div>
                ))}
                {parsedFiles.length > 10 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    ...and {parsedFiles.length - 10} more files
                  </p>
                )}
              </div>
              
              <Button onClick={convertToZettelCards} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Import {parsedFiles.filter(f => f.type !== 'other').length} Items as Cards
              </Button>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
};