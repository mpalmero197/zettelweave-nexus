import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileText, BookOpen, StickyNote, ExternalLink, Globe,
  Link as LinkIcon, Plus, FileEdit, Video, ShoppingCart,
  Newspaper, Image as ImageIcon, Sparkles, MoreVertical,
  Save, CheckSquare, XSquare, ArrowRight, MessageSquare,
} from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { useState } from "react";
import { toast } from "sonner";
import { ContextualInsightsPanel } from "@/components/ContextualInsightsPanel";

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
}

interface StickyNoteType {
  id: string;
  content: string;
  color: string;
  timestamp: string;
}

interface ScratchNote {
  id: string;
  content: string;
  timestamp: Date;
}

interface SearchResultsProps {
  query: string;
  cards: ZettelCardType[];
  notes: Note[];
  stickyNotes: StickyNoteType[];
  scratchNotes?: ScratchNote[];
  webResults?: {
    query: string;
    result: string;
    images?: string[];
    videos?: string[];
    shopping?: string[];
    news?: string[];
    citations?: string[];
    relatedQuestions?: string[];
    contextualData?: any;
  } | null;
  generatedImage?: {
    imageUrl: string;
    prompt: string;
  } | null;
  multimediaResults?: {
    videos: any[];
    images: any[];
  } | null;
  reasoning?: string;
  intent?: string;
  onNavigateToCard?: (cardId: string) => void;
  onNavigateToNote?: (noteId: string) => void;
  onNavigateToStickyNote?: (noteId: string) => void;
  onSaveAsCard?: (content: string, source?: string) => void;
  onSaveAsNote?: (content: string, source?: string) => void;
  onSaveToScratchpad?: (content: string) => void;
}

