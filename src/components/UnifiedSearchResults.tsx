import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, BookOpen, StickyNote, Calendar, ExternalLink, Globe, Image as ImageIcon, Link as LinkIcon } from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";

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
  webResults?: { query: string; result: string; images?: string[]; citations?: string[]; relatedQuestions?: string[] } | null;
  reasoning?: string;
  onNavigateToCard?: (cardId: string) => void;
  onNavigateToNote?: (noteId: string) => void;
  onNavigateToStickyNote?: (noteId: string) => void;
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
  onNavigateToStickyNote
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

      {/* Web Results */}
      {webResults && webResults.result && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Web Results
          </h2>
          
          {/* Images */}
          {webResults.images && webResults.images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {webResults.images.slice(0, 8).map((img, idx) => (
                <Card key={idx} className="overflow-hidden hover:shadow-hover transition-all">
                  <img
                    src={img}
                    alt={`Result ${idx + 1}`}
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </Card>
              ))}
            </div>
          )}

          {/* Main Content */}
          <Card className="glass-card">
            <CardContent className="pt-6 prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{webResults.result}</ReactMarkdown>
            </CardContent>
          </Card>

          {/* Citations */}
          {webResults.citations && webResults.citations.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {webResults.citations.map((citation, idx) => (
                    <a
                      key={idx}
                      href={citation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {citation}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Related Questions */}
          {webResults.relatedQuestions && webResults.relatedQuestions.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">Related Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {webResults.relatedQuestions.map((q, idx) => (
                    <Badge key={idx} variant="secondary" className="cursor-pointer hover:bg-primary/20">
                      {q}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* No Results */}
      {totalResults === 0 && !webResults && (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No results found for "{query}". Try different keywords or check your spelling.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
