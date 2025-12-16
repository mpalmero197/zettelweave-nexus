import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { 
  Upload, 
  FileText, 
  Database, 
  FolderOpen,
  Image,
  Download,
  AlertCircle,
  History
} from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { toast } from "sonner";
import { CardMergeDialog } from "./CardMergeDialog";
import { ImportHistoryPanel } from "./ImportHistoryPanel";
import { sanitizeCardInput, validateZettelCard } from "@/utils/security";
import { trackImport } from "@/utils/importTracking";
import { categorizeContent, generateZettelNumber, extractKeywords } from "@/utils/deweySystem";

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

// Extended keywords for better categorization
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "000": ["computer", "data", "information", "system", "technology", "digital", "algorithm", "programming", "software", "code", "database", "internet", "network", "server", "api", "web", "application", "computing", "ai", "machine learning", "artificial intelligence"],
  "100": ["philosophy", "ethics", "logic", "psychology", "mind", "consciousness", "existence", "thought", "metaphysics", "epistemology", "morality", "reasoning", "cognitive", "perception", "behavior", "mental", "phenomenology"],
  "200": ["religion", "god", "faith", "spiritual", "sacred", "prayer", "belief", "church", "bible", "quran", "buddhism", "hinduism", "christianity", "islam", "theology", "worship", "divine", "soul"],
  "300": ["society", "culture", "politics", "economics", "social", "government", "law", "community", "education", "business", "finance", "trade", "commerce", "market", "democracy", "policy", "sociology", "anthropology", "institution"],
  "400": ["language", "grammar", "vocabulary", "communication", "linguistics", "words", "speech", "translation", "syntax", "semantics", "phonetics", "writing system", "dictionary", "etymology"],
  "500": ["science", "mathematics", "physics", "chemistry", "biology", "research", "experiment", "theory", "astronomy", "geology", "zoology", "botany", "ecology", "genetics", "evolution", "quantum", "molecule", "atom", "cell"],
  "600": ["medicine", "health", "engineering", "applied", "practical", "medical", "disease", "treatment", "agriculture", "manufacturing", "construction", "mechanical", "electrical", "clinical", "diagnosis", "therapy"],
  "700": ["art", "music", "painting", "creative", "design", "aesthetic", "beauty", "recreation", "sports", "games", "photography", "sculpture", "architecture", "film", "theater", "dance", "entertainment"],
  "800": ["literature", "poetry", "novel", "writing", "author", "story", "book", "narrative", "fiction", "drama", "essay", "prose", "verse", "literary", "playwright", "memoir", "biography"],
  "900": ["history", "geography", "historical", "past", "location", "place", "biographical", "war", "ancient", "medieval", "modern", "civilization", "empire", "revolution", "country", "nation", "continent", "travel"]
};

function smartCategorize(content: string, title: string): string {
  // Focus on first paragraph for faster categorization
  const firstParagraph = content
    .replace(/^#.*$/gm, '') // Remove headings
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Clean links
    .trim()
    .split('\n\n')[0] || '';
  
  const textToAnalyze = (title + " " + firstParagraph).toLowerCase();
  
  let bestMatch = "000";
  let maxScore = 0;
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (textToAnalyze.includes(keyword)) {
        // Weight multi-word matches higher
        score += keyword.includes(' ') ? 3 : 1;
        // Count multiple occurrences
        const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const matches = textToAnalyze.match(regex);
        if (matches && matches.length > 1) {
          score += matches.length - 1;
        }
      }
    }
    
    if (score > maxScore) {
      maxScore = score;
      bestMatch = category;
    }
  }
  
  return bestMatch;
}

