import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, BookOpen, StickyNote, ExternalLink, Globe, Link as LinkIcon, Plus, FileEdit, Video, ShoppingCart, Newspaper, Image as ImageIcon } from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { useState } from "react";

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
  reasoning?: string;
  onNavigateToCard?: (cardId: string) => void;
  onNavigateToNote?: (noteId: string) => void;
  onNavigateToStickyNote?: (noteId: string) => void;
  onSaveAsCard?: (content: string, source?: string) => void;
  onSaveAsNote?: (content: string, source?: string) => void;
}

export function UnifiedSearchResults({
  query,
  cards,
  notes,
  stickyNotes,
  scratchNotes = [],
  webResults,
  reasoning,
  onNavigateToCard,
  onNavigateToNote,
  onNavigateToStickyNote,
  onSaveAsCard,
  onSaveAsNote
}: SearchResultsProps) {
  const totalResults = cards.length + notes.length + stickyNotes.length + scratchNotes.length;

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
          <CardTitle className="flex items-center gap-2">
            Search Results for "{query}"
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Found {totalResults} result{totalResults !== 1 ? 's' : ''} across your content
            </p>
            {reasoning && (
              <Badge variant="secondary" className="text-xs">
                {reasoning}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

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
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Web Search Results
          </h2>
          
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-4">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                All
              </TabsTrigger>
              <TabsTrigger value="web" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Web
              </TabsTrigger>
              <TabsTrigger value="images" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Images {webResults.images && `(${webResults.images.length})`}
              </TabsTrigger>
              <TabsTrigger value="videos" className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Videos {webResults.videos && `(${webResults.videos.length})`}
              </TabsTrigger>
              <TabsTrigger value="shopping" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Shopping {webResults.shopping && `(${webResults.shopping.length})`}
              </TabsTrigger>
              <TabsTrigger value="news" className="flex items-center gap-2">
                <Newspaper className="h-4 w-4" />
                News {webResults.news && `(${webResults.news.length})`}
              </TabsTrigger>
            </TabsList>

            {/* All Tab */}
            <TabsContent value="all" className="space-y-6">
              {/* Images Preview */}
              {webResults.images && webResults.images.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    Images
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {webResults.images.slice(0, 6).map((img, idx) => (
                      <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="group">
                        <Card className="overflow-hidden hover:shadow-lg hover:scale-105 transition-all cursor-pointer">
                          <img
                            src={img}
                            alt={`${query} - ${idx + 1}`}
                            className="w-full h-40 object-cover"
                            loading="lazy"
                            onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}
                          />
                        </Card>
                      </a>
                    ))}
                  </div>
                  {webResults.images.length > 6 && (
                    <p className="text-sm text-muted-foreground mt-2">View all {webResults.images.length} images in the Images tab</p>
                  )}
                </div>
              )}

              {/* Main Content */}
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
                    <ReactMarkdown>{webResults.result}</ReactMarkdown>
                  </div>
                  {(onSaveAsCard || onSaveAsNote) && (
                    <div className="flex gap-2 mt-4 pt-4 border-t">
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
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Citations */}
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
            <TabsContent value="images">
              {webResults.images && webResults.images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {webResults.images.map((img, idx) => (
                    <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="group">
                      <Card className="overflow-hidden hover:shadow-lg hover:scale-105 transition-all cursor-pointer">
                        <img
                          src={img}
                          alt={`${query} - Result ${idx + 1}`}
                          className="w-full h-48 object-cover"
                          loading="lazy"
                          onError={(e) => { e.currentTarget.parentElement!.style.display = 'none'; }}
                        />
                      </Card>
                    </a>
                  ))}
                </div>
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No images found for this search</p>
                </Card>
              )}
            </TabsContent>

            {/* Videos Tab */}
            <TabsContent value="videos">
              {webResults.videos && webResults.videos.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {webResults.videos.map((videoUrl, idx) => (
                    <Card key={idx} className="p-4 hover:shadow-hover transition-all">
                      <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 text-sm group">
                        <Video className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                        <div className="flex-1 min-w-0">
                          <span className="text-primary group-hover:underline break-all">{videoUrl}</span>
                        </div>
                        <ExternalLink className="h-4 w-4 flex-shrink-0 opacity-50 group-hover:opacity-100" />
                      </a>
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
                    <Card key={idx} className="p-4 hover:shadow-hover transition-all">
                      <a href={shopUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 text-sm group">
                        <ShoppingCart className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                        <div className="flex-1 min-w-0">
                          <span className="text-primary group-hover:underline break-all">{shopUrl}</span>
                        </div>
                        <ExternalLink className="h-4 w-4 flex-shrink-0 opacity-50 group-hover:opacity-100" />
                      </a>
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
                    <Card key={idx} className="p-4 hover:shadow-hover transition-all">
                      <a href={newsUrl} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 text-sm group">
                        <Newspaper className="h-5 w-5 mt-0.5 flex-shrink-0 text-primary" />
                        <div className="flex-1 min-w-0">
                          <span className="text-primary group-hover:underline break-all">{newsUrl}</span>
                        </div>
                        <ExternalLink className="h-4 w-4 flex-shrink-0 opacity-50 group-hover:opacity-100" />
                      </a>
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
