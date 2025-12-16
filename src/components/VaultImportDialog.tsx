import { useState, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Upload, 
  FileText, 
  Database, 
  FolderOpen,
  Image,
  Download,
  AlertCircle,
  History,
  Search,
  ArrowLeft,
  Check,
  ChevronRight,
  ChevronDown,
  Edit2,
  Eye,
  EyeOff,
  Zap,
  Tag,
  X,
  Hash,
  Sparkles
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

interface CategorizedFile {
  id: string;
  name: string;
  content: string;
  path: string;
  type: 'markdown' | 'image' | 'other';
  size: number;
  category: string;
  selected: boolean;
  tags: string[];
  preview: string;
  keywords: string[];
}

type ImportStep = 'select' | 'preview' | 'importing';
type ViewMode = 'list' | 'keywords';

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

const CATEGORY_NAMES: Record<string, string> = {
  "000": "Computer Science & Technology",
  "100": "Philosophy & Psychology",
  "200": "Religion & Spirituality",
  "300": "Social Sciences",
  "400": "Language & Linguistics",
  "500": "Science & Mathematics",
  "600": "Technology & Medicine",
  "700": "Arts & Recreation",
  "800": "Literature",
  "900": "History & Geography"
};

const CATEGORY_COLORS: Record<string, string> = {
  "000": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "100": "bg-purple-500/20 text-purple-400 border-purple-500/30",
  "200": "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "300": "bg-green-500/20 text-green-400 border-green-500/30",
  "400": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "500": "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  "600": "bg-red-500/20 text-red-400 border-red-500/30",
  "700": "bg-pink-500/20 text-pink-400 border-pink-500/30",
  "800": "bg-orange-500/20 text-orange-400 border-orange-500/30",
  "900": "bg-teal-500/20 text-teal-400 border-teal-500/30"
};

function smartCategorize(content: string, title: string): string {
  const firstParagraph = content
    .replace(/^#.*$/gm, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
    .split('\n\n')[0] || '';
  
  const textToAnalyze = (title + " " + firstParagraph).toLowerCase();
  
  let bestMatch = "000";
  let maxScore = 0;
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (textToAnalyze.includes(keyword)) {
        score += keyword.includes(' ') ? 3 : 1;
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

function extractFileKeywords(content: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'all', 'each', 'every', 'some', 'any', 'no', 'not', 'can']);
  
  const words = content
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
  
  const wordCount: Record<string, number> = {};
  words.forEach(w => { wordCount[w] = (wordCount[w] || 0) + 1; });
  
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

export const VaultImportDialog = ({ onImportCards }: VaultImportDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState("");
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [categorizedFiles, setCategorizedFiles] = useState<CategorizedFile[]>([]);
  const [importStep, setImportStep] = useState<ImportStep>('select');
  const [activeTab, setActiveTab] = useState("obsidian");
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [duplicatePairs, setDuplicatePairs] = useState<Array<{card1: Partial<ZettelCardType>, card2: Partial<ZettelCardType>}>>([]);
  const [currentPairIndex, setCurrentPairIndex] = useState(0);
  const [processedCards, setProcessedCards] = useState<Partial<ZettelCardType>[]>([]);
  const [reimportPaths, setReimportPaths] = useState<string[]>([]);
  const [skipDuplicateCheck, setSkipDuplicateCheck] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);
  const [quickImportMode, setQuickImportMode] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    // Auto-categorize files for preview
    await categorizeFilesForPreview(parsed);
  };

  const categorizeFilesForPreview = async (files: ParsedFile[]) => {
    setIsProcessing(true);
    setProgress(50);
    setProgressMessage("Categorizing files...");
    
    const categorized: CategorizedFile[] = [];
    const markdownFiles = files.filter(f => f.type === 'markdown');
    const imageFiles = files.filter(f => f.type === 'image');
    const BATCH_SIZE = 30;
    
    // Categorize markdown files
    for (let i = 0; i < markdownFiles.length; i += BATCH_SIZE) {
      const batch = markdownFiles.slice(i, Math.min(i + BATCH_SIZE, markdownFiles.length));
      
      for (const file of batch) {
        const title = file.name.replace(/\.md$/, '');
        const category = smartCategorize(file.content, title);
        
        // Extract tags
        const tagMatches = file.content.match(/#[\w-]+/g);
        const tags = tagMatches ? [...new Set(tagMatches.map(t => t.slice(1)))].slice(0, 5) : [];
        
        // Extract keywords for search
        const keywords = extractFileKeywords(file.content);
        
        // Get preview (first paragraph)
        const preview = file.content
          .replace(/^#.*$/gm, '')
          .replace(/!\[.*?\]\(.*?\)/g, '')
          .trim()
          .split('\n\n')[0]
          ?.substring(0, 150) || '';
        
        categorized.push({
          id: crypto.randomUUID(),
          ...file,
          category,
          selected: true,
          tags,
          preview,
          keywords
        });
      }
      
      const progressPercent = 50 + ((Math.min(i + BATCH_SIZE, markdownFiles.length) / markdownFiles.length) * 40);
      setProgress(progressPercent);
      setProgressMessage(`Categorizing... ${Math.min(i + BATCH_SIZE, markdownFiles.length)}/${markdownFiles.length}`);
      
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    // Add images with default category
    for (const file of imageFiles) {
      categorized.push({
        id: crypto.randomUUID(),
        ...file,
        category: "700",
        selected: true,
        tags: ["image"],
        preview: `Image file: ${file.name}`,
        keywords: []
      });
    }
    
    setCategorizedFiles(categorized);
    setImportStep('preview');
    setProgress(100);
    setProgressMessage("Categorization complete!");
    setIsProcessing(false);
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
    
    // Auto-categorize files for preview
    await categorizeFilesForPreview(parsed);
  };

  // Preview helper functions
  const handleCategoryChange = useCallback((fileId: string, newCategory: string) => {
    setCategorizedFiles(prev => 
      prev.map(f => f.id === fileId ? { ...f, category: newCategory } : f)
    );
  }, []);

  const handleSelectionChange = useCallback((fileId: string, selected: boolean) => {
    setCategorizedFiles(prev =>
      prev.map(f => f.id === fileId ? { ...f, selected } : f)
    );
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    setCategorizedFiles(prev => prev.map(f => ({ ...f, selected })));
  }, []);

  const handleBulkCategoryChange = useCallback((category: string) => {
    setCategorizedFiles(prev =>
      prev.map(f => f.selected ? { ...f, category } : f)
    );
  }, []);

  const filteredFiles = useMemo(() => {
    return categorizedFiles.filter(file => {
      const matchesSearch = searchQuery === '' ||
        file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.keywords.some(k => k.includes(searchQuery.toLowerCase()));
      const matchesCategory = filterCategory === 'all' || file.category === filterCategory;
      const matchesKeyword = !selectedKeyword || file.keywords.includes(selectedKeyword);
      return matchesSearch && matchesCategory && matchesKeyword;
    });
  }, [categorizedFiles, searchQuery, filterCategory, selectedKeyword]);

  const selectedCount = useMemo(() => 
    categorizedFiles.filter(f => f.selected).length, 
    [categorizedFiles]
  );

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    categorizedFiles.forEach(file => {
      stats[file.category] = (stats[file.category] || 0) + 1;
    });
    return stats;
  }, [categorizedFiles]);

  // Extract all unique keywords from files
  const allKeywords = useMemo(() => {
    const keywordCount: Record<string, number> = {};
    categorizedFiles.forEach(file => {
      file.keywords.forEach(kw => {
        keywordCount[kw] = (keywordCount[kw] || 0) + 1;
      });
    });
    return Object.entries(keywordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);
  }, [categorizedFiles]);

  // Group files by keyword
  const filesByKeyword = useMemo(() => {
    const groups: Record<string, CategorizedFile[]> = {};
    categorizedFiles.forEach(file => {
      file.keywords.forEach(kw => {
        if (!groups[kw]) groups[kw] = [];
        groups[kw].push(file);
      });
    });
    return groups;
  }, [categorizedFiles]);

  const resetImport = useCallback(() => {
    setImportStep('select');
    setCategorizedFiles([]);
    setParsedFiles([]);
    setSearchQuery('');
    setFilterCategory('all');
    setSelectedKeyword(null);
    setExpandedFileId(null);
    setQuickImportMode(false);
  }, []);

  // Quick import - skip preview and import directly
  const handleQuickImport = useCallback(async (files: FileList) => {
    setQuickImportMode(true);
    if (activeTab === "obsidian") {
      await processObsidianVault(files);
    } else {
      await processNotionExport(files);
    }
  }, [activeTab]);

  // After categorization, if quick import mode, proceed directly
  const categorizeFilesForPreviewRef = useRef(categorizeFilesForPreview);
  categorizeFilesForPreviewRef.current = categorizeFilesForPreview;

  // Convert categorized files (with user-adjusted categories) to cards
  const convertCategorizedFilesToCards = async () => {
    const selectedFiles = categorizedFiles.filter(f => f.selected);
    if (selectedFiles.length === 0) {
      toast.error('No files selected for import');
      return;
    }

    setImportStep('importing');
    setIsProcessing(true);
    setProgress(0);
    setProgressMessage("Converting to cards...");
    
    const cards: Omit<ZettelCardType, 'id' | 'created' | 'modified'>[] = [];
    const existingNumbers: string[] = [];
    let convertedCount = 0;
    let validationErrors = 0;
    const BATCH_SIZE = 20;
    
    const markdownFiles = selectedFiles.filter(f => f.type === 'markdown');
    const imageFiles = selectedFiles.filter(f => f.type === 'image');
    
    console.log(`Converting ${markdownFiles.length} markdown files to cards...`);
    
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
        
        // Use the user-adjusted category from preview
        const cardNumber = generateZettelNumber(file.category, existingNumbers);
        existingNumbers.push(cardNumber);
        
        // Use existing tags plus source tag
        const tags = [...file.tags, activeTab === "obsidian" ? "obsidian" : "notion", "imported"];
        
        const sanitizedDescription = sanitizeCardInput(file.preview || "Imported from external source");
        
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
          category: file.category, // Use user-adjusted category
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
      
      const progressPercent = (batchEnd / markdownFiles.length) * 80;
      setProgress(progressPercent);
      setProgressMessage(`Converting... ${convertedCount}/${markdownFiles.length}`);
      
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    // Process images
    for (const file of imageFiles) {
      const sanitizedName = sanitizeCardInput(file.name);
      const imgNumber = generateZettelNumber(file.category, existingNumbers);
      existingNumbers.push(imgNumber);
      
      const imageCard = {
        title: `Image: ${sanitizedName}`,
        content: sanitizeCardInput(`Imported image from ${activeTab} vault.`),
        description: sanitizeCardInput(`Image file: ${file.name}`),
        category: file.category,
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
    
    await importCardsWithTracking(finalCards);
    setIsProcessing(false);
    resetImport();
  };

  const convertToZettelCards = async () => {
    setIsProcessing(true);
    setProgress(50);
    setProgressMessage("Categorizing cards...");
    
    const cards: Omit<ZettelCardType, 'id' | 'created' | 'modified'>[] = [];
    const existingNumbers: string[] = [];
    let convertedCount = 0;
    let validationErrors = 0;
    const BATCH_SIZE = 20;
    const markdownFiles = parsedFiles.filter(f => f.type === 'markdown');
    const imageFiles = parsedFiles.filter(f => f.type === 'image');
    const totalMarkdown = markdownFiles.length;
    
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
            <div className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-purple-500/5 to-blue-500/5 p-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
              <div className="relative space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-purple-500/20 border border-purple-500/30">
                    <FolderOpen className="h-6 w-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Obsidian Vault Import</h3>
                    <p className="text-sm text-muted-foreground">Import your entire knowledge base</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Input
                    ref={fileInputRef}
                    id="obsidian-files"
                    type="file"
                    {...({ webkitdirectory: "" } as any)}
                    multiple
                    onChange={handleFileSelection}
                    disabled={isProcessing}
                    className="hidden"
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                      className="h-auto py-4 flex flex-col items-center gap-2 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5"
                    >
                      <Edit2 className="h-5 w-5" />
                      <span className="text-sm font-medium">Review & Import</span>
                      <span className="text-xs text-muted-foreground">Preview files first</span>
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setQuickImportMode(true);
                        fileInputRef.current?.click();
                      }}
                      disabled={isProcessing}
                      className="h-auto py-4 flex flex-col items-center gap-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                    >
                      <Zap className="h-5 w-5" />
                      <span className="text-sm font-medium">Quick Import</span>
                      <span className="text-xs opacity-80">Auto-categorize all</span>
                    </Button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Categorization
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    Preserves Tags
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    Wikilinks
                  </Badge>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="notion" className="space-y-4">
            <div className="relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-6">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
              <div className="relative space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/30">
                    <Database className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Notion Export Import</h3>
                    <p className="text-sm text-muted-foreground">Import from Notion workspace export</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Input
                    id="notion-files"
                    type="file"
                    {...({ webkitdirectory: "" } as any)}
                    multiple
                    onChange={handleFileSelection}
                    disabled={isProcessing}
                    className="hidden"
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('notion-files')?.click()}
                      disabled={isProcessing}
                      className="h-auto py-4 flex flex-col items-center gap-2 border-dashed border-2 hover:border-primary/50 hover:bg-primary/5"
                    >
                      <Edit2 className="h-5 w-5" />
                      <span className="text-sm font-medium">Review & Import</span>
                      <span className="text-xs text-muted-foreground">Preview files first</span>
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setQuickImportMode(true);
                        document.getElementById('notion-files')?.click();
                      }}
                      disabled={isProcessing}
                      className="h-auto py-4 flex flex-col items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                    >
                      <Zap className="h-5 w-5" />
                      <span className="text-sm font-medium">Quick Import</span>
                      <span className="text-xs opacity-80">Auto-categorize all</span>
                    </Button>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                  <p className="font-medium mb-1">Export from Notion:</p>
                  <p>Settings → Export → Markdown & CSV → Unzip and select folder</p>
                </div>
              </div>
            </div>
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
        
        {/* Preview Step - Enhanced Category Review */}
        {importStep === 'preview' && categorizedFiles.length > 0 && !isProcessing && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={resetImport}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h3 className="font-semibold">Review & Import</h3>
                  <p className="text-xs text-muted-foreground">{categorizedFiles.length} files ready</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => { setViewMode('list'); setSelectedKeyword(null); }}
                >
                  <FileText className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'keywords' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('keywords')}
                >
                  <Hash className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Category Stats with Colors */}
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant={filterCategory === 'all' ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => setFilterCategory('all')}
              >
                All: {categorizedFiles.length}
              </Badge>
              {Object.entries(categoryStats).map(([cat, count]) => (
                <Badge
                  key={cat}
                  variant="outline"
                  className={`cursor-pointer text-xs transition-all ${filterCategory === cat ? CATEGORY_COLORS[cat] : 'opacity-70 hover:opacity-100'}`}
                  onClick={() => setFilterCategory(filterCategory === cat ? 'all' : cat)}
                >
                  {cat} {CATEGORY_NAMES[cat]?.split(' ')[0]}: {count}
                </Badge>
              ))}
            </div>

            {/* Search & Controls */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Select onValueChange={handleBulkCategoryChange}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Bulk assign..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border z-50">
                  {Object.entries(CATEGORY_NAMES).map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[code]?.split(' ')[0]}`} />
                        {code} - {name.split(' ')[0]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selection Controls */}
            <div className="flex items-center justify-between text-sm border-b pb-2">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedCount === categorizedFiles.length && categorizedFiles.length > 0}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                />
                <span className="font-medium">{selectedCount} of {categorizedFiles.length} selected</span>
              </div>
              {selectedKeyword && (
                <Badge variant="secondary" className="gap-1">
                  <Hash className="h-3 w-3" />
                  {selectedKeyword}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1"
                    onClick={() => setSelectedKeyword(null)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>

            {/* Keywords View */}
            {viewMode === 'keywords' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">Click a keyword to filter files:</p>
                <div className="flex flex-wrap gap-1.5">
                  {allKeywords.map(([keyword, count]) => (
                    <Badge
                      key={keyword}
                      variant={selectedKeyword === keyword ? 'default' : 'outline'}
                      className="cursor-pointer text-xs hover:bg-primary/10"
                      onClick={() => setSelectedKeyword(selectedKeyword === keyword ? null : keyword)}
                    >
                      {keyword} ({count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* File List */}
            <ScrollArea className="h-[320px] border rounded-lg">
              <div className="divide-y divide-border">
                {filteredFiles.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No files match your search</p>
                  </div>
                ) : (
                  filteredFiles.map((file) => (
                    <Collapsible
                      key={file.id}
                      open={expandedFileId === file.id}
                      onOpenChange={(open) => setExpandedFileId(open ? file.id : null)}
                    >
                      <div className="p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={file.selected}
                            onCheckedChange={(checked) => handleSelectionChange(file.id, !!checked)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="font-medium text-sm truncate">{file.name.replace(/\.md$/, '')}</span>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto">
                                  {expandedFileId === file.id ? (
                                    <EyeOff className="h-3.5 w-3.5" />
                                  ) : (
                                    <Eye className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">{file.preview}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={`text-xs ${CATEGORY_COLORS[file.category]}`}
                              >
                                {file.category}
                              </Badge>
                              {file.keywords.slice(0, 3).map(kw => (
                                <Badge
                                  key={kw}
                                  variant="outline"
                                  className="text-xs cursor-pointer hover:bg-muted"
                                  onClick={() => setSelectedKeyword(kw)}
                                >
                                  {kw}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Select
                            value={file.category}
                            onValueChange={(value) => handleCategoryChange(file.id, value)}
                          >
                            <SelectTrigger className={`w-[90px] h-7 text-xs ${CATEGORY_COLORS[file.category]}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border z-50">
                              {Object.entries(CATEGORY_NAMES).map(([code, name]) => (
                                <SelectItem key={code} value={code}>
                                  <span className={`${CATEGORY_COLORS[code]?.split(' ')[1]}`}>{code}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <CollapsibleContent>
                          <div className="mt-3 ml-7 p-3 bg-muted/50 rounded-lg text-sm">
                            <p className="text-xs font-medium text-muted-foreground mb-2">Document Preview:</p>
                            <div className="max-h-40 overflow-y-auto text-xs whitespace-pre-wrap font-mono">
                              {file.content.slice(0, 1000)}
                              {file.content.length > 1000 && (
                                <span className="text-muted-foreground">... (truncated)</span>
                              )}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Import Button */}
            <Button
              onClick={convertCategorizedFilesToCards}
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              disabled={selectedCount === 0}
              size="lg"
            >
              <Check className="h-4 w-4 mr-2" />
              Import {selectedCount} Files
            </Button>
          </div>
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