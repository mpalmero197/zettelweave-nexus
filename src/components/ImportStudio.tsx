import { useState, useRef, useCallback, DragEvent, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileUp,
  Upload,
  FileText,
  Globe,
  Clipboard,
  FolderOpen,
  Database,
  FileJson,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  Tag,
  X,
  Plus,
  Link2,
  BarChart3,
  ArrowLeft,
  Eye,
  Zap,
} from "lucide-react";
import { ZettelCard } from "@/types/zettel";
import { categorizeContent, generateZettelNumber, extractKeywords } from "@/utils/deweySystem";
import { toast } from "sonner";
import { sanitizeCardInput } from "@/utils/security";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import mammoth from "mammoth";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ImportStudioProps {
  existingCards: ZettelCard[];
  onImportCards: (cards: Omit<ZettelCard, "id" | "created" | "modified">[]) => void;
  trigger?: React.ReactNode;
}

interface ParsedItem {
  id: string;
  name: string;
  content: string;
  type: string;
  size: number;
  status: "pending" | "success" | "error" | "duplicate" | "similar";
  error?: string;
  selected: boolean;
  category: string;
  tags: string[];
  preview: string;
  similarTo?: string;
  similarityScore?: number;
  folderPath?: string;
  wikilinks?: string[];
}

interface ImportSummary {
  cardsCreated: number;
  linksResolved: number;
  duplicatesSkipped: number;
  errors: { name: string; error: string }[];
  categoryBreakdown: Record<string, number>;
}

type ImportStep = "source" | "review" | "importing" | "summary";
type SourceTab = "files" | "url" | "clipboard" | "obsidian" | "notion" | "roam" | "csv";

interface CsvMapping {
  title: string;
  content: string;
  tags: string;
  category: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: "000", label: "Computer Science & Technology" },
  { value: "100", label: "Philosophy & Psychology" },
  { value: "200", label: "Religion & Spirituality" },
  { value: "300", label: "Social Sciences" },
  { value: "400", label: "Language & Linguistics" },
  { value: "500", label: "Science & Mathematics" },
  { value: "600", label: "Technology & Medicine" },
  { value: "700", label: "Arts & Recreation" },
  { value: "800", label: "Literature" },
  { value: "900", label: "History & Geography" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const calculateSimilarity = (s1: string, s2: string): number => {
  const a = s1.toLowerCase().trim().slice(0, 500);
  const b = s2.toLowerCase().trim().slice(0, 500);
  if (a === b) return 1;
  if (!a || !b) return 0;
  const w1 = new Set(a.split(/\s+/).filter((w) => w.length > 3));
  const w2 = new Set(b.split(/\s+/).filter((w) => w.length > 3));
  if (w1.size === 0 || w2.size === 0) return 0;
  const inter = new Set([...w1].filter((w) => w2.has(w)));
  const union = new Set([...w1, ...w2]);
  return inter.size / union.size;
};

const extractWikilinks = (content: string): string[] => {
  const matches = content.match(/\[\[([^\]]+)\]\]/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(2, -2).split("|")[0].trim()))].slice(0, 50);
};

const cleanMarkdown = (content: string): string =>
  content
    .replace(/^#+\s+.+$/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();

const getPreview = (content: string, len = 200): string => {
  const c = cleanMarkdown(content);
  return c.length > len ? c.slice(0, len - 3) + "..." : c;
};

const parseCSVText = (text: string): { headers: string[]; rows: string[][] } => {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
      current += ch;
    }
    result.push(current.trim());
    return result;
  });
  return { headers, rows };
};

