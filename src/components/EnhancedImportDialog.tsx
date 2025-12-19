import { useState, useRef, useCallback, DragEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileUp, 
  Upload, 
  FileText, 
  Image, 
  FileType, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  Copy,
  Trash2,
  ChevronDown,
  ChevronRight,
  Loader2,
  FileWarning,
  Files,
  Edit2,
  X,
  Plus,
  Tag,
  Link,
  Globe
} from "lucide-react";
import { ZettelCard } from "@/types/zettel";
import { categorizeContent, generateZettelNumber, extractKeywords } from "@/utils/deweySystem";
import { toast } from "sonner";
import { sanitizeCardInput, validateZettelCard } from "@/utils/security";
import { supabase } from "@/integrations/supabase/client";
import mammoth from "mammoth";

interface EnhancedImportDialogProps {
  existingCards: ZettelCard[];
  onImportCards: (cards: Omit<ZettelCard, 'id' | 'created' | 'modified'>[]) => void;
  trigger?: React.ReactNode;
}

interface ParsedFile {
  id: string;
  name: string;
  type: 'markdown' | 'text' | 'docx' | 'pdf' | 'image' | 'other';
  content: string;
  size: number;
  status: 'pending' | 'parsing' | 'success' | 'error' | 'duplicate' | 'similar';
  error?: string;
  selected: boolean;
  category?: string;
  tags?: string[];
  preview?: string;
  similarTo?: string;
  similarityScore?: number;
}

interface ImportStats {
  total: number;
  parsed: number;
  errors: number;
  duplicates: number;
  similar: number;
}

type ImportStep = 'select' | 'parsing' | 'review' | 'importing' | 'complete';

const FILE_TYPE_ICONS: Record<string, typeof FileText> = {
  markdown: FileText,
  text: FileText,
  docx: FileType,
  pdf: FileType,
  image: Image,
  other: FileWarning,
};

const SUPPORTED_EXTENSIONS = [
  '.md', '.markdown', '.txt', 
  '.docx', 
  '.pdf', 
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'
];

// Category options for the dropdown
const CATEGORY_OPTIONS = [
  { value: "000", label: "000 - Computer Science & Technology" },
  { value: "100", label: "100 - Philosophy & Psychology" },
  { value: "200", label: "200 - Religion & Spirituality" },
  { value: "300", label: "300 - Social Sciences" },
  { value: "400", label: "400 - Language & Linguistics" },
  { value: "500", label: "500 - Science & Mathematics" },
  { value: "600", label: "600 - Technology & Medicine" },
  { value: "700", label: "700 - Arts & Recreation" },
  { value: "800", label: "800 - Literature" },
  { value: "900", label: "900 - History & Geography" },
];

const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase().trim().slice(0, 500);
  const s2 = str2.toLowerCase().trim().slice(0, 500);
  
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;
  
  const words1 = new Set(s1.split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(s2.split(/\s+/).filter(w => w.length > 3));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
};

