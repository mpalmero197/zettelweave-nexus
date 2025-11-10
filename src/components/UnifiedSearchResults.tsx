import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, BookOpen, StickyNote, ExternalLink, Globe, Link as LinkIcon, Plus, FileEdit, Video, ShoppingCart, Newspaper, Image as ImageIcon, Sparkles, MoreVertical, Save, CheckSquare, XSquare } from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { useState } from "react";
import { toast } from "sonner";

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
}

interface StickyNote {
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
  stickyNotes: StickyNote[];
  scratchNotes?: ScratchNote[];
  webResults?: { 
    query: string; 
    result: string; 
    images?: string[]; 
    videos?: string[];
    shopping?: string[];
    news?: string[];
    citations?: string[]; 
    relatedQuestions?: string[] 
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
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };
  
  const selectAllOfType = (type: 'images' | 'videos' | 'citations') => {
    const items = type === 'images' ? (multimediaResults?.images || []) :
                  type === 'videos' ? (multimediaResults?.videos || []) :
                  (webResults?.citations || []);
    
    setSelectedItems(prev => {
      const next = new Set(prev);
      items.forEach((item: any, idx: number) => {
        next.add(`${type.slice(0, -1)}:${idx}`);
      });
      return next;
    });
  };
  
  const clearSelection = () => {
    setSelectedItems(new Set());
  };
  
  const handleBatchSave = async (action: 'card' | 'note' | 'scratch') => {
    if (selectedItems.size === 0) {
      toast.error('No items selected');
      return;
    }
    
    let savedCount = 0;
    
    for (const key of selectedItems) {
      const [type, id] = key.split(':');
      const idx = parseInt(id);
      
      if (type === 'image') {
        const images = multimediaResults?.images || [];
        if (images[idx]) {
          const content = `![${query}](${images[idx]})\n\nImage source: ${images[idx]}`;
          if (action === 'card' && onSaveAsCard) {
            onSaveAsCard(content, images[idx]);
            savedCount++;
          } else if (action === 'note' && onSaveAsNote) {
            onSaveAsNote(content, images[idx]);
            savedCount++;
          } else if (action === 'scratch' && onSaveToScratchpad) {
            onSaveToScratchpad(content);
            savedCount++;
          }
        }
      } else if (type === 'video') {
        const videos = multimediaResults?.videos || [];
        if (videos[idx]) {
          const content = `Video: ${videos[idx]}`;
          if (action === 'card' && onSaveAsCard) {
            onSaveAsCard(content, videos[idx]);
            savedCount++;
          } else if (action === 'note' && onSaveAsNote) {
            onSaveAsNote(content, videos[idx]);
            savedCount++;
          } else if (action === 'scratch' && onSaveToScratchpad) {
            onSaveToScratchpad(content);
            savedCount++;
          }
        }
      } else if (type === 'citation') {
        const citations = webResults?.citations || [];
        if (citations[idx]) {
          const content = `Web Result: ${citations[idx]}`;
          if (action === 'card' && onSaveAsCard) {
            onSaveAsCard(content, citations[idx]);
            savedCount++;
          } else if (action === 'note' && onSaveAsNote) {
            onSaveAsNote(content, citations[idx]);
            savedCount++;
          } else if (action === 'scratch' && onSaveToScratchpad) {
            onSaveToScratchpad(content);
            savedCount++;
          }
        }
      }
    }
    
    toast.success(`Saved ${savedCount} item${savedCount !== 1 ? 's' : ''} to ${action === 'card' ? 'cards' : action === 'note' ? 'notes' : 'scratchpad'}`);
    clearSelection();
  };
  
