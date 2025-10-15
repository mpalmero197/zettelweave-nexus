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
import { CardMergeDialog } from "./CardMergeDialog";
import { sanitizeCardInput, validateZettelCard } from "@/utils/security";

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
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [duplicatePairs, setDuplicatePairs] = useState<Array<{card1: Partial<ZettelCardType>, card2: Partial<ZettelCardType>}>>([]);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [processedCards, setProcessedCards] = useState<Partial<ZettelCardType>[]>([]);

  const processObsidianVault = async (files: FileList) => {
    setIsProcessing(true);
    setProgress(0);
    
    const parsed: ParsedFile[] = [];
    const totalFiles = files.length;
    let processedCount = 0;
    let errorCount = 0;
    let totalSize = 0;
    
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
    const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total
    
    console.log(`Starting Obsidian vault import: ${totalFiles} files`);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress((i / totalFiles) * 100);
      
      // Check file size limits
      if (file.size > MAX_FILE_SIZE) {
        console.warn(`Skipping large file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 5MB limit)`);
        errorCount++;
        continue;
      }
      
      totalSize += file.size;
      if (totalSize > MAX_TOTAL_SIZE) {
        toast.error('Import size limit exceeded (50MB). Please import in smaller batches.');
        break;
      }
      
      try {
        if (file.name.startsWith('.')) {
          console.log(`Skipping hidden file: ${file.name}`);
          continue;
        }
        
        let type: 'markdown' | 'image' | 'other' = 'other';
        if (file.name.endsWith('.md')) type = 'markdown';
        else if (file.type.startsWith('image/')) type = 'image';
        
        let content = '';
        if (type === 'markdown') {
          content = await file.text();
          console.log(`Processed markdown: ${file.name}`);
        } else if (type === 'image') {
          content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
          });
          console.log(`Processed image: ${file.name}`);
        }
        
        parsed.push({
          name: file.name,
          content,
          path: file.webkitRelativePath || file.name,
          type,
          size: file.size
        });
        processedCount++;
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        errorCount++;
      }
    }
    
    setParsedFiles(parsed);
    setProgress(100);
    setIsProcessing(false);
    
    console.log(`Import complete: ${processedCount} files processed, ${errorCount} errors, total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
    toast(`Parsed ${parsed.length} files from Obsidian vault (${errorCount} errors)`);
  };

  const processNotionExport = async (files: FileList) => {
    setIsProcessing(true);
    setProgress(0);
    
    const parsed: ParsedFile[] = [];
    const totalFiles = files.length;
    let processedCount = 0;
    let errorCount = 0;
    let totalSize = 0;
    
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
    const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total
    
    console.log(`Starting Notion export import: ${totalFiles} files`);
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress((i / totalFiles) * 100);
      
      // Check file size limits
      if (file.size > MAX_FILE_SIZE) {
        console.warn(`Skipping large file: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 5MB limit)`);
        errorCount++;
        continue;
      }
      
      totalSize += file.size;
      if (totalSize > MAX_TOTAL_SIZE) {
        toast.error('Import size limit exceeded (50MB). Please import in smaller batches.');
        break;
      }
      
      try {
        if (file.name.startsWith('.')) {
          console.log(`Skipping hidden file: ${file.name}`);
          continue;
        }
        
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
          console.log(`Processed markdown: ${file.name}`);
        } else if (type === 'image') {
          content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
          });
          console.log(`Processed image: ${file.name}`);
        }
        
        parsed.push({
          name: file.name,
          content,
          path: file.webkitRelativePath || file.name,
          type,
          size: file.size
        });
        processedCount++;
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        errorCount++;
      }
    }
    
    setParsedFiles(parsed);
    setProgress(100);
    setIsProcessing(false);
    
    console.log(`Import complete: ${processedCount} files processed, ${errorCount} errors, total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
    toast(`Parsed ${parsed.length} files from Notion export (${errorCount} errors)`);
  };

  const convertToZettelCards = () => {
    const cards: Omit<ZettelCardType, 'id' | 'created' | 'modified'>[] = [];
    const cardsByNumber = new Map<string, number>();
    let convertedCount = 0;
    let validationErrors = 0;
    
    const MAX_TAGS = 50;
    const MAX_LINKS = 100;
    
    console.log(`Converting ${parsedFiles.length} parsed files to cards...`);
    
    parsedFiles.forEach((file, index) => {
      if (file.type === 'markdown') {
        // Extract title from filename or first heading
        let title = file.name.replace(/\.md$/, '');
        const firstHeading = file.content.match(/^#\s+(.+)$/m);
        if (firstHeading) {
          title = firstHeading[1];
        }
        
        // Sanitize title and content
        const sanitizedTitle = sanitizeCardInput(title);
        const sanitizedContent = sanitizeCardInput(file.content);
        
        // Extract card number from filename if it matches the custom format
        let cardNumber = sanitizedTitle;
        const numberMatch = sanitizedTitle.match(/^(\d+(?:\.\d+)*(?:\.[A-Za-z]+)?(?:\.\d+)*)/);
        if (numberMatch) {
          cardNumber = numberMatch[1];
        }
        
        // Extract tags from content with validation and limits
        const tagMatches = file.content.match(/#[\w-]+/g);
        const extractedTags = tagMatches ? tagMatches.map(tag => tag.slice(1).substring(0, 50)) : [];
        const uniqueTags = [...new Set(extractedTags)].slice(0, MAX_TAGS - 2);
        const tags = [...uniqueTags, activeTab === "obsidian" ? "obsidian" : "notion", "imported"];
        
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
        const sanitizedCategory = sanitizeCardInput(category);
        
        // Generate description from first paragraph
        const firstParagraph = file.content
          .replace(/^#.*$/gm, '') // Remove headings
          .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
          .split('\n\n')[0]
          .trim()
          .substring(0, 200);
        const sanitizedDescription = sanitizeCardInput(firstParagraph || "Imported from external source");
        
        // Extract wikilinks [[filename]] for auto-linking with validation
        const wikiLinkMatches = file.content.match(/\[\[([^\]]+)\]\]/g);
        const linkedCardNumbers: string[] = [];
        
        if (wikiLinkMatches) {
          wikiLinkMatches.forEach(link => {
            const linkText = link.replace(/\[\[|\]\]/g, '');
            // Validate link text length and content
            if (linkText.length > 0 && linkText.length <= 100) {
              const linkNumberMatch = linkText.match(/^(\d+(?:\.\d+)*(?:\.[A-Za-z]+)?(?:\.\d+)*)/);
              if (linkNumberMatch && linkedCardNumbers.length < MAX_LINKS) {
                linkedCardNumbers.push(linkNumberMatch[1]);
              }
            }
          });
        }
        
        const tempCard = {
          title: sanitizedTitle,
          content: sanitizedContent,
          description: sanitizedDescription,
          category: sanitizedCategory,
          number: cardNumber,
          tags,
          linkedCards: [], // Will be populated after all cards are created
          imageUrl: undefined,
          _linkedNumbers: linkedCardNumbers // Temporary field for linking
        } as any;
        
        // Validate card before adding
        const validation = validateZettelCard(tempCard);
        if (!validation.valid) {
          console.error(`Skipping invalid card ${sanitizedTitle}: ${validation.errors.join(', ')}`);
          validationErrors++;
          return;
        }
        
        cards.push(tempCard);
        
        cardsByNumber.set(cardNumber, cards.length - 1);
        convertedCount++;
        console.log(`Converted card ${convertedCount}: ${cardNumber} - ${sanitizedTitle}`);
      } else if (file.type === 'image') {
        // Create card for standalone images
        const imgIndex = cardsByNumber.size;
        const sanitizedName = sanitizeCardInput(file.name);
        
        const imageCard = {
          title: `Image: ${sanitizedName}`,
          content: sanitizeCardInput(`Imported image from ${activeTab} vault.`),
          description: sanitizeCardInput(`Image file: ${file.name}`),
          category: "700", // Arts category
          number: `700.${String(imgIndex + 1).padStart(3, '0')}`,
          tags: ["image", activeTab === "obsidian" ? "obsidian" : "notion", "imported"],
          linkedCards: [],
          imageUrl: file.content
        };
        
        const validation = validateZettelCard(imageCard);
        if (!validation.valid) {
          console.error(`Skipping invalid image card ${sanitizedName}: ${validation.errors.join(', ')}`);
          validationErrors++;
          return;
        }
        
        cards.push(imageCard);
      }
    });
    
    // Second pass: resolve links by card number
    const finalCards = cards.map(card => {
      if ((card as any)._linkedNumbers) {
        const linkedIds: string[] = [];
        (card as any)._linkedNumbers.forEach((linkedNumber: string) => {
          const linkedIndex = cardsByNumber.get(linkedNumber);
          if (linkedIndex !== undefined) {
            // We'll use the index as a temporary ID, will be replaced with actual IDs after import
            linkedIds.push(linkedNumber);
          }
        });
        const { _linkedNumbers, ...cleanCard } = card as any;
        return { ...cleanCard, _pendingLinks: linkedIds };
      }
      return card;
    });
    
    console.log(`Final card count: ${finalCards.length} cards ready for import, ${validationErrors} skipped due to validation errors`);
    
    if (validationErrors > 0) {
      toast.warning(`${validationErrors} cards were skipped due to validation errors. Check console for details.`);
    }
    
    // Detect duplicates and similar cards
    const duplicates = findDuplicatesAndSimilar(finalCards);
    
    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicate/similar pairs`);
      setDuplicatePairs(duplicates);
      setProcessedCards(finalCards);
      setCurrentPairIndex(0);
      setMergeDialogOpen(true);
      setIsProcessing(false);
    } else {
      onImportCards(finalCards);
      setIsOpen(false);
      setParsedFiles([]);
      toast(`Successfully imported ${cards.length} cards with auto-linking!`);
    }
  };

  const findDuplicatesAndSimilar = (cards: Partial<ZettelCardType>[]): Array<{card1: Partial<ZettelCardType>, card2: Partial<ZettelCardType>}> => {
    const pairs: Array<{card1: Partial<ZettelCardType>, card2: Partial<ZettelCardType>}> = [];
    const processed = new Set<number>();
    
    for (let i = 0; i < cards.length; i++) {
      if (processed.has(i)) continue;
      
      for (let j = i + 1; j < cards.length; j++) {
        if (processed.has(j)) continue;
        
        const similarity = calculateCardSimilarity(cards[i], cards[j]);
        
        // If cards are duplicates (>95% similar) or very similar (>75%)
        if (similarity > 0.75) {
          pairs.push({ card1: cards[i], card2: cards[j] });
          processed.add(j); // Mark second card as processed
          break; // Move to next card
        }
      }
    }
    
    return pairs;
  };

  const calculateCardSimilarity = (card1: Partial<ZettelCardType>, card2: Partial<ZettelCardType>): number => {
    const content1 = (card1.content || '').toLowerCase().trim();
    const content2 = (card2.content || '').toLowerCase().trim();
    
    // Check for exact duplicates
    if (content1 === content2) return 1;
    
    // Calculate word overlap
    const words1 = new Set(content1.split(/\s+/).filter(w => w.length > 3));
    const words2 = new Set(content2.split(/\s+/).filter(w => w.length > 3));
    
    if (words1.size === 0 || words2.size === 0) return 0;
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  };

  const handleMerge = (mergedCard: Partial<ZettelCardType>) => {
    const pair = duplicatePairs[currentPairIndex];
    
    // Remove both original cards and add merged card
    const updatedCards = processedCards.filter(c => 
      c.number !== pair.card1.number && c.number !== pair.card2.number
    );
    updatedCards.push(mergedCard);
    
    setProcessedCards(updatedCards);
    
    // Move to next pair or finish
    if (currentPairIndex + 1 < duplicatePairs.length) {
      setCurrentPairIndex(currentPairIndex + 1);
    } else {
      finishImport(updatedCards);
    }
  };

  const handleSkipMerge = () => {
    // Keep both cards, move to next pair
    if (currentPairIndex + 1 < duplicatePairs.length) {
      setCurrentPairIndex(currentPairIndex + 1);
    } else {
      finishImport(processedCards);
    }
  };

  const finishImport = (cards: Partial<ZettelCardType>[]) => {
    setMergeDialogOpen(false);
    const validCards = cards.filter(c => c.number && c.title && c.content) as Omit<ZettelCardType, 'id' | 'created' | 'modified'>[];
    onImportCards(validCards);
    setIsOpen(false);
    setParsedFiles([]);
    setDuplicatePairs([]);
    setCurrentPairIndex(0);
    setProcessedCards([]);
    toast(`Successfully imported ${validCards.length} cards with ${duplicatePairs.length} duplicates resolved!`);
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
      
      {duplicatePairs.length > 0 && currentPairIndex < duplicatePairs.length && (
        <CardMergeDialog
          open={mergeDialogOpen}
          onOpenChange={setMergeDialogOpen}
          card1={duplicatePairs[currentPairIndex].card1}
          card2={duplicatePairs[currentPairIndex].card2}
          onMerge={handleMerge}
          onSkip={handleSkipMerge}
        />
      )}
    </Dialog>
  );
};