const parseRoamJSON = (json: any[]): ParsedItem[] => {
  const items: ParsedItem[] = [];
  const flattenChildren = (children: any[], depth = 0): string => {
    if (!children || !Array.isArray(children)) return "";
    return children
      .map((child) => {
        const indent = "  ".repeat(depth);
        const text = child.string || child.text || "";
        const sub = flattenChildren(child.children, depth + 1);
        return `${indent}- ${text}${sub ? "\n" + sub : ""}`;
      })
      .join("\n");
  };

  for (const page of json) {
    const title = page.title || "Untitled";
    const content = flattenChildren(page.children || []);
    const wikilinks = extractWikilinks(content);
    const tagMatches = content.match(/#[\w-]+/g);
    const tags = tagMatches ? [...new Set(tagMatches.map((t) => t.slice(1)))].slice(0, 5) : [];
    const category = categorizeContent(content, title);

    items.push({
      id: crypto.randomUUID(),
      name: title,
      content,
      type: "roam",
      size: content.length,
      status: "success",
      selected: true,
      category,
      tags,
      preview: getPreview(content),
      wikilinks,
    });
  }
  return items;
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ImportStudio({ existingCards, onImportCards, trigger }: ImportStudioProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ImportStep>("source");
  const [sourceTab, setSourceTab] = useState<SourceTab>("files");
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  // Options
  const [checkDuplicates, setCheckDuplicates] = useState(true);
  const [resolveWikilinks, setResolveWikilinks] = useState(true);
  const [quickImport, setQuickImport] = useState(false);

  // Source-specific state
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [clipboardText, setClipboardText] = useState("");
  const [clipboardTitle, setClipboardTitle] = useState("");
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewCategoryFilter, setReviewCategoryFilter] = useState("all");

  // CSV/JSON state
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvMapping, setCsvMapping] = useState<CsvMapping>({ title: "", content: "", tags: "", category: "" });
  const [jsonFields, setJsonFields] = useState<string[]>([]);
  const [jsonRecords, setJsonRecords] = useState<Record<string, any>[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStep("source");
    setItems([]);
    setProgress(0);
    setProgressMsg("");
    setSummary(null);
    setUrlInput("");
    setClipboardText("");
    setClipboardTitle("");
    setReviewSearch("");
    setReviewCategoryFilter("all");
    setCsvHeaders([]);
    setCsvRows([]);
    setCsvMapping({ title: "", content: "", tags: "", category: "" });
    setJsonFields([]);
    setJsonRecords([]);
    setIsDragging(false);
  }, []);

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) resetState();
  };

  // ─── Duplicate checking ──────────────────────────────────────────────────

  const checkDuplicate = (content: string, title: string): { status: ParsedItem["status"]; matchTitle?: string; score?: number } => {
    if (!checkDuplicates || existingCards.length === 0) return { status: "success" };
    for (const card of existingCards) {
      if (card.title.toLowerCase() === title.toLowerCase()) return { status: "duplicate", matchTitle: card.title, score: 1 };
      const sim = calculateSimilarity(content, card.content);
      if (sim > 0.9) return { status: "duplicate", matchTitle: card.title, score: sim };
      if (sim > 0.7) return { status: "similar", matchTitle: card.title, score: sim };
    }
    return { status: "success" };
  };

  // ─── File parsing ─────────────────────────────────────────────────────────

  const parseFileContent = async (file: File): Promise<string> => {
    const ext = file.name.toLowerCase().split(".").pop();
    if (["md", "markdown", "txt"].includes(ext || "")) return file.text();
    if (ext === "docx") {
      const buf = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer: buf });
      return result.value;
    }
    if (ext === "pdf") return `[PDF Content from: ${file.name}]\n\nPDF text extraction requires server-side processing. The file reference has been created.`;
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(`![${file.name}](${e.target?.result})`);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }
    throw new Error("Unsupported file type");
  };

  const processFilesToItems = async (fileList: FileList | File[], folderMode = false, sourceLabel = "file") => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;

    setStep("source");
    setProgress(0);
    const parsed: ParsedItem[] = [];

    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      if (file.name.startsWith(".") || file.size > 10 * 1024 * 1024) continue;

      const ext = file.name.toLowerCase().split(".").pop();
      const isMd = ["md", "markdown", "txt"].includes(ext || "");
      const isDocx = ext === "docx";
      const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "");
      if (!isMd && !isDocx && !isImage && ext !== "pdf") continue;

      try {
        const content = await parseFileContent(file);
        let title = file.name.replace(/\.[^/.]+$/, "");
        const heading = content.match(/^#\s+(.+)$/m);
        if (heading) title = heading[1];

        const wikilinks = extractWikilinks(content);
        const tagMatches = content.match(/#[\w-]+/g);
        const fileTags = tagMatches ? [...new Set(tagMatches.map((t) => t.slice(1)))].slice(0, 5) : extractKeywords(title + " " + content).slice(0, 5);
        const category = categorizeContent(content, title);
        const dup = checkDuplicate(content, title);

        const folderPath = folderMode && (file as any).webkitRelativePath
          ? (file as any).webkitRelativePath.split("/").slice(0, -1).join("/")
          : undefined;

        const allTags = folderPath ? [...fileTags, `folder:${folderPath}`] : fileTags;

        parsed.push({
          id: crypto.randomUUID(),
          name: title,
          content,
          type: sourceLabel,
          size: file.size,
          status: dup.status,
          selected: dup.status !== "duplicate",
          category,
          tags: allTags,
          preview: getPreview(content),
          similarTo: dup.matchTitle,
          similarityScore: dup.score,
          folderPath,
          wikilinks,
        });
      } catch (err) {
        parsed.push({
          id: crypto.randomUUID(),
          name: file.name,
          content: "",
          type: sourceLabel,
          size: file.size,
          status: "error",
          error: err instanceof Error ? err.message : "Parse error",
          selected: false,
          category: "000",
          tags: [],
          preview: "",
        });
      }
      setProgress(((i + 1) / arr.length) * 100);
      setProgressMsg(`Processing ${i + 1}/${arr.length}...`);
      await new Promise((r) => setTimeout(r, 0));
    }

    setItems(parsed);
    setProgressMsg("");

    if (quickImport && parsed.every((p) => p.status !== "error" && p.status !== "duplicate")) {
      await performImport(parsed.filter((p) => p.selected));
    } else {
      setStep("review");
    }
  };

  // ─── Source handlers ──────────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFilesToItems(e.target.files, false, "file");
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>, source: "obsidian" | "notion") => {
    if (e.target.files) processFilesToItems(e.target.files, true, source);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) processFilesToItems(e.dataTransfer.files, false, "file");
  };

  const handleUrlFetch = async () => {
    if (!urlInput.trim()) return;
    setIsFetchingUrl(true);
    try {
      const urls = urlInput.split("\n").map((u) => u.trim()).filter(Boolean);
      const parsed: ParsedItem[] = [];

      for (const url of urls) {
        try {
          const { data, error } = await supabase.functions.invoke("fetch-url-content", { body: { url } });
          if (error) throw error;
          const content = data?.content || "";
          const title = data?.title || new URL(url).hostname;
          const category = categorizeContent(content, title);
          const dup = checkDuplicate(content, title);

          parsed.push({
            id: crypto.randomUUID(),
            name: title,
            content,
            type: "url",
            size: content.length,
            status: dup.status,
            selected: dup.status !== "duplicate",
            category,
            tags: extractKeywords(title + " " + content).slice(0, 5),
            preview: getPreview(content),
            similarTo: dup.matchTitle,
            similarityScore: dup.score,
            wikilinks: extractWikilinks(content),
          });
        } catch {
          parsed.push({
            id: crypto.randomUUID(),
            name: url,
            content: "",
            type: "url",
            size: 0,
            status: "error",
            error: "Failed to fetch URL",
            selected: false,
            category: "000",
            tags: [],
            preview: "",
          });
        }
      }
      setItems(parsed);
      setStep("review");
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleClipboardImport = () => {
    if (!clipboardText.trim()) return;
    const title = clipboardTitle.trim() || "Clipboard Import";
    const category = categorizeContent(clipboardText, title);
    const dup = checkDuplicate(clipboardText, title);

    setItems([{
      id: crypto.randomUUID(),
      name: title,
      content: clipboardText,
      type: "clipboard",
      size: clipboardText.length,
      status: dup.status,
      selected: dup.status !== "duplicate",
      category,
      tags: extractKeywords(title + " " + clipboardText).slice(0, 5),
      preview: getPreview(clipboardText),
      similarTo: dup.matchTitle,
      similarityScore: dup.score,
      wikilinks: extractWikilinks(clipboardText),
    }]);
    setStep("review");
  };

  const handleRoamUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!Array.isArray(json)) throw new Error("Invalid Roam JSON format");
      const parsed = parseRoamJSON(json);
      setItems(parsed);
      setStep("review");
    } catch (err) {
      toast.error("Invalid Roam Research JSON file");
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "json") {
      try {
        const json = JSON.parse(text);
        const records = Array.isArray(json) ? json : [json];
        if (records.length === 0) { toast.error("Empty JSON"); return; }
        const fields = Object.keys(records[0]);
        setJsonFields(fields);
        setJsonRecords(records);
        setCsvMapping({ title: fields[0] || "", content: fields[1] || "", tags: "", category: "" });
      } catch { toast.error("Invalid JSON"); }
    } else {
      const { headers, rows } = parseCSVText(text);
      if (headers.length === 0) { toast.error("Empty CSV"); return; }
      setCsvHeaders(headers);
      setCsvRows(rows);
      setCsvMapping({ title: headers[0] || "", content: headers[1] || "", tags: "", category: "" });
    }
  };

  const handleCsvMappingImport = () => {
    const isJson = jsonRecords.length > 0;
    const parsed: ParsedItem[] = [];

    if (isJson) {
      for (const record of jsonRecords) {
        const title = String(record[csvMapping.title] || "Untitled");
        const content = String(record[csvMapping.content] || "");
        const tags = csvMapping.tags ? String(record[csvMapping.tags] || "").split(",").map((t) => t.trim()).filter(Boolean) : extractKeywords(title + " " + content).slice(0, 5);
        const category = csvMapping.category ? String(record[csvMapping.category] || "000") : categorizeContent(content, title);
        const dup = checkDuplicate(content, title);
        parsed.push({
          id: crypto.randomUUID(), name: title, content, type: "json", size: content.length,
          status: dup.status, selected: dup.status !== "duplicate", category, tags, preview: getPreview(content),
          similarTo: dup.matchTitle, similarityScore: dup.score,
        });
      }
    } else {
      const ti = csvHeaders.indexOf(csvMapping.title);
      const ci = csvHeaders.indexOf(csvMapping.content);
      const tagi = csvMapping.tags ? csvHeaders.indexOf(csvMapping.tags) : -1;
      const cati = csvMapping.category ? csvHeaders.indexOf(csvMapping.category) : -1;

      for (const row of csvRows) {
        const title = (ti >= 0 ? row[ti] : row[0]) || "Untitled";
        const content = (ci >= 0 ? row[ci] : row.slice(1).join("\n")) || "";
        const tags = tagi >= 0 ? (row[tagi] || "").split(",").map((t) => t.trim()).filter(Boolean) : extractKeywords(title + " " + content).slice(0, 5);
        const category = cati >= 0 && row[cati] ? row[cati] : categorizeContent(content, title);
        const dup = checkDuplicate(content, title);
        parsed.push({
          id: crypto.randomUUID(), name: title, content, type: "csv", size: content.length,
          status: dup.status, selected: dup.status !== "duplicate", category, tags, preview: getPreview(content),
          similarTo: dup.matchTitle, similarityScore: dup.score,
        });
      }
    }

    setItems(parsed);
    setStep("review");
  };

  // ─── Import ───────────────────────────────────────────────────────────────

  const performImport = async (toImport: ParsedItem[]) => {
    setStep("importing");
    setProgress(0);
    setProgressMsg("Importing cards...");

    const cards: Omit<ZettelCard, "id" | "created" | "modified">[] = [];
    const errors: { name: string; error: string }[] = [];
    const existingNumbers = existingCards.map((c) => c.number);
    const categoryBreakdown: Record<string, number> = {};

    for (let i = 0; i < toImport.length; i++) {
      const item = toImport[i];
      try {
        const title = sanitizeCardInput(item.name);
        const content = sanitizeCardInput(item.content);
        const desc = cleanMarkdown(content).split("\n\n")[0] || "";
        const description = desc.length > 150 ? desc.slice(0, 147) + "..." : desc;
        const number = generateZettelNumber(item.category, [...existingNumbers, ...cards.map((c) => c.number)]);

        cards.push({
          title, content, description,
          tags: item.tags,
          category: item.category,
          number,
          linkedCards: [],
          author: "Imported",
        });

        categoryBreakdown[item.category] = (categoryBreakdown[item.category] || 0) + 1;

        // Save to import history
        if (user) {
          const encoder = new TextEncoder();
          const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(content));
          const hash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
          await supabase.from("import_history").insert({
            user_id: user.id, file_name: item.name, file_hash: hash,
            file_path: item.type === "url" ? item.name : `local:${item.name}`,
            source_type: item.type,
          }).then(() => {});
        }
      } catch (err) {
        errors.push({ name: item.name, error: err instanceof Error ? err.message : "Unknown error" });
      }

      setProgress(((i + 1) / toImport.length) * 100);
      setProgressMsg(`Importing ${i + 1}/${toImport.length}...`);
    }

    // Wikilink resolution
    let linksResolved = 0;
    if (resolveWikilinks) {
      const titleMap = new Map<string, number>();
      cards.forEach((c, idx) => titleMap.set(c.title.toLowerCase(), idx));

      for (const item of toImport) {
        if (!item.wikilinks || item.wikilinks.length === 0) continue;
        const cardIdx = cards.findIndex((c) => c.title.toLowerCase() === item.name.toLowerCase());
        if (cardIdx < 0) continue;

        for (const link of item.wikilinks) {
          const targetIdx = titleMap.get(link.toLowerCase());
          if (targetIdx !== undefined && targetIdx !== cardIdx) {
            // We can't resolve to real IDs yet since cards haven't been created in DB,
            // but we mark the link by title for the import callback to handle
            if (!cards[cardIdx].linkedCards.includes(cards[targetIdx].title)) {
              cards[cardIdx].linkedCards.push(cards[targetIdx].title);
              linksResolved++;
            }
          }
        }
      }
    }

    // Actually import
    if (cards.length > 0) {
      onImportCards(cards);
    }

    const duplicatesSkipped = toImport.length - cards.length + errors.length;
    setSummary({
      cardsCreated: cards.length,
      linksResolved,
      duplicatesSkipped: items.filter((i) => i.status === "duplicate").length,
      errors,
      categoryBreakdown,
    });
    setStep("summary");
  };

  const handleImport = () => {
    const toImport = items.filter((i) => i.selected && i.status !== "error");
    if (toImport.length === 0) { toast.error("No items selected"); return; }
    performImport(toImport);
  };

  // ─── Review helpers ───────────────────────────────────────────────────────

  const toggleAll = (checked: boolean) => {
    setItems((prev) => prev.map((i) => ({ ...i, selected: i.status !== "error" && i.status !== "duplicate" ? checked : i.selected })));
  };

  const updateItem = (id: string, updates: Partial<ParsedItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updates } : i)));
  };

  const filteredItems = items.filter((i) => {
    if (reviewCategoryFilter !== "all" && i.category !== reviewCategoryFilter) return false;
    if (reviewSearch && !i.name.toLowerCase().includes(reviewSearch.toLowerCase()) && !i.tags.some((t) => t.toLowerCase().includes(reviewSearch.toLowerCase()))) return false;
    return true;
  });

  const selectedCount = items.filter((i) => i.selected).length;
  const errorCount = items.filter((i) => i.status === "error").length;
  const dupCount = items.filter((i) => i.status === "duplicate").length;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="w-full justify-start text-sm gap-2">
            <Upload className="h-3.5 w-3.5" />
            Import Studio
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Import Studio
          </DialogTitle>
          <DialogDescription>Import content from files, URLs, vaults, or structured data</DialogDescription>
        </DialogHeader>

        {/* ─── Step: Source ─────────────────────────────────────────────── */}
        {step === "source" && (
          <div className="flex-1 overflow-hidden flex flex-col gap-3">
            <Tabs value={sourceTab} onValueChange={(v) => setSourceTab(v as SourceTab)}>
              <TabsList className="grid grid-cols-7 w-full h-auto">
                <TabsTrigger value="files" className="text-xs px-1 py-1.5"><FileText className="h-3 w-3 mr-1 hidden sm:inline" />Files</TabsTrigger>
                <TabsTrigger value="url" className="text-xs px-1 py-1.5"><Globe className="h-3 w-3 mr-1 hidden sm:inline" />URL</TabsTrigger>
                <TabsTrigger value="clipboard" className="text-xs px-1 py-1.5"><Clipboard className="h-3 w-3 mr-1 hidden sm:inline" />Paste</TabsTrigger>
                <TabsTrigger value="obsidian" className="text-xs px-1 py-1.5"><FolderOpen className="h-3 w-3 mr-1 hidden sm:inline" />Obsidian</TabsTrigger>
                <TabsTrigger value="notion" className="text-xs px-1 py-1.5"><Database className="h-3 w-3 mr-1 hidden sm:inline" />Notion</TabsTrigger>
                <TabsTrigger value="roam" className="text-xs px-1 py-1.5"><Link2 className="h-3 w-3 mr-1 hidden sm:inline" />Roam</TabsTrigger>
                <TabsTrigger value="csv" className="text-xs px-1 py-1.5"><FileJson className="h-3 w-3 mr-1 hidden sm:inline" />CSV/JSON</TabsTrigger>
              </TabsList>

              {/* Files tab */}
              <TabsContent value="files" className="mt-3">
                <div
                  ref={(el) => { if (el) el.ondragover = (e) => { e.preventDefault(); setIsDragging(true); }; }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <FileUp className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-3">Drag & drop files here, or click to browse</p>
                  <p className="text-xs text-muted-foreground mb-4">Supports: MD, TXT, DOCX, PDF, images</p>
                  <input ref={fileInputRef} type="file" multiple accept=".md,.markdown,.txt,.docx,.pdf,.jpg,.jpeg,.png,.gif,.webp" className="hidden" onChange={handleFileSelect} />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4 mr-2" />Browse Files</Button>
                </div>
              </TabsContent>

              {/* URL tab */}
              <TabsContent value="url" className="mt-3 space-y-3">
                <Label>Enter URL(s) — one per line for batch import</Label>
                <Textarea value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://example.com/article&#10;https://another.com/page" rows={4} />
                <Button onClick={handleUrlFetch} disabled={isFetchingUrl || !urlInput.trim()}>
                  {isFetchingUrl ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Globe className="h-4 w-4 mr-2" />}
                  Fetch Content
                </Button>
              </TabsContent>

              {/* Clipboard tab */}
              <TabsContent value="clipboard" className="mt-3 space-y-3">
                <div>
                  <Label>Title (optional)</Label>
                  <Input value={clipboardTitle} onChange={(e) => setClipboardTitle(e.target.value)} placeholder="Card title" className="mt-1" />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea value={clipboardText} onChange={(e) => setClipboardText(e.target.value)} placeholder="Paste your content here..." rows={6} className="mt-1" />
                </div>
                <Button onClick={handleClipboardImport} disabled={!clipboardText.trim()}>
                  <Clipboard className="h-4 w-4 mr-2" />Import from Clipboard
                </Button>
              </TabsContent>

              {/* Obsidian tab */}
              <TabsContent value="obsidian" className="mt-3 space-y-3">
                <p className="text-sm text-muted-foreground">Select your Obsidian vault folder. All <code>.md</code> files will be imported with tags, wikilinks, and folder structure preserved.</p>
                <input ref={folderInputRef} type="file" {...({ webkitdirectory: "true", directory: "true" } as any)} className="hidden" onChange={(e) => handleFolderSelect(e, "obsidian")} />
                <Button variant="outline" onClick={() => folderInputRef.current?.click()}><FolderOpen className="h-4 w-4 mr-2" />Select Vault Folder</Button>
              </TabsContent>

              {/* Notion tab */}
              <TabsContent value="notion" className="mt-3 space-y-3">
                <p className="text-sm text-muted-foreground">Export from Notion as Markdown+CSV, then select the exported folder here.</p>
                <input type="file" {...({ webkitdirectory: "true", directory: "true" } as any)} className="hidden" id="notion-folder" onChange={(e) => handleFolderSelect(e, "notion")} />
                <Button variant="outline" onClick={() => document.getElementById("notion-folder")?.click()}><FolderOpen className="h-4 w-4 mr-2" />Select Notion Export</Button>
              </TabsContent>

              {/* Roam tab */}
              <TabsContent value="roam" className="mt-3 space-y-3">
                <p className="text-sm text-muted-foreground">Export from Roam Research as JSON, then upload the file. Page references and tags will be extracted automatically.</p>
                <input type="file" accept=".json" className="hidden" id="roam-upload" onChange={handleRoamUpload} />
                <Button variant="outline" onClick={() => document.getElementById("roam-upload")?.click()}><FileJson className="h-4 w-4 mr-2" />Upload Roam JSON</Button>
              </TabsContent>

              {/* CSV/JSON tab */}
              <TabsContent value="csv" className="mt-3 space-y-3">
                <input type="file" accept=".csv,.json" className="hidden" id="csv-upload" onChange={handleCsvUpload} />
                <Button variant="outline" onClick={() => document.getElementById("csv-upload")?.click()}><FileJson className="h-4 w-4 mr-2" />Upload CSV or JSON</Button>

                {(csvHeaders.length > 0 || jsonFields.length > 0) && (
                  <div className="space-y-3 border border-border rounded-lg p-4">
                    <p className="text-sm font-medium">Map fields to card properties</p>
                    <div className="grid grid-cols-2 gap-3">
                      {["title", "content", "tags", "category"].map((field) => (
                        <div key={field}>
                          <Label className="capitalize text-xs">{field}{field === "title" || field === "content" ? " *" : ""}</Label>
                          <Select value={(csvMapping as any)[field]} onValueChange={(v) => setCsvMapping((p) => ({ ...p, [field]: v }))}>
                            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue placeholder={`Select ${field} column`} /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">— None —</SelectItem>
                              {(jsonFields.length > 0 ? jsonFields : csvHeaders).map((h) => (
                                <SelectItem key={h} value={h}>{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>

                    {/* Preview table */}
                    {(csvRows.length > 0 || jsonRecords.length > 0) && (
                      <div className="max-h-36 overflow-auto rounded border border-border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {(jsonFields.length > 0 ? jsonFields : csvHeaders).slice(0, 5).map((h) => (
                                <TableHead key={h} className="text-xs py-1 px-2">{h}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(jsonRecords.length > 0 ? jsonRecords : csvRows).slice(0, 5).map((row, i) => (
                              <TableRow key={i}>
                                {(jsonFields.length > 0 ? jsonFields : csvHeaders).slice(0, 5).map((h, j) => (
                                  <TableCell key={j} className="text-xs py-1 px-2 max-w-[120px] truncate">
                                    {jsonRecords.length > 0 ? String((row as any)[h] || "") : (row as string[])[j] || ""}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    <Button onClick={handleCsvMappingImport} disabled={!csvMapping.title || !csvMapping.content}>
                      <Plus className="h-4 w-4 mr-2" />Process {jsonRecords.length || csvRows.length} Records
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Options bar */}
            <div className="flex items-center gap-4 pt-2 border-t border-border text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Switch checked={checkDuplicates} onCheckedChange={setCheckDuplicates} className="scale-75" />
                Check duplicates
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Switch checked={resolveWikilinks} onCheckedChange={setResolveWikilinks} className="scale-75" />
                Resolve wikilinks
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <Switch checked={quickImport} onCheckedChange={setQuickImport} className="scale-75" />
                <Zap className="h-3 w-3" />Quick import
              </label>
            </div>

            {/* Progress */}
            {progressMsg && (
              <div className="space-y-1">
                <Progress value={progress} className="h-1.5" />
                <p className="text-xs text-muted-foreground">{progressMsg}</p>
              </div>
            )}
          </div>
        )}

        {/* ─── Step: Review ────────────────────────────────────────────── */}
        {step === "review" && (
          <div className="flex-1 overflow-hidden flex flex-col gap-3">
            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" size="sm" onClick={() => { setStep("source"); setItems([]); }}>
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />Back
              </Button>
              <div className="flex-1 relative max-w-xs">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input value={reviewSearch} onChange={(e) => setReviewSearch(e.target.value)} placeholder="Search..." className="h-8 pl-7 text-xs" />
              </div>
              <Select value={reviewCategoryFilter} onValueChange={setReviewCategoryFilter}>
                <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORY_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={selectedCount === items.filter((i) => i.status !== "error" && i.status !== "duplicate").length} onCheckedChange={(c) => toggleAll(!!c)} />
                <span>{selectedCount}/{items.length} selected</span>
                {dupCount > 0 && <Badge variant="outline" className="text-xs">{dupCount} dupes</Badge>}
                {errorCount > 0 && <Badge variant="destructive" className="text-xs">{errorCount} errors</Badge>}
              </div>
            </div>

            {/* Items list */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-1.5 pr-2">
                {filteredItems.map((item) => (
                  <div key={item.id} className={`border rounded-lg p-2.5 text-sm transition-colors ${item.status === "duplicate" ? "opacity-50 border-destructive/30" : item.status === "error" ? "opacity-50 border-destructive/30" : item.status === "similar" ? "border-accent/50" : "border-border"}`}>
                    <div className="flex items-start gap-2">
                      <Checkbox checked={item.selected} onCheckedChange={(c) => updateItem(item.id, { selected: !!c })} disabled={item.status === "error"} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{item.name}</span>
                          {item.status === "duplicate" && <Badge variant="destructive" className="text-[10px]">Duplicate</Badge>}
                          {item.status === "similar" && <Badge variant="outline" className="text-[10px] border-accent/50 text-accent-foreground">{Math.round((item.similarityScore || 0) * 100)}% similar to "{item.similarTo}"</Badge>}
                          {item.status === "error" && <Badge variant="destructive" className="text-[10px]">{item.error}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.preview}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {/* Category selector */}
                          <Select value={item.category} onValueChange={(v) => updateItem(item.id, { category: v })}>
                            <SelectTrigger className="h-6 w-auto text-[10px] px-2 gap-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CATEGORY_OPTIONS.map((c) => <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          {/* Tags */}
                          {item.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px] h-5 gap-0.5 cursor-pointer" onClick={() => updateItem(item.id, { tags: item.tags.filter((t) => t !== tag) })}>
                              {tag}<X className="h-2.5 w-2.5" />
                            </Badge>
                          ))}
                          {item.wikilinks && item.wikilinks.length > 0 && (
                            <Badge variant="outline" className="text-[10px] h-5">
                              <Link2 className="h-2.5 w-2.5 mr-0.5" />{item.wikilinks.length} links
                            </Badge>
                          )}
                          {item.folderPath && (
                            <Badge variant="outline" className="text-[10px] h-5">
                              <FolderOpen className="h-2.5 w-2.5 mr-0.5" />{item.folderPath}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
              <Button onClick={handleImport} disabled={selectedCount === 0}>
                <Upload className="h-4 w-4 mr-2" />Import {selectedCount} Cards
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step: Importing ─────────────────────────────────────────── */}
        {step === "importing" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{progressMsg}</p>
            <Progress value={progress} className="w-64 h-2" />
          </div>
        )}

        {/* ─── Step: Summary ───────────────────────────────────────────── */}
        {step === "summary" && summary && (
          <div className="flex-1 overflow-auto space-y-4 py-2">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="border border-border rounded-lg p-3 text-center">
                <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{summary.cardsCreated}</p>
                <p className="text-xs text-muted-foreground">Cards Created</p>
              </div>
              <div className="border border-border rounded-lg p-3 text-center">
                <Link2 className="h-6 w-6 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold">{summary.linksResolved}</p>
                <p className="text-xs text-muted-foreground">Links Resolved</p>
              </div>
              <div className="border border-border rounded-lg p-3 text-center">
                <XCircle className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                <p className="text-2xl font-bold">{summary.duplicatesSkipped}</p>
                <p className="text-xs text-muted-foreground">Duplicates Skipped</p>
              </div>
              <div className="border border-border rounded-lg p-3 text-center">
                <AlertCircle className="h-6 w-6 mx-auto mb-1 text-destructive" />
                <p className="text-2xl font-bold">{summary.errors.length}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>

            {/* Category breakdown */}
            {Object.keys(summary.categoryBreakdown).length > 0 && (
              <div className="border border-border rounded-lg p-3">
                <p className="text-sm font-medium mb-2 flex items-center gap-1.5"><BarChart3 className="h-4 w-4" />Category Distribution</p>
                <div className="space-y-1.5">
                  {Object.entries(summary.categoryBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, count]) => {
                      const label = CATEGORY_OPTIONS.find((c) => c.value === cat)?.label || cat;
                      const pct = Math.round((count / summary.cardsCreated) * 100);
                      return (
                        <div key={cat} className="flex items-center gap-2 text-xs">
                          <span className="w-40 truncate text-muted-foreground">{label}</span>
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-muted-foreground w-8 text-right">{count}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Errors list */}
            {summary.errors.length > 0 && (
              <div className="border border-destructive/30 rounded-lg p-3">
                <p className="text-sm font-medium text-destructive mb-1.5">Errors</p>
                {summary.errors.map((e, i) => (
                  <p key={i} className="text-xs text-muted-foreground">• {e.name}: {e.error}</p>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { resetState(); }}>
                <Plus className="h-4 w-4 mr-2" />Import More
              </Button>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