  if (totalResults === 0 && !webResults && !generatedImage && !multimediaResults) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">No results found for "{query}"</p>
      </Card>
    );
  }

  const getIntentBadge = () => {
    if (!intent) return null;
    
    const badges = {
      internal_search: { label: "In Your Notes", variant: "default" as const },
      web_search: { label: "Live Web Search", variant: "secondary" as const },
      image_generation: { label: "AI Generated", variant: "outline" as const },
      multimedia_search: { label: "Multimedia Search", variant: "secondary" as const }
    };
    
    const badge = badges[intent as keyof typeof badges];
    if (!badge) return null;
    
    return (
      <Badge variant={badge.variant} className="mb-2">
        <Sparkles className="h-3 w-3 mr-1" />
        {badge.label}
      </Badge>
    );
  };

  const handleSaveImage = (imageUrl: string, action: 'card' | 'note' | 'scratch') => {
    const content = `![${query}](${imageUrl})\n\nImage source: ${imageUrl}`;
    if (action === 'card' && onSaveAsCard) {
      onSaveAsCard(content, imageUrl);
      toast.success('Image saved as card');
    } else if (action === 'note' && onSaveAsNote) {
      onSaveAsNote(content, imageUrl);
      toast.success('Image saved as note');
    } else if (action === 'scratch' && onSaveToScratchpad) {
      onSaveToScratchpad(content);
      toast.success('Image saved to scratchpad');
    }
  };

  const handleSaveLink = (url: string, type: string, action: 'card' | 'note' | 'scratch') => {
    const content = `${type}: ${url}`;
    if (action === 'card' && onSaveAsCard) {
      onSaveAsCard(content, url);
      toast.success(`${type} saved as card`);
    } else if (action === 'note' && onSaveAsNote) {
      onSaveAsNote(content, url);
      toast.success(`${type} saved as note`);
    } else if (action === 'scratch' && onSaveToScratchpad) {
      onSaveToScratchpad(content);
      toast.success(`${type} saved to scratchpad`);
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <mark key={i} className="bg-primary/30 text-foreground">{part}</mark> : 
        part
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Summary */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getIntentBadge()}
              Search Results for "{query}"
            </div>
            {(multimediaResults || webResults?.citations) && (
              <Button
                variant={isBatchMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsBatchMode(!isBatchMode);
                  if (isBatchMode) clearSelection();
                }}
              >
                {isBatchMode ? <XSquare className="h-4 w-4 mr-2" /> : <CheckSquare className="h-4 w-4 mr-2" />}
                {isBatchMode ? 'Exit Batch Mode' : 'Batch Select'}
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {intent === 'internal_search' && (
              <p className="text-muted-foreground">
                Found {totalResults} result{totalResults !== 1 ? 's' : ''} in your notes
              </p>
            )}
            {intent === 'web_search' && (
              <p className="text-muted-foreground">Live web search results</p>
            )}
            {intent === 'image_generation' && (
              <p className="text-muted-foreground">AI-generated image</p>
            )}
            {intent === 'multimedia_search' && (
              <p className="text-muted-foreground">Multimedia search results</p>
            )}
            {reasoning && (
              <Badge variant="secondary" className="text-xs">
                {reasoning}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Batch Actions Toolbar */}
      {isBatchMode && selectedItems.size > 0 && (
        <Card className="glass-card border-primary">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default">{selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected</Badge>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleBatchSave('card')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Save as Cards
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBatchSave('note')}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Save as Notes
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleBatchSave('scratch')}>
                  <FileEdit className="h-4 w-4 mr-2" />
                  Save to Scratchpad
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Generated Image */}
      {generatedImage && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Generated Image
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <img 
              src={generatedImage.imageUrl} 
              alt={generatedImage.prompt}
              className="w-full rounded-lg border"
            />
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Prompt: {generatedImage.prompt}</p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleSaveImage(generatedImage.imageUrl, 'card')}>
                    Save as Card
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSaveImage(generatedImage.imageUrl, 'note')}>
                    Save as Note
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSaveImage(generatedImage.imageUrl, 'scratch')}>
                    Save to Scratchpad
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Multimedia Results */}
      {multimediaResults && (multimediaResults.videos.length > 0 || multimediaResults.images.length > 0) && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Multimedia Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="videos">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="videos">
                  Videos ({multimediaResults.videos?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="images">
                  Images ({multimediaResults.images?.length || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="videos" className="space-y-4 mt-4">
                {multimediaResults.videos && multimediaResults.videos.length > 0 ? (
                  <>
                    {isBatchMode && (
                      <div className="flex justify-end mb-2">
                        <Button variant="ghost" size="sm" onClick={() => selectAllOfType('videos')}>
                          Select All Videos
                        </Button>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {multimediaResults.videos.map((video: string, index: number) => {
                        const itemKey = `video:${index}`;
                        const isSelected = selectedItems.has(itemKey);
                        
                        return (
                          <Card key={index} className={`p-4 ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                            <div className="flex items-start justify-between gap-2">
                              {isBatchMode && (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleItemSelection(String(index), 'video')}
                                  className="mt-1"
                                />
                              )}
                              <a 
                                href={video}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex-1 truncate"
                              >
                                {new URL(video).hostname}
                              </a>
                              {!isBatchMode && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem onClick={() => handleSaveLink(video, 'Video', 'card')}>
                                      Save as Card
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSaveLink(video, 'Video', 'note')}>
                                      Save as Note
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSaveLink(video, 'Video', 'scratch')}>
                                      Save to Scratchpad
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No videos found</p>
                )}
              </TabsContent>

              <TabsContent value="images" className="space-y-4 mt-4">
                {multimediaResults.images && multimediaResults.images.length > 0 ? (
                  <>
                    {isBatchMode && (
                      <div className="flex justify-end mb-2">
                        <Button variant="ghost" size="sm" onClick={() => selectAllOfType('images')}>
                          Select All Images
                        </Button>
                      </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {multimediaResults.images.map((image: string, index: number) => {
                        const itemKey = `image:${index}`;
                        const isSelected = selectedItems.has(itemKey);
                        
                        return (
                          <Card key={index} className={`p-2 ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                            <div className="relative group">
                              {isBatchMode && (
                                <div className="absolute top-2 left-2 z-10">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleItemSelection(String(index), 'image')}
                                    className="bg-background"
                                  />
                                </div>
                              )}
                              <img 
                                src={image} 
                                alt={`Result ${index + 1}`}
                                className="w-full h-32 object-cover rounded"
                              />
                              {!isBatchMode && (
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="secondary" size="sm">
                                        <Save className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem onClick={() => handleSaveImage(image, 'card')}>
                                        Save as Card
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleSaveImage(image, 'note')}>
                                        Save as Note
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleSaveImage(image, 'scratch')}>
                                        Save to Scratchpad
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No images found</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Cards Results */}
      {cards.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Zettelkarten Cards ({cards.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <Card key={card.id} className="glass-card hover:shadow-hover transition-all">
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{highlightText(card.title, query)}</span>
                    <Badge variant="outline">{card.category}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {highlightText(card.content.substring(0, 150), query)}...
                  </p>
                  {card.tags && card.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {card.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {highlightText(tag, query)}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {onNavigateToCard && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => onNavigateToCard(card.id)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Card
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Notes Results */}
      {notes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Notes ({notes.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <Card key={note.id} className="glass-card hover:shadow-hover transition-all">
                <CardHeader>
                  <CardTitle className="text-base">
                    {highlightText(note.title, query)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {highlightText(note.content.substring(0, 150), query)}...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(note.created_at), 'PPp')}
                  </p>
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {note.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {highlightText(tag, query)}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {onNavigateToNote && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => onNavigateToNote(note.id)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Note
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Sticky Notes Results */}
      {stickyNotes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Sticky Notes ({stickyNotes.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stickyNotes.map((note) => (
              <Card 
                key={note.id} 
                className="hover:shadow-hover transition-all"
                style={{ backgroundColor: note.color }}
              >
                <CardContent className="pt-4">
                  <p className="text-sm whitespace-pre-wrap mb-2">
                    {highlightText(note.content.substring(0, 150), query)}
                    {note.content.length > 150 && '...'}
                  </p>
                  <p className="text-xs opacity-70 mb-3">
                    {note.timestamp}
                  </p>
                  {onNavigateToStickyNote && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => onNavigateToStickyNote(note.id)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Note
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Scratch Notes Results */}
      {scratchNotes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Scratchpad Notes ({scratchNotes.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {scratchNotes.map((note) => (
              <Card key={note.id} className="glass-card hover:shadow-hover transition-all">
                <CardContent className="pt-4">
                  <p className="text-sm whitespace-pre-wrap mb-2 font-mono">
                    {highlightText(note.content.substring(0, 150), query)}
                    {note.content.length > 150 && '...'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(note.timestamp), 'PPp')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Web Results with Tabs */}
      {webResults && webResults.result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" />
              Web Search Results
            </h2>
            {webResults.relatedQuestions && webResults.relatedQuestions.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {webResults.relatedQuestions.length} related questions
              </Badge>
            )}
          </div>
          
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-6 h-auto p-1 bg-muted/50 rounded-lg">
              <TabsTrigger value="all" className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Globe className="h-4 w-4" />
                <span className="hidden sm:inline">All</span>
              </TabsTrigger>
              <TabsTrigger value="web" className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Web</span>
              </TabsTrigger>
              <TabsTrigger value="images" className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <ImageIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Images</span>
                {webResults.images && webResults.images.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-xs">{webResults.images.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="videos" className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Video className="h-4 w-4" />
                <span className="hidden sm:inline">Videos</span>
                {webResults.videos && webResults.videos.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-xs">{webResults.videos.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="shopping" className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Shop</span>
                {webResults.shopping && webResults.shopping.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-xs">{webResults.shopping.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="news" className="flex items-center gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Newspaper className="h-4 w-4" />
                <span className="hidden sm:inline">News</span>
                {webResults.news && webResults.news.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-xs">{webResults.news.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* All Tab */}
            <TabsContent value="all" className="space-y-8">
              {/* Images Preview */}
              {webResults.images && webResults.images.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-primary" />
                      Images from the web
                    </h3>
                    <Badge variant="outline">{webResults.images.length} found</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {webResults.images.slice(0, 12).map((img, idx) => (
                      <div key={idx} className="group relative">
                        <a href={img} target="_blank" rel="noopener noreferrer" className="block">
                          <Card className="overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-primary/20">
                            <img
                              src={img}
                              alt={`${query} - Result ${idx + 1}`}
                              className="w-full aspect-square object-cover group-hover:opacity-90 transition-opacity"
                              loading="lazy"
                              onError={(e) => { 
                                const card = e.currentTarget.closest('.group');
                                if (card) card.remove();
                              }}
                            />
                          </Card>
                        </a>
                        {(onSaveAsCard || onSaveAsNote || onSaveToScratchpad) && (
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="secondary" className="h-7 w-7 p-0 shadow-lg">
                                  <Save className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {onSaveAsCard && (
                                  <DropdownMenuItem onClick={() => handleSaveImage(img, 'card')}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Save as Card
                                  </DropdownMenuItem>
                                )}
                                {onSaveAsNote && (
                                  <DropdownMenuItem onClick={() => handleSaveImage(img, 'note')}>
                                    <BookOpen className="h-4 w-4 mr-2" />
                                    Save as Note
                                  </DropdownMenuItem>
                                )}
                                {onSaveToScratchpad && (
                                  <DropdownMenuItem onClick={() => handleSaveImage(img, 'scratch')}>
                                    <FileEdit className="h-4 w-4 mr-2" />
                                    Save to Scratchpad
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {webResults.images.length > 12 && (
                    <div className="text-center">
                      <Badge variant="secondary" className="cursor-default">
                        + {webResults.images.length - 12} more images in the Images tab
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              {/* Main Content */}
              <Card className="glass-card border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Search Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{webResults.result}</ReactMarkdown>
                  </div>
                  {(onSaveAsCard || onSaveAsNote || onSaveToScratchpad) && (
                    <div className="flex flex-wrap gap-2 pt-4 border-t">
                      {onSaveAsCard && (
                        <Button variant="outline" size="sm" onClick={() => onSaveAsCard(webResults.result, webResults.citations?.[0])}>
                          <Plus className="h-4 w-4 mr-2" />
                          Save as Card
                        </Button>
                      )}
                      {onSaveAsNote && (
                        <Button variant="outline" size="sm" onClick={() => onSaveAsNote(webResults.result, webResults.citations?.[0])}>
                          <FileEdit className="h-4 w-4 mr-2" />
                          Save as Note
                        </Button>
                      )}
                      {onSaveToScratchpad && (
                        <Button variant="outline" size="sm" onClick={() => onSaveToScratchpad(webResults.result)}>
                          <FileEdit className="h-4 w-4 mr-2" />
                          Save to Scratchpad
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Related Questions */}
              {webResults.relatedQuestions && webResults.relatedQuestions.length > 0 && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      People also ask
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {webResults.relatedQuestions.map((question, idx) => (
                        <Card key={idx} className="p-3 hover:shadow-md transition-all cursor-pointer hover:border-primary/30">
                          <p className="text-sm font-medium">{question}</p>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Citations */}
              {webResults.citations && webResults.citations.length > 0 && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4" />
                        Sources ({webResults.citations.length})
                      </div>
                      {isBatchMode && (
                        <Button variant="ghost" size="sm" onClick={() => selectAllOfType('citations')}>
                          Select All
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2">
                      {webResults.citations.map((citation, idx) => {
                        const itemKey = `citation:${idx}`;
                        const isSelected = selectedItems.has(itemKey);
                        
                        return (
                          <Card key={idx} className={`p-3 hover:shadow-hover transition-all group ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                            <div className="flex items-start justify-between gap-2">
                              {isBatchMode && (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleItemSelection(String(idx), 'citation')}
                                  className="mt-1"
                                />
                              )}
                              <a href={citation} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-sm text-primary hover:underline flex-1 min-w-0">
                                <ExternalLink className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span className="break-all">{citation}</span>
                              </a>
                              {!isBatchMode && (onSaveAsCard || onSaveAsNote || onSaveToScratchpad) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {onSaveAsCard && (
                                      <DropdownMenuItem onClick={() => handleSaveLink(citation, 'Source', 'card')}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        Save as Card
                                      </DropdownMenuItem>
                                    )}
                                    {onSaveAsNote && (
                                      <DropdownMenuItem onClick={() => handleSaveLink(citation, 'Source', 'note')}>
                                        <BookOpen className="h-4 w-4 mr-2" />
                                        Save as Note
                                      </DropdownMenuItem>
                                    )}
                                    {onSaveToScratchpad && (
                                      <DropdownMenuItem onClick={() => handleSaveLink(citation, 'Source', 'scratch')}>
                                        <FileEdit className="h-4 w-4 mr-2" />
                                        Save to Scratchpad
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Web Tab */}
            <TabsContent value="web" className="space-y-6">
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{webResults.result}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
              
              {webResults.citations && webResults.citations.length > 0 && (
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      Sources ({webResults.citations.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 md:grid-cols-2">
                      {webResults.citations.map((citation, idx) => (
                        <Card key={idx} className="p-3 hover:shadow-hover transition-all">
                          <a href={citation} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 text-sm text-primary hover:underline">
                            <ExternalLink className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span className="break-all">{citation}</span>
                          </a>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Images Tab */}
            <TabsContent value="images" className="space-y-4">
              {webResults.images && webResults.images.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {webResults.images.length} image{webResults.images.length !== 1 ? 's' : ''} from across the web
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                    {webResults.images.map((img, idx) => (
                      <div key={idx} className="group relative">
                        <a href={img} target="_blank" rel="noopener noreferrer" className="block">
                          <Card className="overflow-hidden hover:shadow-2xl hover:scale-[1.03] transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-primary/30">
                            <div className="relative aspect-square">
                              <img
                                src={img}
                                alt={`${query} - Result ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:opacity-95 transition-opacity"
                                loading="lazy"
                                onError={(e) => { 
                                  const card = e.currentTarget.closest('.group');
                                  if (card) card.remove();
                                }}
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <ExternalLink className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </div>
                          </Card>
                        </a>
                        {(onSaveAsCard || onSaveAsNote || onSaveToScratchpad) && (
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="secondary" className="h-7 w-7 p-0 shadow-lg">
                                  <Save className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {onSaveAsCard && (
                                  <DropdownMenuItem onClick={() => handleSaveImage(img, 'card')}>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Save as Card
                                  </DropdownMenuItem>
                                )}
                                {onSaveAsNote && (
                                  <DropdownMenuItem onClick={() => handleSaveImage(img, 'note')}>
                                    <BookOpen className="h-4 w-4 mr-2" />
                                    Save as Note
                                  </DropdownMenuItem>
                                )}
                                {onSaveToScratchpad && (
                                  <DropdownMenuItem onClick={() => handleSaveImage(img, 'scratch')}>
                                    <FileEdit className="h-4 w-4 mr-2" />
                                    Save to Scratchpad
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <Card className="p-12 text-center border-2 border-dashed">
                  <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground font-medium">No images found for "{query}"</p>
                  <p className="text-sm text-muted-foreground/70 mt-2">Try a different search term</p>
                </Card>
              )}
            </TabsContent>

            {/* Videos Tab */}
            <TabsContent value="videos">
              {webResults.videos && webResults.videos.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {webResults.videos.map((videoUrl, idx) => (
                    <Card key={idx} className="p-4 hover:shadow-hover transition-all group">
                      <div className="flex items-start justify-between gap-3">
                        <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 text-sm flex-1 min-w-0">
                          <Video className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                          <span className="text-primary group-hover:underline break-all">{videoUrl}</span>
                        </a>
                        {(onSaveAsCard || onSaveAsNote || onSaveToScratchpad) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {onSaveAsCard && (
                                <DropdownMenuItem onClick={() => handleSaveLink(videoUrl, 'Video', 'card')}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Save as Card
                                </DropdownMenuItem>
                              )}
                              {onSaveAsNote && (
                                <DropdownMenuItem onClick={() => handleSaveLink(videoUrl, 'Video', 'note')}>
                                  <BookOpen className="h-4 w-4 mr-2" />
                                  Save as Note
                                </DropdownMenuItem>
                              )}
                              {onSaveToScratchpad && (
                                <DropdownMenuItem onClick={() => handleSaveLink(videoUrl, 'Video', 'scratch')}>
                                  <FileEdit className="h-4 w-4 mr-2" />
                                  Save to Scratchpad
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No videos found for this search</p>
                </Card>
              )}
            </TabsContent>

            {/* Shopping Tab */}
            <TabsContent value="shopping">
              {webResults.shopping && webResults.shopping.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {webResults.shopping.map((shopUrl, idx) => (
                    <Card key={idx} className="p-4 hover:shadow-hover transition-all group">
                      <div className="flex items-start justify-between gap-3">
                        <a href={shopUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 text-sm flex-1 min-w-0">
                          <ShoppingCart className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                          <span className="text-primary group-hover:underline break-all">{shopUrl}</span>
                        </a>
                        {(onSaveAsCard || onSaveAsNote || onSaveToScratchpad) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {onSaveAsCard && (
                                <DropdownMenuItem onClick={() => handleSaveLink(shopUrl, 'Shopping', 'card')}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Save as Card
                                </DropdownMenuItem>
                              )}
                              {onSaveAsNote && (
                                <DropdownMenuItem onClick={() => handleSaveLink(shopUrl, 'Shopping', 'note')}>
                                  <BookOpen className="h-4 w-4 mr-2" />
                                  Save as Note
                                </DropdownMenuItem>
                              )}
                              {onSaveToScratchpad && (
                                <DropdownMenuItem onClick={() => handleSaveLink(shopUrl, 'Shopping', 'scratch')}>
                                  <FileEdit className="h-4 w-4 mr-2" />
                                  Save to Scratchpad
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No shopping results found for this search</p>
                </Card>
              )}
            </TabsContent>

            {/* News Tab */}
            <TabsContent value="news">
              {webResults.news && webResults.news.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {webResults.news.map((newsUrl, idx) => (
                    <Card key={idx} className="p-4 hover:shadow-hover transition-all group">
                      <div className="flex items-start justify-between gap-3">
                        <a href={newsUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 text-sm flex-1 min-w-0">
                          <Newspaper className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                          <span className="text-primary group-hover:underline break-all">{newsUrl}</span>
                        </a>
                        {(onSaveAsCard || onSaveAsNote || onSaveToScratchpad) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {onSaveAsCard && (
                                <DropdownMenuItem onClick={() => handleSaveLink(newsUrl, 'News', 'card')}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Save as Card
                                </DropdownMenuItem>
                              )}
                              {onSaveAsNote && (
                                <DropdownMenuItem onClick={() => handleSaveLink(newsUrl, 'News', 'note')}>
                                  <BookOpen className="h-4 w-4 mr-2" />
                                  Save as Note
                                </DropdownMenuItem>
                              )}
                              {onSaveToScratchpad && (
                                <DropdownMenuItem onClick={() => handleSaveLink(newsUrl, 'News', 'scratch')}>
                                  <FileEdit className="h-4 w-4 mr-2" />
                                  Save to Scratchpad
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No news found for this search</p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* No Results Message */}
      {totalResults === 0 && !webResults && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground text-lg">No results found for "{query}"</p>
          <p className="text-sm text-muted-foreground mt-2">Try different keywords or check your spelling</p>
        </Card>
      )}
    </div>
  );
}