export function EnhancedImportDialog({ existingCards, onImportCards, trigger }: EnhancedImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>('select');
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [stats, setStats] = useState<ImportStats>({ total: 0, parsed: 0, errors: 0, duplicates: 0, similar: 0 });
  const [checkDuplicates, setCheckDuplicates] = useState(true);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [retryQueue, setRetryQueue] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [newTagInput, setNewTagInput] = useState<Record<string, string>>({});
  const [importMode, setImportMode] = useState<'files' | 'url'>('files');
  const [urlInput, setUrlInput] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const resetState = useCallback(() => {
    setStep('select');
    setFiles([]);
    setProgress(0);
    setProgressMessage('');
    setStats({ total: 0, parsed: 0, errors: 0, duplicates: 0, similar: 0 });
    setExpandedFile(null);
    setRetryQueue([]);
    setIsDragging(false);
    setNewTagInput({});
    setUrlInput('');
    setIsFetchingUrl(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const getFileType = (file: File): ParsedFile['type'] => {
    const ext = file.name.toLowerCase().split('.').pop();
    if (['md', 'markdown'].includes(ext || '')) return 'markdown';
    if (ext === 'txt') return 'text';
    if (ext === 'docx') return 'docx';
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')) return 'image';
    return 'other';
  };

  const parseTextFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    });
  };

  const parseDocxFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          resolve(result.value);
        } catch (err) {
          reject(new Error('Failed to parse DOCX file'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read DOCX file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const parsePdfFile = async (file: File): Promise<string> => {
    return `[PDF Content from: ${file.name}]\n\nPDF text extraction is limited in the browser. Consider using an online PDF to text converter for full content extraction, or the content will be referenced as a file attachment.`;
  };

  const parseImageFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        resolve(`![${file.name}](${dataUrl})`);
      };
      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  };

  const parseFile = async (file: File, fileType: ParsedFile['type']): Promise<string> => {
    switch (fileType) {
      case 'markdown':
      case 'text':
        return parseTextFile(file);
      case 'docx':
        return parseDocxFile(file);
      case 'pdf':
        return parsePdfFile(file);
      case 'image':
        return parseImageFile(file);
      default:
        throw new Error(`Unsupported file type: ${file.type || file.name}`);
    }
  };

  const checkForDuplicatesFunc = (content: string, title: string): { isDuplicate: boolean; isSimilar: boolean; matchTitle?: string; score?: number } => {
    if (!checkDuplicates || existingCards.length === 0) {
      return { isDuplicate: false, isSimilar: false };
    }

    for (const card of existingCards) {
      if (card.title.toLowerCase() === title.toLowerCase()) {
        return { isDuplicate: true, isSimilar: false, matchTitle: card.title, score: 1 };
      }

      const similarity = calculateSimilarity(content, card.content);
      if (similarity > 0.9) {
        return { isDuplicate: true, isSimilar: false, matchTitle: card.title, score: similarity };
      }
      if (similarity > 0.7) {
        return { isDuplicate: false, isSimilar: true, matchTitle: card.title, score: similarity };
      }
    }

    return { isDuplicate: false, isSimilar: false };
  };

  const processFiles = async (fileList: FileList) => {
    if (!fileList || fileList.length === 0) return;

    setStep('parsing');
    setProgress(0);
    abortControllerRef.current = new AbortController();

    const parsedFiles: ParsedFile[] = [];
    const totalFiles = fileList.length;
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    let similarCount = 0;

    setStats({ total: totalFiles, parsed: 0, errors: 0, duplicates: 0, similar: 0 });
    setProgressMessage(`Processing 0 of ${totalFiles} files...`);

    for (let i = 0; i < totalFiles; i++) {
      if (abortControllerRef.current?.signal.aborted) break;

      const file = fileList[i];
      const fileType = getFileType(file);
      
      const parsedFile: ParsedFile = {
        id: crypto.randomUUID(),
        name: file.name,
        type: fileType,
        content: '',
        size: file.size,
        status: 'parsing',
        selected: true,
      };

      if (fileType === 'other') {
        parsedFile.status = 'error';
        parsedFile.error = 'Unsupported file format';
        parsedFile.selected = false;
        errorCount++;
        parsedFiles.push(parsedFile);
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        parsedFile.status = 'error';
        parsedFile.error = 'File too large (max 10MB)';
        parsedFile.selected = false;
        errorCount++;
        parsedFiles.push(parsedFile);
        continue;
      }

      try {
        const content = await parseFile(file, fileType);
        parsedFile.content = content;
        
        let title = file.name.replace(/\.[^/.]+$/, '');
        const headingMatch = content.match(/^#\s+(.+)$/m);
        if (headingMatch) {
          title = headingMatch[1];
        }

        const duplicateCheck = checkForDuplicatesFunc(content, title);
        
        if (duplicateCheck.isDuplicate) {
          parsedFile.status = 'duplicate';
          parsedFile.similarTo = duplicateCheck.matchTitle;
          parsedFile.similarityScore = duplicateCheck.score;
          parsedFile.selected = false;
          duplicateCount++;
        } else if (duplicateCheck.isSimilar) {
          parsedFile.status = 'similar';
          parsedFile.similarTo = duplicateCheck.matchTitle;
          parsedFile.similarityScore = duplicateCheck.score;
          similarCount++;
        } else {
          parsedFile.status = 'success';
        }

        const category = categorizeContent(content, title);
        parsedFile.category = category;
        parsedFile.tags = extractKeywords(title + " " + content).slice(0, 5);
        
        const cleanContent = content
          .replace(/^#.*$/gm, '')
          .replace(/!\[.*?\]\(.*?\)/g, '')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .trim();
        parsedFile.preview = cleanContent.substring(0, 200) + (cleanContent.length > 200 ? '...' : '');

        successCount++;
      } catch (err) {
        parsedFile.status = 'error';
        parsedFile.error = err instanceof Error ? err.message : 'Unknown error';
        parsedFile.selected = false;
        errorCount++;
      }

      parsedFiles.push(parsedFile);
      
      setProgress(((i + 1) / totalFiles) * 100);
      setProgressMessage(`Processing ${i + 1} of ${totalFiles} files...`);
      setStats({ 
        total: totalFiles, 
        parsed: successCount, 
        errors: errorCount, 
        duplicates: duplicateCount,
        similar: similarCount
      });

      await new Promise(resolve => setTimeout(resolve, 0));
    }

    setFiles(parsedFiles);
    setStep('review');
    setProgressMessage('');
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if leaving the dropzone entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles && droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const fetchUrlContent = async () => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) {
      toast.error('Please enter a URL');
      return;
    }

    // Basic URL validation
    let formattedUrl = trimmedUrl;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    try {
      new URL(formattedUrl);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setIsFetchingUrl(true);
    setStep('parsing');
    setProgress(0);
    setProgressMessage('Fetching webpage content...');

    try {
      const { data, error } = await supabase.functions.invoke('fetch-url-content', {
        body: { url: formattedUrl },
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch URL');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to fetch URL content');
      }

      setProgress(50);
      setProgressMessage('Processing content...');

      const { title, description, content, hostname, image } = data.data;

      // Check for duplicates
      const duplicateCheck = checkForDuplicatesFunc(content, title);
      
      let status: ParsedFile['status'] = 'success';
      if (duplicateCheck.isDuplicate) {
        status = 'duplicate';
      } else if (duplicateCheck.isSimilar) {
        status = 'similar';
      }

      const category = categorizeContent(content, title);
      const tags = extractKeywords(title + " " + content).slice(0, 5);

      const parsedFile: ParsedFile = {
        id: crypto.randomUUID(),
        name: title || hostname,
        type: 'text',
        content: `# ${title}\n\n**Source:** [${hostname}](${formattedUrl})\n\n${content}`,
        size: content.length,
        status,
        selected: status !== 'duplicate',
        category,
        tags,
        preview: (description || content.substring(0, 200)) + (content.length > 200 ? '...' : ''),
        similarTo: duplicateCheck.matchTitle,
        similarityScore: duplicateCheck.score,
      };

      setProgress(100);
      setFiles([parsedFile]);
      setStats({
        total: 1,
        parsed: status === 'success' || status === 'similar' ? 1 : 0,
        errors: 0,
        duplicates: status === 'duplicate' ? 1 : 0,
        similar: status === 'similar' ? 1 : 0,
      });
      setStep('review');
      toast.success('Webpage content fetched successfully');
    } catch (err) {
      console.error('URL fetch error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to fetch URL content');
      setStep('select');
    } finally {
      setIsFetchingUrl(false);
      setProgressMessage('');
    }
  };

  const retryFailedFile = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file || file.status !== 'error') return;
    setRetryQueue(prev => [...prev, file.name]);
    toast.info(`"${file.name}" will be included in next import attempt`);
  };

  const toggleFileSelection = (fileId: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, selected: !f.selected } : f
    ));
  };

  const selectAll = () => {
    setFiles(prev => prev.map(f => 
      f.status !== 'error' && f.status !== 'duplicate' ? { ...f, selected: true } : f
    ));
  };

  const deselectAll = () => {
    setFiles(prev => prev.map(f => ({ ...f, selected: false })));
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Category and tag editing
  const updateFileCategory = (fileId: string, newCategory: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, category: newCategory } : f
    ));
  };

  const addTagToFile = (fileId: string, tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (!trimmedTag) return;
    
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f;
      const currentTags = f.tags || [];
      if (currentTags.includes(trimmedTag)) return f;
      return { ...f, tags: [...currentTags, trimmedTag].slice(0, 10) };
    }));
    setNewTagInput(prev => ({ ...prev, [fileId]: '' }));
  };

  const removeTagFromFile = (fileId: string, tagToRemove: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f;
      return { ...f, tags: (f.tags || []).filter(t => t !== tagToRemove) };
    }));
  };

  const importSelectedFiles = async () => {
    const selectedFiles = files.filter(f => f.selected);
    if (selectedFiles.length === 0) {
      toast.error('No files selected for import');
      return;
    }

    setStep('importing');
    setProgress(0);
    setProgressMessage('Converting files to cards...');

    const cards: Omit<ZettelCard, 'id' | 'created' | 'modified'>[] = [];
    const existingNumbers = existingCards.map(c => c.number);
    let importedCount = 0;
    let validationErrors = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      let title = file.name.replace(/\.[^/.]+$/, '');
      const headingMatch = file.content.match(/^#\s+(.+)$/m);
      if (headingMatch) {
        title = headingMatch[1];
      }

      const sanitizedTitle = sanitizeCardInput(title);
      const sanitizedContent = sanitizeCardInput(file.content);
      
      const cleanContent = file.content
        .replace(/^#.*$/gm, '')
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .trim();
      
      const description = cleanContent.substring(0, 150) + (cleanContent.length > 150 ? '...' : '');
      
      // Use user-edited category
      const category = file.category || categorizeContent(file.content, title);
      const number = generateZettelNumber(category, existingNumbers);
      existingNumbers.push(number);

      const card = {
        title: sanitizedTitle,
        content: sanitizedContent,
        description: sanitizeCardInput(description),
        // Use user-edited tags
        tags: file.tags || [],
        category,
        number,
        linkedCards: [],
        author: "Imported",
        imageUrl: file.type === 'image' ? file.content.match(/\(([^)]+)\)/)?.[1] : undefined,
      };

      const validation = validateZettelCard(card);
      if (!validation.valid) {
        console.warn(`Skipping invalid card ${title}:`, validation.errors);
        validationErrors++;
        continue;
      }

      cards.push(card);
      importedCount++;

      setProgress(((i + 1) / selectedFiles.length) * 100);
      setProgressMessage(`Importing ${i + 1} of ${selectedFiles.length}...`);
      
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    if (cards.length > 0) {
      onImportCards(cards);
      
      if (validationErrors > 0) {
        toast.warning(`Imported ${cards.length} cards. ${validationErrors} skipped due to validation errors.`);
      } else {
        toast.success(`Successfully imported ${cards.length} cards!`);
      }
    }

    setStep('complete');
  };

  const getStatusIcon = (status: ParsedFile['status']) => {
    switch (status) {
      case 'success': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'duplicate': return <Copy className="h-4 w-4 text-amber-500" />;
      case 'similar': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'parsing': return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
      default: return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: ParsedFile['status']) => {
    switch (status) {
      case 'success': return <Badge variant="secondary" className="bg-green-500/10 text-green-500">Ready</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      case 'duplicate': return <Badge variant="outline" className="border-amber-500 text-amber-500">Duplicate</Badge>;
      case 'similar': return <Badge variant="outline" className="border-amber-500 text-amber-500">Similar</Badge>;
      case 'parsing': return <Badge variant="secondary">Parsing...</Badge>;
      default: return <Badge variant="outline">Pending</Badge>;
    }
  };

  const selectedCount = files.filter(f => f.selected).length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetState(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <FileUp className="h-4 w-4" />
            Import Files
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Files className="h-5 w-5" />
            Enhanced File Import
          </DialogTitle>
        </DialogHeader>
        
        {/* Step: Select Files */}
        {step === 'select' && (
          <div className="space-y-4 py-4">
            <Tabs value={importMode} onValueChange={(v) => setImportMode(v as 'files' | 'url')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="files" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Files
                </TabsTrigger>
                <TabsTrigger value="url" className="gap-2">
                  <Globe className="h-4 w-4" />
                  Import from URL
                </TabsTrigger>
              </TabsList>

              <TabsContent value="files" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Supported formats</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">.md .txt</Badge>
                    <Badge variant="secondary">.docx</Badge>
                    <Badge variant="secondary">.pdf</Badge>
                    <Badge variant="secondary">.jpg .png .gif</Badge>
                  </div>
                </div>

                {/* Drag and drop zone */}
                <div 
                  ref={dropZoneRef}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${
                    isDragging 
                      ? 'border-primary bg-primary/10 scale-[1.02]' 
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                >
                  <Upload className={`h-10 w-10 mx-auto mb-3 transition-colors ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className={`text-sm mb-2 transition-colors ${isDragging ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {isDragging ? 'Drop files here!' : 'Click to select files or drag and drop'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Maximum 10MB per file
                  </p>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={SUPPORTED_EXTENSIONS.join(',')}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </TabsContent>

              <TabsContent value="url" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="url-input">Webpage URL</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="url-input"
                        type="url"
                        placeholder="https://example.com/article"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchUrlContent()}
                        className="pl-10"
                      />
                    </div>
                    <Button 
                      onClick={fetchUrlContent} 
                      disabled={!urlInput.trim() || isFetchingUrl}
                    >
                      {isFetchingUrl ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Globe className="h-4 w-4 mr-2" />
                          Fetch
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter a webpage URL to extract and import its content as a card
                  </p>
                </div>

                <Alert className="bg-muted/50">
                  <Globe className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    The content will be converted to markdown format. Works best with articles, blog posts, and documentation pages.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>

            <div className="flex items-center gap-2 pt-2 border-t">
              <Switch
                id="check-duplicates"
                checked={checkDuplicates}
                onCheckedChange={setCheckDuplicates}
              />
              <Label htmlFor="check-duplicates" className="text-sm">
                Check for duplicates against existing cards
              </Label>
            </div>
          </div>
        )}

        {/* Step: Parsing */}
        {step === 'parsing' && (
          <div className="space-y-4 py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-sm text-muted-foreground">{progressMessage}</p>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
              <span>Parsed: {stats.parsed}</span>
              <span>Errors: {stats.errors}</span>
              {checkDuplicates && <span>Duplicates: {stats.duplicates}</span>}
            </div>
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  abortControllerRef.current?.abort();
                  resetState();
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Step: Review */}
        {step === 'review' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            {/* Stats summary */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{stats.total} Total</Badge>
              <Badge variant="secondary" className="bg-green-500/10 text-green-500">{stats.parsed} Ready</Badge>
              {stats.errors > 0 && <Badge variant="destructive">{stats.errors} Errors</Badge>}
              {stats.duplicates > 0 && <Badge variant="outline" className="border-amber-500 text-amber-500">{stats.duplicates} Duplicates</Badge>}
              {stats.similar > 0 && <Badge variant="outline" className="border-amber-500 text-amber-500">{stats.similar} Similar</Badge>}
            </div>

            {/* Info alert */}
            <Alert className="bg-primary/5 border-primary/20">
              <Edit2 className="h-4 w-4" />
              <AlertDescription>
                Expand each file to edit its category and tags before importing.
              </AlertDescription>
            </Alert>

            {/* Duplicate/Error alerts */}
            {(stats.duplicates > 0 || stats.errors > 0) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {stats.duplicates > 0 && `${stats.duplicates} duplicate(s) found and deselected. `}
                  {stats.errors > 0 && `${stats.errors} file(s) couldn't be parsed. `}
                  Review below to adjust selections.
                </AlertDescription>
              </Alert>
            )}

            {/* Selection controls */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>Select All Valid</Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>Deselect All</Button>
              </div>
              <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
            </div>

            {/* File list */}
            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-2 space-y-1">
                {files.map((file) => {
                  const Icon = FILE_TYPE_ICONS[file.type];
                  const isExpanded = expandedFile === file.id;
                  
                  return (
                    <div 
                      key={file.id}
                      className={`rounded-lg border transition-colors ${
                        file.status === 'error' ? 'border-destructive/50 bg-destructive/5' :
                        file.status === 'duplicate' ? 'border-amber-500/50 bg-amber-500/5' :
                        file.selected ? 'border-primary/50 bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2 p-2">
                        {file.status !== 'error' && file.status !== 'duplicate' && (
                          <Checkbox
                            checked={file.selected}
                            onCheckedChange={() => toggleFileSelection(file.id)}
                          />
                        )}
                        
                        {getStatusIcon(file.status)}
                        
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        
                        <span className="flex-1 text-sm truncate">{file.name}</span>
                        
                        <span className="text-xs text-muted-foreground shrink-0">
                          {(file.size / 1024).toFixed(1)}KB
                        </span>
                        
                        {getStatusBadge(file.status)}
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setExpandedFile(isExpanded ? null : file.id)}
                          >
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </Button>
                          
                          {file.status === 'error' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => retryFailedFile(file.id)}
                              title="Mark for retry"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => removeFile(file.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Expanded content with editable category and tags */}
                      {isExpanded && (
                        <div className="px-4 pb-3 pt-1 border-t space-y-3">
                          {file.error && (
                            <p className="text-sm text-destructive">{file.error}</p>
                          )}
                          
                          {file.similarTo && (
                            <p className="text-sm text-amber-600">
                              {file.status === 'duplicate' ? 'Exact duplicate of' : 'Similar to'}: "{file.similarTo}"
                              {file.similarityScore && ` (${Math.round(file.similarityScore * 100)}% match)`}
                            </p>
                          )}
                          
                          {file.preview && (
                            <p className="text-xs text-muted-foreground line-clamp-3">{file.preview}</p>
                          )}
                          
                          {/* Editable Category */}
                          {file.status !== 'error' && (
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Category</Label>
                              <Select
                                value={file.category || "000"}
                                onValueChange={(value) => updateFileCategory(file.id, value)}
                              >
                                <SelectTrigger className="h-8 text-xs bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-popover z-50">
                                  {CATEGORY_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          
                          {/* Editable Tags */}
                          {file.status !== 'error' && (
                            <div className="space-y-2">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                Tags
                              </Label>
                              <div className="flex flex-wrap gap-1">
                                {(file.tags || []).map(tag => (
                                  <Badge 
                                    key={tag} 
                                    variant="secondary" 
                                    className="text-xs gap-1 pr-1"
                                  >
                                    {tag}
                                    <button
                                      onClick={() => removeTagFromFile(file.id, tag)}
                                      className="ml-1 hover:text-destructive transition-colors"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Add tag..."
                                  value={newTagInput[file.id] || ''}
                                  onChange={(e) => setNewTagInput(prev => ({ ...prev, [file.id]: e.target.value }))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      addTagToFile(file.id, newTagInput[file.id] || '');
                                    }
                                  }}
                                  className="h-7 text-xs flex-1"
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2"
                                  onClick={() => addTagToFile(file.id, newTagInput[file.id] || '')}
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Action buttons */}
            <div className="flex justify-between pt-2 border-t">
              <Button variant="outline" onClick={resetState}>
                Cancel
              </Button>
              <Button 
                onClick={importSelectedFiles}
                disabled={selectedCount === 0}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import {selectedCount} File{selectedCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="space-y-4 py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-sm text-muted-foreground">{progressMessage}</p>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Step: Complete */}
        {step === 'complete' && (
          <div className="space-y-4 py-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
            <div>
              <h3 className="text-lg font-semibold">Import Complete!</h3>
              <p className="text-sm text-muted-foreground">
                Your files have been imported as Zettel cards.
              </p>
            </div>
            <Button onClick={() => { setOpen(false); resetState(); }}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