export function UnifiedSearchResults({
  query,
  cards,
  notes,
  stickyNotes,
  scratchNotes = [],
  webResults,
  generatedImage,
  multimediaResults,
  reasoning,
  intent,
  onNavigateToCard,
  onNavigateToNote,
  onNavigateToStickyNote,
  onSaveAsCard,
  onSaveAsNote,
  onSaveToScratchpad
}: SearchResultsProps) {
  const totalResults = cards.length + notes.length + stickyNotes.length + scratchNotes.length;

  // Batch selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isBatchMode, setIsBatchMode] = useState(false);

  const toggleItemSelection = (id: string, type: 'image' | 'video' | 'citation') => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      const key = `${type}:${id}`;
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectAllOfType = (type: 'images' | 'videos' | 'citations') => {
    const items = type === 'images' ? (multimediaResults?.images || []) :
                  type === 'videos' ? (multimediaResults?.videos || []) :
                  (webResults?.citations || []);
    setSelectedItems(prev => {
      const next = new Set(prev);
      items.forEach((_: any, idx: number) => next.add(`${type.slice(0, -1)}:${idx}`));
      return next;
    });
  };

  const clearSelection = () => setSelectedItems(new Set());

  const handleBatchSave = async (action: 'card' | 'note' | 'scratch') => {
    if (selectedItems.size === 0) { toast.error('No items selected'); return; }
    let savedCount = 0;
    for (const key of selectedItems) {
      const [type, id] = key.split(':');
      const idx = parseInt(id);
      let content = '';
      let source = '';

      if (type === 'image') {
        const img = (multimediaResults?.images || [])[idx];
        if (!img) continue;
        content = `![${query}](${img})\n\nImage source: ${img}`;
        source = img;
      } else if (type === 'video') {
        const vid = (multimediaResults?.videos || [])[idx];
        if (!vid) continue;
        content = `Video: ${vid}`;
        source = vid;
      } else if (type === 'citation') {
        const cite = (webResults?.citations || [])[idx];
        if (!cite) continue;
        content = `Web Result: ${cite}`;
        source = cite;
      }

      if (action === 'card' && onSaveAsCard) { onSaveAsCard(content, source); savedCount++; }
      else if (action === 'note' && onSaveAsNote) { onSaveAsNote(content, source); savedCount++; }
      else if (action === 'scratch' && onSaveToScratchpad) { onSaveToScratchpad(content); savedCount++; }
    }
    toast.success(`Saved ${savedCount} item${savedCount !== 1 ? 's' : ''}`);
    clearSelection();
  };

  if (totalResults === 0 && !webResults && !generatedImage && !multimediaResults) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-2xl bg-muted/40 p-5 mb-5 text-muted-foreground/50">
          <Globe className="h-10 w-10" />
        </div>
        <p className="text-base font-semibold text-foreground mb-1">No results found</p>
        <p className="text-sm text-muted-foreground">No matches for "{query}" — try different keywords</p>
      </div>
    );
  }

  const handleSaveImage = (imageUrl: string, action: 'card' | 'note' | 'scratch') => {
    const content = `![${query}](${imageUrl})\n\nImage source: ${imageUrl}`;
    if (action === 'card' && onSaveAsCard) { onSaveAsCard(content, imageUrl); toast.success('Image saved as card'); }
    else if (action === 'note' && onSaveAsNote) { onSaveAsNote(content, imageUrl); toast.success('Image saved as note'); }
    else if (action === 'scratch' && onSaveToScratchpad) { onSaveToScratchpad(content); toast.success('Image saved to scratchpad'); }
  };

  const handleSaveLink = (url: string, type: string, action: 'card' | 'note' | 'scratch') => {
    const content = `${type}: ${url}`;
    if (action === 'card' && onSaveAsCard) { onSaveAsCard(content, url); toast.success(`${type} saved as card`); }
    else if (action === 'note' && onSaveAsNote) { onSaveAsNote(content, url); toast.success(`${type} saved as note`); }
    else if (action === 'scratch' && onSaveToScratchpad) { onSaveToScratchpad(content); toast.success(`${type} saved to scratchpad`); }
  };

  const highlightText = (text: string, q: string) => {
    if (!q) return text;
    const parts = text.split(new RegExp(`(${q})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ?
        <mark key={i} className="bg-primary/20 text-foreground rounded-sm px-0.5">{part}</mark> :
        part
    );
  };

  const intentConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    internal_search: { label: "Your Knowledge", icon: <Sparkles className="h-3 w-3" />, color: "bg-primary/10 text-primary border-primary/20" },
    web_search: { label: "Web Search", icon: <Globe className="h-3 w-3" />, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
    image_generation: { label: "AI Generated", icon: <Sparkles className="h-3 w-3" />, color: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
    multimedia_search: { label: "Multimedia", icon: <Video className="h-3 w-3" />, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  };

  const SaveDropdown = ({ onSave }: { onSave: (action: 'card' | 'note' | 'scratch') => void }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl">
        {onSaveAsCard && <DropdownMenuItem onClick={() => onSave('card')}><FileText className="h-3.5 w-3.5 mr-2" />Save as Card</DropdownMenuItem>}
        {onSaveAsNote && <DropdownMenuItem onClick={() => onSave('note')}><BookOpen className="h-3.5 w-3.5 mr-2" />Save as Note</DropdownMenuItem>}
        {onSaveToScratchpad && <DropdownMenuItem onClick={() => onSave('scratch')}><FileEdit className="h-3.5 w-3.5 mr-2" />Save to Scratchpad</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-5">
      {/* ── Search Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 flex-wrap">
          {intent && intentConfig[intent] && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${intentConfig[intent].color}`}>
              {intentConfig[intent].icon}
              {intentConfig[intent].label}
            </span>
          )}
          <h2 className="text-sm font-medium text-muted-foreground">
            Results for <span className="text-foreground font-semibold">"{query}"</span>
          </h2>
        </div>
        {(multimediaResults || webResults?.citations) && (
          <Button
            variant={isBatchMode ? "default" : "ghost"}
            size="sm"
            className="h-8 rounded-lg text-xs"
            onClick={() => { setIsBatchMode(!isBatchMode); if (isBatchMode) clearSelection(); }}
          >
            {isBatchMode ? <XSquare className="h-3.5 w-3.5 mr-1.5" /> : <CheckSquare className="h-3.5 w-3.5 mr-1.5" />}
            {isBatchMode ? 'Exit' : 'Select'}
          </Button>
        )}
      </div>

      {/* ── Reasoning badge ── */}
      {reasoning && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-xl px-3 py-2 border border-border/30">
          <Sparkles className="h-3 w-3 text-primary shrink-0" />
          <span>{reasoning}</span>
        </div>
      )}

      {/* ── Batch Actions ── */}
      {isBatchMode && selectedItems.size > 0 && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground">{selectedItems.size}</Badge>
            <span className="text-sm text-muted-foreground">selected</span>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearSelection}>Clear</Button>
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg" onClick={() => handleBatchSave('card')}>
              <FileText className="h-3.5 w-3.5 mr-1.5" />Cards
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg" onClick={() => handleBatchSave('note')}>
              <BookOpen className="h-3.5 w-3.5 mr-1.5" />Notes
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg" onClick={() => handleBatchSave('scratch')}>
              <FileEdit className="h-3.5 w-3.5 mr-1.5" />Scratchpad
            </Button>
          </div>
        </div>
      )}

      {/* ── AI Generated Image ── */}
      {generatedImage && (
        <Card className="overflow-hidden rounded-xl border-border/40 bg-card/50 backdrop-blur-sm">
          <div className="p-4 border-b border-border/30 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">AI Generated Image</span>
          </div>
          <div className="p-4 space-y-3">
            <img src={generatedImage.imageUrl} alt={generatedImage.prompt} className="w-full rounded-lg" />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground italic">"{generatedImage.prompt}"</p>
              <SaveDropdown onSave={(action) => handleSaveImage(generatedImage.imageUrl, action)} />
            </div>
          </div>
        </Card>
      )}

      {/* ── Multimedia Results ── */}
      {multimediaResults && (multimediaResults.videos.length > 0 || multimediaResults.images.length > 0) && (
        <Card className="overflow-hidden rounded-xl border-border/40 bg-card/50 backdrop-blur-sm">
          <div className="p-4 border-b border-border/30 flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Multimedia</span>
          </div>
          <Tabs defaultValue="videos" className="w-full">
            <div className="px-4 pt-3">
              <TabsList className="h-8 p-0.5 bg-muted/40 rounded-lg">
                <TabsTrigger value="videos" className="text-xs h-7 rounded-md px-3">Videos ({multimediaResults.videos?.length || 0})</TabsTrigger>
                <TabsTrigger value="images" className="text-xs h-7 rounded-md px-3">Images ({multimediaResults.images?.length || 0})</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="videos" className="p-4 pt-3">
              {multimediaResults.videos?.length > 0 ? (
                <>
                  {isBatchMode && (
                    <div className="flex justify-end mb-2">
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => selectAllOfType('videos')}>Select All</Button>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {multimediaResults.videos.map((video: string, index: number) => {
                      const isSelected = selectedItems.has(`video:${index}`);
                      return (
                        <div key={index} className={`group flex items-center gap-3 p-3 rounded-xl border transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border/30 hover:border-primary/20 hover:bg-muted/20'}`}>
                          {isBatchMode && (
                            <Checkbox checked={isSelected} onCheckedChange={() => toggleItemSelection(String(index), 'video')} />
                          )}
                          <Video className="h-4 w-4 text-primary shrink-0" />
                          <a href={video} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex-1 truncate font-medium">
                            {(() => { try { return new URL(video).hostname; } catch { return video; } })()}
                          </a>
                          {!isBatchMode && <SaveDropdown onSave={(action) => handleSaveLink(video, 'Video', action)} />}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : <p className="text-muted-foreground text-center py-6 text-sm">No videos found</p>}
            </TabsContent>

            <TabsContent value="images" className="p-4 pt-3">
              {multimediaResults.images?.length > 0 ? (
                <>
                  {isBatchMode && (
                    <div className="flex justify-end mb-2">
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => selectAllOfType('images')}>Select All</Button>
                    </div>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {multimediaResults.images.map((image: string, index: number) => {
                      const isSelected = selectedItems.has(`image:${index}`);
                      return (
                        <div key={index} className={`group relative rounded-xl overflow-hidden ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                          {isBatchMode && (
                            <div className="absolute top-2 left-2 z-10">
                              <Checkbox checked={isSelected} onCheckedChange={() => toggleItemSelection(String(index), 'image')} className="bg-background/80 backdrop-blur-sm" />
                            </div>
                          )}
                          <img src={image} alt={`Result ${index + 1}`} className="w-full h-28 object-cover" loading="lazy" />
                          {!isBatchMode && (
                            <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="secondary" size="sm" className="h-7 w-7 p-0 rounded-lg shadow-lg"><Save className="h-3 w-3" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl">
                                  <DropdownMenuItem onClick={() => handleSaveImage(image, 'card')}>Save as Card</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSaveImage(image, 'note')}>Save as Note</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSaveImage(image, 'scratch')}>Save to Scratchpad</DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : <p className="text-muted-foreground text-center py-6 text-sm">No images found</p>}
            </TabsContent>
          </Tabs>
        </Card>
      )}

      {/* ── Local Results: Cards ── */}
      {cards.length > 0 && (
        <ResultSection icon={<FileText className="h-4 w-4" />} title="Cards" count={cards.length}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card.id}
                onClick={() => onNavigateToCard?.(card.id)}
                className="group p-3.5 rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm hover:border-primary/20 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold leading-snug line-clamp-1">{highlightText(card.title, query)}</h3>
                  <Badge variant="outline" className="text-[10px] shrink-0 ml-2 rounded-md">{card.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2.5">
                  {highlightText(card.content.substring(0, 120), query)}
                </p>
                {card.tags && card.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {card.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* ── Local Results: Notes ── */}
      {notes.length > 0 && (
        <ResultSection icon={<BookOpen className="h-4 w-4" />} title="Notes" count={notes.length}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <div
                key={note.id}
                onClick={() => onNavigateToNote?.(note.id)}
                className="group p-3.5 rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm hover:border-primary/20 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <h3 className="text-sm font-semibold leading-snug line-clamp-1 mb-1.5">{highlightText(note.title, query)}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                  {highlightText(note.content.substring(0, 120), query)}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground/70">{format(new Date(note.created_at), 'MMM d, yyyy')}</span>
                  {note.tags?.slice(0, 2).map((tag, i) => (
                    <span key={i} className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-md">{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* ── Local Results: Sticky Notes ── */}
      {stickyNotes.length > 0 && (
        <ResultSection icon={<StickyNote className="h-4 w-4" />} title="Sticky Notes" count={stickyNotes.length}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stickyNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => onNavigateToStickyNote?.(note.id)}
                className="group p-3.5 rounded-xl border border-border/30 hover:border-primary/20 hover:shadow-md transition-all duration-200 cursor-pointer"
                style={{ backgroundColor: `${note.color}20` }}
              >
                <p className="text-xs whitespace-pre-wrap line-clamp-3 leading-relaxed mb-2">
                  {highlightText(note.content.substring(0, 120), query)}
                </p>
                <span className="text-[10px] text-muted-foreground/70">{note.timestamp}</span>
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* ── Local Results: Scratchpad ── */}
      {scratchNotes.length > 0 && (
        <ResultSection icon={<FileEdit className="h-4 w-4" />} title="Scratchpad" count={scratchNotes.length}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scratchNotes.map((note) => (
              <div key={note.id} className="p-3.5 rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm">
                <p className="text-xs whitespace-pre-wrap font-mono line-clamp-3 leading-relaxed mb-2">
                  {highlightText(note.content.substring(0, 120), query)}
                </p>
                <span className="text-[10px] text-muted-foreground/70">{format(new Date(note.timestamp), 'MMM d, yyyy')}</span>
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {/* ── Web Results ── */}
      {webResults && webResults.result && (
        <div className="space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-base font-bold">Web Results</h2>
            {webResults.relatedQuestions && webResults.relatedQuestions.length > 0 && (
              <Badge variant="secondary" className="text-[10px] rounded-md ml-auto">
                {webResults.relatedQuestions.length} related
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-4">
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="w-full grid grid-cols-6 h-9 p-0.5 bg-muted/30 backdrop-blur-sm rounded-xl border border-border/20">
                  {[
                    { value: "all", icon: Globe, label: "All" },
                    { value: "web", icon: FileText, label: "Web" },
                    { value: "images", icon: ImageIcon, label: "Images", count: webResults.images?.length },
                    { value: "videos", icon: Video, label: "Videos", count: webResults.videos?.length },
                    { value: "shopping", icon: ShoppingCart, label: "Shop", count: webResults.shopping?.length },
                    { value: "news", icon: Newspaper, label: "News", count: webResults.news?.length },
                  ].map(({ value, icon: Icon, label, count }) => (
                    <TabsTrigger key={value} value={value} className="text-[11px] gap-1 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                      <Icon className="h-3 w-3" />
                      <span className="hidden sm:inline">{label}</span>
                      {count != null && count > 0 && <span className="text-[9px] bg-muted rounded-full px-1 min-w-[16px] text-center">{count}</span>}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* All Tab */}
                <TabsContent value="all" className="space-y-5 mt-4">
                  {/* Image preview strip */}
                  {webResults.images && webResults.images.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Images</span>
                        <span className="text-[10px] text-muted-foreground">{webResults.images.length} found</span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                        {webResults.images.slice(0, 8).map((img, idx) => (
                          <a key={idx} href={img} target="_blank" rel="noopener noreferrer"
                            className="shrink-0 rounded-xl overflow-hidden hover:ring-2 hover:ring-primary/30 transition-all">
                            <img src={img} alt={`${query} ${idx + 1}`} className="h-20 w-20 object-cover bg-muted"
                              loading="lazy" onError={(e) => { (e.currentTarget as HTMLElement).parentElement?.remove(); }} />
                          </a>
                        ))}
                        {webResults.images.length > 8 && (
                          <div className="shrink-0 h-20 w-20 rounded-xl bg-muted/40 flex items-center justify-center text-xs text-muted-foreground font-medium">
                            +{webResults.images.length - 8}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Summary card */}
                  <Card className="rounded-xl border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
                    <div className="p-4 border-b border-border/20 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">Summary</span>
                    </div>
                    <CardContent className="p-4 space-y-4">
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-semibold">
                        <ReactMarkdown>{webResults.result}</ReactMarkdown>
                      </div>
                      {(onSaveAsCard || onSaveAsNote || onSaveToScratchpad) && (
                        <div className="flex flex-wrap gap-2 pt-3 border-t border-border/20">
                          {onSaveAsCard && (
                            <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg" onClick={() => onSaveAsCard(webResults.result, webResults.citations?.[0])}>
                              <Plus className="h-3 w-3 mr-1.5" />Save as Card
                            </Button>
                          )}
                          {onSaveAsNote && (
                            <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg" onClick={() => onSaveAsNote(webResults.result, webResults.citations?.[0])}>
                              <FileEdit className="h-3 w-3 mr-1.5" />Save as Note
                            </Button>
                          )}
                          {onSaveToScratchpad && (
                            <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg" onClick={() => onSaveToScratchpad(webResults.result)}>
                              <FileEdit className="h-3 w-3 mr-1.5" />Scratchpad
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Related Questions */}
                  {webResults.relatedQuestions && webResults.relatedQuestions.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">People also ask</span>
                      </div>
                      <div className="space-y-1.5">
                        {webResults.relatedQuestions.map((q, idx) => (
                          <div key={idx} className="px-3.5 py-2.5 rounded-xl border border-border/30 hover:border-primary/20 hover:bg-muted/20 transition-all cursor-pointer text-sm">
                            {q}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Citations */}
                  {webResults.citations && webResults.citations.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <LinkIcon className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sources</span>
                        </div>
                        {isBatchMode && (
                          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => selectAllOfType('citations')}>Select All</Button>
                        )}
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {webResults.citations.map((citation, idx) => {
                          const isSelected = selectedItems.has(`citation:${idx}`);
                          let hostname = '';
                          try { hostname = new URL(citation).hostname.replace('www.', ''); } catch { hostname = citation; }
                          return (
                            <div key={idx} className={`group flex items-center gap-2.5 p-3 rounded-xl border transition-all ${isSelected ? 'border-primary bg-primary/5' : 'border-border/30 hover:border-primary/20 hover:bg-muted/10'}`}>
                              {isBatchMode && <Checkbox checked={isSelected} onCheckedChange={() => toggleItemSelection(String(idx), 'citation')} />}
                              <div className="flex-1 min-w-0">
                                <a href={citation} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline truncate block">
                                  {hostname}
                                </a>
                                <span className="text-[10px] text-muted-foreground/60 truncate block">{citation}</span>
                              </div>
                              <ExternalLink className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                              {!isBatchMode && <SaveDropdown onSave={(action) => handleSaveLink(citation, 'Source', action)} />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Web Tab */}
                <TabsContent value="web" className="space-y-4 mt-4">
                  <Card className="rounded-xl border-border/40 bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{webResults.result}</ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                  {webResults.citations && webResults.citations.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sources</span>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {webResults.citations.map((citation, idx) => {
                          let hostname = '';
                          try { hostname = new URL(citation).hostname.replace('www.', ''); } catch { hostname = citation; }
                          return (
                            <a key={idx} href={citation} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2.5 rounded-xl border border-border/30 hover:border-primary/20 hover:bg-muted/10 transition-all text-xs text-primary font-medium">
                              <ExternalLink className="h-3 w-3 shrink-0" />{hostname}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* Images Tab */}
                <TabsContent value="images" className="mt-4">
                  {webResults.images && webResults.images.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {webResults.images.map((img, idx) => (
                        <div key={idx} className="group relative rounded-xl overflow-hidden">
                          <a href={img} target="_blank" rel="noopener noreferrer">
                            <img src={img} alt={`${query} ${idx + 1}`} className="w-full aspect-square object-cover bg-muted hover:opacity-90 transition-opacity"
                              loading="lazy" onError={(e) => { (e.currentTarget.closest('.group') as HTMLElement)?.remove(); }} />
                          </a>
                          {(onSaveAsCard || onSaveAsNote || onSaveToScratchpad) && (
                            <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="sm" variant="secondary" className="h-7 w-7 p-0 rounded-lg shadow-lg"><Save className="h-3 w-3" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl">
                                  {onSaveAsCard && <DropdownMenuItem onClick={() => handleSaveImage(img, 'card')}>Save as Card</DropdownMenuItem>}
                                  {onSaveAsNote && <DropdownMenuItem onClick={() => handleSaveImage(img, 'note')}>Save as Note</DropdownMenuItem>}
                                  {onSaveToScratchpad && <DropdownMenuItem onClick={() => handleSaveImage(img, 'scratch')}>Scratchpad</DropdownMenuItem>}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : <EmptyTab icon={ImageIcon} label="No images found" />}
                </TabsContent>

                {/* Videos Tab */}
                <TabsContent value="videos" className="mt-4">
                  {webResults.videos && webResults.videos.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {webResults.videos.map((videoUrl, idx) => (
                        <LinkRow key={idx} url={videoUrl} icon={Video} type="Video" onSave={handleSaveLink} />
                      ))}
                    </div>
                  ) : <EmptyTab icon={Video} label="No videos found" />}
                </TabsContent>

                {/* Shopping Tab */}
                <TabsContent value="shopping" className="mt-4">
                  {webResults.shopping && webResults.shopping.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {webResults.shopping.map((shopUrl, idx) => (
                        <LinkRow key={idx} url={shopUrl} icon={ShoppingCart} type="Shopping" onSave={handleSaveLink} />
                      ))}
                    </div>
                  ) : <EmptyTab icon={ShoppingCart} label="No shopping results" />}
                </TabsContent>

                {/* News Tab */}
                <TabsContent value="news" className="mt-4">
                  {webResults.news && webResults.news.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {webResults.news.map((newsUrl, idx) => (
                        <LinkRow key={idx} url={newsUrl} icon={Newspaper} type="News" onSave={handleSaveLink} />
                      ))}
                    </div>
                  ) : <EmptyTab icon={Newspaper} label="No news found" />}
                </TabsContent>
              </Tabs>
            </div>

            {/* Contextual Insights */}
            {webResults.contextualData && (
              <div className="lg:col-span-1">
                <div className="lg:sticky lg:top-6">
                  <ContextualInsightsPanel data={webResults.contextualData} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Results */}
      {totalResults === 0 && !webResults && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-2xl bg-muted/40 p-5 mb-5 text-muted-foreground/50">
            <Globe className="h-10 w-10" />
          </div>
          <p className="text-base font-semibold mb-1">No results found</p>
          <p className="text-sm text-muted-foreground">Try different keywords or check your spelling</p>
        </div>
      )}
    </div>
  );
}

/* ── Shared sub-components ── */

function ResultSection({ icon, title, count, children }: {
  icon: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-muted/50 text-muted-foreground">{icon}</div>
        <h2 className="text-sm font-bold">{title}</h2>
        <span className="text-[10px] text-muted-foreground bg-muted/40 rounded-full px-2 py-0.5">{count}</span>
      </div>
      {children}
    </div>
  );
}

function EmptyTab({ icon: Icon, label }: { icon: React.FC<any>; label: string }) {
  return (
    <div className="flex flex-col items-center py-12 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/30 mb-3" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function LinkRow({ url, icon: Icon, type, onSave }: {
  url: string;
  icon: React.FC<any>;
  type: string;
  onSave: (url: string, type: string, action: 'card' | 'note' | 'scratch') => void;
}) {
  let hostname = '';
  try { hostname = new URL(url).hostname.replace('www.', ''); } catch { hostname = url; }

  return (
    <div className="group flex items-center gap-2.5 p-3 rounded-xl border border-border/30 hover:border-primary/20 hover:bg-muted/10 transition-all">
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline truncate block">{hostname}</a>
        <span className="text-[10px] text-muted-foreground/60 truncate block">{url}</span>
      </div>
      <ExternalLink className="h-3 w-3 text-muted-foreground/40 shrink-0" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-xl">
          <DropdownMenuItem onClick={() => onSave(url, type, 'card')}><FileText className="h-3.5 w-3.5 mr-2" />Save as Card</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSave(url, type, 'note')}><BookOpen className="h-3.5 w-3.5 mr-2" />Save as Note</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSave(url, type, 'scratch')}><FileEdit className="h-3.5 w-3.5 mr-2" />Scratchpad</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