export const VaultImportDialog = ({ onImportCards }: VaultImportDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [activeTab, setActiveTab] = useState("obsidian");
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [duplicatePairs, setDuplicatePairs] = useState<Array<{card1: Partial<ZettelCardType>, card2: Partial<ZettelCardType>}>>([]);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [processedCards, setProcessedCards] = useState<Partial<ZettelCardType>[]>([]);
  const [reimportPaths, setReimportPaths] = useState<string[]>([]);
  const [skipDuplicateCheck, setSkipDuplicateCheck] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const processObsidianVault = async (files: FileList) => {
    setIsProcessing(true);
    setProgress(0);
    setProgressMessage("Reading files...");
    abortControllerRef.current = new AbortController();
    
    const parsed: ParsedFile[] = [];
    const totalFiles = files.length;
    let processedCount = 0;
    let errorCount = 0;
    
    // Increased limits for large imports
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
    const BATCH_SIZE = 50; // Process in batches to prevent UI freeze
    
    console.log(`Starting Obsidian vault import: ${totalFiles} files`);
    
    // Process files in batches
    for (let batchStart = 0; batchStart < files.length; batchStart += BATCH_SIZE) {
      if (abortControllerRef.current?.signal.aborted) break;
      
      const batchEnd = Math.min(batchStart + BATCH_SIZE, files.length);
      const batchPromises: Promise<ParsedFile | null>[] = [];
      
      for (let i = batchStart; i < batchEnd; i++) {
        const file = files[i];
        
        batchPromises.push((async (): Promise<ParsedFile | null> => {
          try {
            if (file.name.startsWith('.') || file.size > MAX_FILE_SIZE) {
              return null;
            }
            
            let type: 'markdown' | 'image' | 'other' = 'other';
            if (file.name.endsWith('.md')) type = 'markdown';
            else if (file.type.startsWith('image/')) type = 'image';
            
            if (type === 'other') return null;
            
            let content = '';
            if (type === 'markdown') {
              content = await file.text();
            } else if (type === 'image') {
              content = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
            }
            
            return {
              name: file.name,
              content,
              path: file.webkitRelativePath || file.name,
              type,
              size: file.size
            };
          } catch {
            return null;
          }
        })());
      }
      
      const batchResults = await Promise.all(batchPromises);
      
      for (const result of batchResults) {
        if (result) {
          parsed.push(result);
          processedCount++;
        } else {
          errorCount++;
        }
      }
      
      setProgress((batchEnd / totalFiles) * 50); // 50% for reading
      setProgressMessage(`Reading files... ${processedCount}/${totalFiles}`);
      
      // Yield to UI thread
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    setParsedFiles(parsed);
    setProgress(50);
    setIsProcessing(false);
    
    console.log(`Import complete: ${processedCount} files processed, ${errorCount} skipped`);
    toast.success(`Parsed ${parsed.length} files from Obsidian vault`);
  };

  const processNotionExport = async (files: FileList) => {
    setIsProcessing(true);
    setProgress(0);
    setProgressMessage("Reading files...");
    abortControllerRef.current = new AbortController();
    
    const parsed: ParsedFile[] = [];
    const totalFiles = files.length;
    let processedCount = 0;
    let errorCount = 0;
    
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    const BATCH_SIZE = 50;
    
    console.log(`Starting Notion export import: ${totalFiles} files`);
    
    for (let batchStart = 0; batchStart < files.length; batchStart += BATCH_SIZE) {
      if (abortControllerRef.current?.signal.aborted) break;
      
      const batchEnd = Math.min(batchStart + BATCH_SIZE, files.length);
      const batchPromises: Promise<ParsedFile | null>[] = [];
      
      for (let i = batchStart; i < batchEnd; i++) {
        const file = files[i];
        
        batchPromises.push((async (): Promise<ParsedFile | null> => {
          try {
            if (file.name.startsWith('.') || file.size > MAX_FILE_SIZE) {
              return null;
            }
            
            let type: 'markdown' | 'image' | 'other' = 'other';
            if (file.name.endsWith('.md') || file.name.endsWith('.txt')) type = 'markdown';
            else if (file.type.startsWith('image/')) type = 'image';
            
            if (type === 'other') return null;
            
            let content = '';
            if (type === 'markdown') {
              content = await file.text();
              content = content
                .replace(/!\[.*?\]\((.*?)\)/g, '![]($1)')
                .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
                .trim();
            } else if (type === 'image') {
              content = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
            }
            
            return {
              name: file.name,
              content,
              path: file.webkitRelativePath || file.name,
              type,
              size: file.size
            };
          } catch {
            return null;
          }
        })());
      }
      
      const batchResults = await Promise.all(batchPromises);
      
      for (const result of batchResults) {
        if (result) {
          parsed.push(result);
          processedCount++;
        } else {
          errorCount++;
        }
      }
      
      setProgress((batchEnd / totalFiles) * 50);
      setProgressMessage(`Reading files... ${processedCount}/${totalFiles}`);
      
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    setParsedFiles(parsed);
    setProgress(50);
    setIsProcessing(false);
    
    console.log(`Import complete: ${processedCount} files processed, ${errorCount} skipped`);
    toast.success(`Parsed ${parsed.length} files from Notion export`);
  };

  const convertToZettelCards = async () => {
    setIsProcessing(true);
    setProgress(50);
    setProgressMessage("Categorizing cards...");
    
    const cards: Omit<ZettelCardType, 'id' | 'created' | 'modified'>[] = [];
    const existingNumbers: string[] = [];
    let convertedCount = 0;
    let validationErrors = 0;
    const totalMarkdown = parsedFiles.filter(f => f.type === 'markdown').length;
    const BATCH_SIZE = 20;
    
    console.log(`Converting ${totalMarkdown} markdown files to cards...`);
    
    const markdownFiles = parsedFiles.filter(f => f.type === 'markdown');
    const imageFiles = parsedFiles.filter(f => f.type === 'image');
    
    // Process markdown files in batches
    for (let batchStart = 0; batchStart < markdownFiles.length; batchStart += BATCH_SIZE) {
      const batchEnd = Math.min(batchStart + BATCH_SIZE, markdownFiles.length);
      
      for (let i = batchStart; i < batchEnd; i++) {
        const file = markdownFiles[i];
        
        // Extract title from filename or first heading
        let title = file.name.replace(/\.md$/, '');
        const firstHeading = file.content.match(/^#\s+(.+)$/m);
        if (firstHeading) {
          title = firstHeading[1];
        }
        
        const sanitizedTitle = sanitizeCardInput(title);
        const sanitizedContent = sanitizeCardInput(file.content);
        
        // Smart categorization based on first paragraph
        const category = smartCategorize(file.content, title);
        const cardNumber = generateZettelNumber(category, existingNumbers);
        existingNumbers.push(cardNumber);
        
        // Extract tags from content
        const tagMatches = file.content.match(/#[\w-]+/g);
        const extractedTags = tagMatches ? tagMatches.map(tag => tag.slice(1).substring(0, 50)) : [];
        const contentKeywords = extractKeywords(sanitizedTitle + " " + sanitizedContent);
        const uniqueTags = [...new Set([...extractedTags, ...contentKeywords])].slice(0, 10);
        const tags = [...uniqueTags, activeTab === "obsidian" ? "obsidian" : "notion", "imported"];
        
        // Generate description from first paragraph
        const firstParagraph = file.content
          .replace(/^#.*$/gm, '')
          .replace(/!\[.*?\]\(.*?\)/g, '')
          .split('\n\n')[0]
          .trim()
          .substring(0, 200);
        const sanitizedDescription = sanitizeCardInput(firstParagraph || "Imported from external source");
        
        // Extract wikilinks for auto-linking
        const wikiLinkMatches = file.content.match(/\[\[([^\]]+)\]\]/g);
        const linkedCardNumbers: string[] = [];
        
        if (wikiLinkMatches) {
          wikiLinkMatches.slice(0, 50).forEach(link => {
            const linkText = link.replace(/\[\[|\]\]/g, '');
            if (linkText.length > 0 && linkText.length <= 100) {
              linkedCardNumbers.push(linkText);
            }
          });
        }
        
        const tempCard = {
          title: sanitizedTitle,
          content: sanitizedContent,
          description: sanitizedDescription,
          category,
          number: cardNumber,
          tags,
          linkedCards: [],
          imageUrl: undefined,
          _linkedNumbers: linkedCardNumbers,
          _filePath: file.path,
          _fileName: file.name
        } as any;
        
        const validation = validateZettelCard(tempCard);
        if (!validation.valid) {
          console.warn(`Skipping invalid card ${sanitizedTitle}: ${validation.errors.join(', ')}`);
          validationErrors++;
          continue;
        }
        
        cards.push(tempCard);
        convertedCount++;
      }
      
      const progressPercent = 50 + ((batchEnd / markdownFiles.length) * 40);
      setProgress(progressPercent);
      setProgressMessage(`Categorizing... ${convertedCount}/${totalMarkdown}`);
      
      // Yield to UI
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    // Process images
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const sanitizedName = sanitizeCardInput(file.name);
      const imgNumber = generateZettelNumber("700", existingNumbers);
      existingNumbers.push(imgNumber);
      
      const imageCard = {
        title: `Image: ${sanitizedName}`,
        content: sanitizeCardInput(`Imported image from ${activeTab} vault.`),
        description: sanitizeCardInput(`Image file: ${file.name}`),
        category: "700",
        number: imgNumber,
        tags: ["image", activeTab === "obsidian" ? "obsidian" : "notion", "imported"],
        linkedCards: [],
        imageUrl: file.content,
        _filePath: file.path,
        _fileName: file.name
      };
      
      const validation = validateZettelCard(imageCard);
      if (validation.valid) {
        cards.push(imageCard);
      }
    }
    
    setProgress(90);
    setProgressMessage("Finalizing...");
    
    // Clean up temporary fields
    const finalCards = cards.map(card => {
      const { _linkedNumbers, _filePath, _fileName, ...cleanCard } = card as any;
      return cleanCard;
    });
    
    console.log(`Converted ${finalCards.length} cards, ${validationErrors} skipped`);
    
    if (validationErrors > 0) {
      toast.warning(`${validationErrors} cards skipped due to validation errors`);
    }
    
    // Skip duplicate check for large imports (>100 files)
    if (!skipDuplicateCheck && finalCards.length <= 100) {
      const duplicates = findDuplicatesAndSimilar(finalCards);
      
      if (duplicates.length > 0) {
        console.log(`Found ${duplicates.length} duplicate pairs`);
        setDuplicatePairs(duplicates);
        setProcessedCards(finalCards);
        setCurrentPairIndex(0);
        setMergeDialogOpen(true);
        setIsProcessing(false);
        return;
      }
    }
    
    await importCardsWithTracking(finalCards);
  };

  const importCardsWithTracking = async (finalCards: any[]) => {
    try {
      // Call the original import function
      onImportCards(finalCards);
      
      // Track each imported file
      for (const card of finalCards) {
        if (card._filePath && card._fileName) {
          await trackImport(
            card._filePath,
            card._fileName,
            activeTab as 'obsidian' | 'notion',
            { 
              cardNumber: card.number, 
              title: card.title,
              tags: card.tags 
            }
          );
        }
      }
      
      setIsOpen(false);
      setParsedFiles([]);
      toast(`Successfully imported ${finalCards.length} cards with auto-linking!`);
    } catch (error) {
      console.error('Error tracking imports:', error);
      toast.error('Import completed but tracking failed');
    }
  };

  const findDuplicatesAndSimilar = (cards: Partial<ZettelCardType>[]): Array<{card1: Partial<ZettelCardType>, card2: Partial<ZettelCardType>}> => {
    const pairs: Array<{card1: Partial<ZettelCardType>, card2: Partial<ZettelCardType>}> = [];
    const processed = new Set<number>();
    
    // Limit comparison for performance - only check first 100 cards
    const maxToCheck = Math.min(cards.length, 100);
    
    for (let i = 0; i < maxToCheck; i++) {
      if (processed.has(i)) continue;
      
      for (let j = i + 1; j < maxToCheck; j++) {
        if (processed.has(j)) continue;
        
        const similarity = calculateCardSimilarity(cards[i], cards[j]);
        
        // Only flag very similar cards (>85%)
        if (similarity > 0.85) {
          pairs.push({ card1: cards[i], card2: cards[j] });
          processed.add(j);
          break;
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="obsidian" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Obsidian
            </TabsTrigger>
            <TabsTrigger value="notion" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Notion
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              History
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
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium">Import Instructions</h4>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        <li>• Select your Obsidian vault folder - supports hundreds of files</li>
                        <li>• Cards are auto-categorized by content analysis</li>
                        <li>• Tags and wikilinks are preserved</li>
                        <li>• First paragraph determines category (Dewey classification)</li>
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
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium">Export Instructions</h4>
                      <ol className="text-sm text-muted-foreground mt-2 space-y-1">
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
          
          <TabsContent value="history" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Track your import history and selectively re-import files
                </p>
              </div>
              
              <Tabs defaultValue="obsidian-history" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="obsidian-history">Obsidian</TabsTrigger>
                  <TabsTrigger value="notion-history">Notion</TabsTrigger>
                </TabsList>
                
                <TabsContent value="obsidian-history" className="mt-4">
                  <ImportHistoryPanel 
                    sourceType="obsidian"
                    onSelectForReimport={(paths) => {
                      setReimportPaths(paths);
                      setActiveTab('obsidian');
                      toast.info(`${paths.length} file(s) selected for re-import. Please select your vault folder.`);
                    }}
                  />
                </TabsContent>
                
                <TabsContent value="notion-history" className="mt-4">
                  <ImportHistoryPanel 
                    sourceType="notion"
                    onSelectForReimport={(paths) => {
                      setReimportPaths(paths);
                      setActiveTab('notion');
                      toast.info(`${paths.length} file(s) selected for re-import. Please select your export folder.`);
                    }}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </TabsContent>
        </Tabs>
        
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{progressMessage}</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}
        
        {parsedFiles.length > 50 && !isProcessing && (
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Switch
                id="skip-duplicate"
                checked={skipDuplicateCheck}
                onCheckedChange={setSkipDuplicateCheck}
              />
              <Label htmlFor="skip-duplicate" className="text-sm">
                Skip duplicate detection (faster for large imports)
              </Label>
            </div>
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