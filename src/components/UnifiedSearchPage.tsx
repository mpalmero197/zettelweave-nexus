import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Search, Loader2, Brain, GraduationCap, Video, BookOpen,
  ExternalLink, Play,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AISearchBar } from "@/components/AISearchBar";
import { UnifiedSearchResults } from "@/components/UnifiedSearchResults";
import { SearchHistorySidebar } from "@/components/SearchHistorySidebar";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { ZettelCard as ZettelCardType } from "@/types/zettel";

/* ── Video types & constants ── */
interface VideoResult {
  title: string;
  url: string;
  thumbnail: string;
  provider: string;
  channel: string;
  description: string;
}

const VIDEO_PROVIDER_COLOR: Record<string, string> = {
  YouTube: "bg-red-500/90 text-white border-transparent",
  Odysee: "bg-purple-500/90 text-white border-transparent",
  "Khan Academy": "bg-green-600/90 text-white border-transparent",
  TED: "bg-red-600/90 text-white border-transparent",
  PeerTube: "bg-orange-500/90 text-white border-transparent",
  Vimeo: "bg-sky-500/90 text-white border-transparent",
  Web: "bg-muted text-muted-foreground",
};

/* ── Book types ── */
interface BookResult {
  key: string;
  title: string;
  author: string;
  year?: number;
  coverId?: number;
  subjects?: string[];
  ebookAccess?: string;
}

/* ── Shared popular topics ── */
const POPULAR_TOPICS = [
  "Machine Learning", "Web Development", "Data Science",
  "Psychology", "Creative Writing", "Mathematics",
  "Computer Science", "Philosophy", "Cybersecurity",
];

const POPULAR_BOOKS = [
  "Atomic Habits", "Sapiens", "Deep Work",
  "Thinking Fast and Slow", "The Art of War",
  "Meditations", "1984", "Dune",
];

/* ── Props ── */
interface UnifiedSearchPageProps {
  cards: ZettelCardType[];
  searchResults: any;
  onSearchResults: (results: any) => void;
  onQueryChange: (q: string) => void;
  currentQuery: string;
  onNavigateToCard: (cardId: string) => void;
  onNavigateToNote: (noteId: string) => void;
  onNavigateToStickyNote: (noteId: string) => void;
  onSaveAsCard: (content: string, source?: string) => void;
  onSaveAsNote: (content: string, source?: string) => void;
  onSaveToScratchpad: (content: string) => void;
  createCard: (card: any) => void;
}

export function UnifiedSearchPage({
  cards,
  searchResults,
  onSearchResults,
  onQueryChange,
  currentQuery,
  onNavigateToCard,
  onNavigateToNote,
  onNavigateToStickyNote,
  onSaveAsCard,
  onSaveAsNote,
  onSaveToScratchpad,
  createCard,
}: UnifiedSearchPageProps) {
  const { history, addToHistory, clearHistory, removeItem } = useSearchHistory();
  const [subTab, setSubTab] = useState("knowledge");

  /* ── Video search state ── */
  const [videoResults, setVideoResults] = useState<VideoResult[]>([]);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoSearched, setVideoSearched] = useState(false);

  /* ── Book search state ── */
  const [bookResults, setBookResults] = useState<BookResult[]>([]);
  const [bookLoading, setBookLoading] = useState(false);
  const [bookSearched, setBookSearched] = useState(false);

  /* ── Shared query ── */
  const [query, setQuery] = useState(currentQuery);

  useEffect(() => {
    setQuery(currentQuery);
  }, [currentQuery]);

  const handleQueryChange = (v: string) => {
    setQuery(v);
    onQueryChange(v);
  };

  /* ── Search dispatchers ── */
  const searchVideos = async (q: string) => {
    if (!q.trim()) return;
    setVideoLoading(true);
    setVideoSearched(true);
    setVideoResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("search-videos", {
        body: { query: q.trim() },
      });
      if (error) throw error;
      if (data?.success && data.data) {
        setVideoResults(data.data);
        addToHistory({ query: q.trim(), intent: "videos", resultCount: data.data.length, hasVideos: true });
        if (data.data.length === 0) toast.info("No videos found.");
      } else throw new Error(data?.error || "Search failed");
    } catch {
      toast.error("Failed to search videos");
    } finally {
      setVideoLoading(false);
    }
  };

  const searchBooks = async (q: string) => {
    if (!q.trim()) return;
    setBookLoading(true);
    setBookSearched(true);
    setBookResults([]);
    try {
      const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=40&fields=key,title,author_name,first_publish_year,cover_i,subject,ebook_access`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to search");
      const data = await res.json();
      const results = (data.docs || []).map((doc: any) => ({
        key: doc.key,
        title: doc.title,
        author: doc.author_name?.[0] || "Unknown author",
        year: doc.first_publish_year,
        coverId: doc.cover_i,
        subjects: doc.subject?.slice(0, 4),
        ebookAccess: doc.ebook_access || "no_ebook",
      }));
      setBookResults(results);
      addToHistory({ query: q.trim(), intent: "books", resultCount: results.length });
    } catch {
      toast.error("Book search failed");
    } finally {
      setBookLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (subTab === "courses") {
      window.open(
        `https://www.classcentral.com/search?q=${encodeURIComponent(query.trim())}`,
        "_blank",
        "noopener,noreferrer"
      );
      addToHistory({ query: query.trim(), intent: "courses", resultCount: 0 });
    } else if (subTab === "videos") {
      searchVideos(query);
    } else if (subTab === "books") {
      searchBooks(query);
    }
  };

  const handleRerunSearch = (q: string) => {
    handleQueryChange(q);
    toast.success(`Re-running search: "${q}"`);
  };

  const handleCombineSearches = (queries: string[]) => {
    const combined = queries.join(" AND ");
    handleQueryChange(combined);
    toast.success("Combined searches – ready to execute");
  };

  const chipAction = (topic: string) => {
    handleQueryChange(topic);
    if (subTab === "courses") {
      window.open(
        `https://www.classcentral.com/search?q=${encodeURIComponent(topic)}`,
        "_blank",
        "noopener,noreferrer"
      );
    } else if (subTab === "videos") {
      searchVideos(topic);
    } else if (subTab === "books") {
      searchBooks(topic);
    }
  };

  return (
    <div className="space-y-0">
      {/* ── Search input (non-knowledge tabs) ── */}
      {subTab !== "knowledge" && (
        <div className="sticky top-10 md:top-12 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-2 sm:px-3 py-2">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder={
                    subTab === "courses"
                      ? "Search courses on Class Central…"
                      : subTab === "videos"
                      ? "Search educational videos…"
                      : "Search millions of books…"
                  }
                  className="pl-9"
                  autoFocus
                />
              </div>
              <Button type="submit" disabled={videoLoading || bookLoading}>
                {(videoLoading || bookLoading) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : subTab === "courses" ? (
                  <><ExternalLink className="h-4 w-4 mr-1.5" />Search</>
                ) : (
                  <><Search className="h-4 w-4 mr-1.5" />Search</>
                )}
              </Button>
              <SearchHistorySidebar
                history={history}
                onRerun={handleRerunSearch}
                onCombine={handleCombineSearches}
                onClear={clearHistory}
                onRemove={removeItem}
              />
            </form>
          </div>
        </div>
      )}

      {/* ── Sub-tab strip ── */}
      <div className="px-2 sm:px-3 pt-2">
        <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 max-w-lg">
            <TabsTrigger value="knowledge" className="gap-1.5 text-xs sm:text-sm">
              <Brain className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Knowledge</span>
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-1.5 text-xs sm:text-sm">
              <GraduationCap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Courses</span>
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-1.5 text-xs sm:text-sm">
              <Video className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Videos</span>
            </TabsTrigger>
            <TabsTrigger value="books" className="gap-1.5 text-xs sm:text-sm">
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Books</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Knowledge ── */}
          <TabsContent value="knowledge" className="mt-3">
            <div className="p-3 sm:p-4">
              {searchResults ? (
                <UnifiedSearchResults
                  query={searchResults.query}
                  cards={searchResults.cards}
                  notes={searchResults.notes}
                  stickyNotes={searchResults.stickyNotes}
                  scratchNotes={searchResults.scratchNotes}
                  webResults={searchResults.webResults}
                  generatedImage={searchResults.generatedImage}
                  multimediaResults={searchResults.multimediaResults}
                  reasoning={searchResults.reasoning}
                  intent={searchResults.intent}
                  onNavigateToCard={onNavigateToCard}
                  onNavigateToNote={onNavigateToNote}
                  onNavigateToStickyNote={onNavigateToStickyNote}
                  onSaveAsCard={onSaveAsCard}
                  onSaveAsNote={onSaveAsNote}
                  onSaveToScratchpad={onSaveToScratchpad}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground text-sm">
                    Use the search bar above to find content across your notes, cards, and sticky notes.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Courses ── */}
          <TabsContent value="courses" className="mt-3">
            <div className="p-3 sm:p-4 space-y-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                Results open on Class Central in a new tab
              </p>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground font-medium">Popular topics</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_TOPICS.map((topic) => (
                    <Badge
                      key={topic}
                      variant="outline"
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => chipAction(topic)}
                    >
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── Videos ── */}
          <TabsContent value="videos" className="mt-3">
            <div className="p-3 sm:p-4 space-y-4">
              {!videoSearched && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground font-medium">Popular topics</p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_TOPICS.map((topic) => (
                      <Badge
                        key={topic}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => chipAction(topic)}
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    Searches YouTube, Odysee, Khan Academy, TED & more
                  </p>
                </div>
              )}

              {videoLoading && (
                <div className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Searching videos…</p>
                </div>
              )}

              {!videoLoading && videoSearched && videoResults.length === 0 && (
                <div className="text-center py-12 space-y-3">
                  <Video className="h-10 w-10 mx-auto opacity-40 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No results found</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button size="sm" variant="outline" onClick={() =>
                      window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer")
                    }>
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Search YouTube
                    </Button>
                  </div>
                </div>
              )}

              {videoResults.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {videoResults.map((video, i) => (
                    <Card key={i} className="overflow-hidden border-border/50 hover:border-primary/30 transition-colors group">
                      <div className="relative">
                        <AspectRatio ratio={16 / 9}>
                          {video.thumbnail ? (
                            <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover bg-muted" loading="lazy" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Video className="h-8 w-8 text-muted-foreground/40" />
                            </div>
                          )}
                        </AspectRatio>
                        <Badge className={`absolute top-2 left-2 text-[10px] ${VIDEO_PROVIDER_COLOR[video.provider] || VIDEO_PROVIDER_COLOR.Web}`}>
                          {video.provider}
                        </Badge>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                          <div className="rounded-full bg-background/90 p-2">
                            <Play className="h-5 w-5 text-foreground fill-foreground" />
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-3 space-y-1.5">
                        <h3 className="text-sm font-medium leading-snug line-clamp-2 text-foreground">{video.title}</h3>
                        <p className="text-[11px] text-muted-foreground">{video.channel}</p>
                        {video.description && <p className="text-xs text-muted-foreground line-clamp-2">{video.description}</p>}
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs h-7 mt-1"
                          onClick={() => window.open(video.url, "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink className="h-3 w-3 mr-1.5" />Watch
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Books ── */}
          <TabsContent value="books" className="mt-3">
            <div className="p-3 sm:p-4 space-y-4">
              {!bookSearched && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground font-medium">Try searching for</p>
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_BOOKS.map((term) => (
                      <Badge
                        key={term}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => chipAction(term)}
                      >
                        {term}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {bookLoading && (
                <div className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Searching books…</p>
                </div>
              )}

              {!bookLoading && bookSearched && bookResults.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="h-10 w-10 mx-auto opacity-40 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">No books found</p>
                </div>
              )}

              {bookResults.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {bookResults.map((book) => (
                    <Card key={book.key} className="overflow-hidden border-border/50 hover:border-primary/30 transition-colors">
                      <CardContent className="p-3 flex gap-3">
                        {book.coverId ? (
                          <img
                            src={`https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`}
                            alt={book.title}
                            className="w-16 h-24 object-cover rounded bg-muted shrink-0"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-16 h-24 bg-muted rounded flex items-center justify-center shrink-0">
                            <BookOpen className="h-6 w-6 text-muted-foreground/40" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <h3 className="text-sm font-medium leading-snug line-clamp-2 text-foreground">{book.title}</h3>
                          <p className="text-[11px] text-muted-foreground">{book.author}{book.year ? ` · ${book.year}` : ""}</p>
                          {book.subjects && book.subjects.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {book.subjects.slice(0, 3).map((s) => (
                                <Badge key={s} variant="secondary" className="text-[9px]">{s}</Badge>
                              ))}
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 mt-1"
                            onClick={() => window.open(`https://openlibrary.org${book.key}`, "_blank", "noopener,noreferrer")}
                          >
                            <ExternalLink className="h-3 w-3 mr-1.5" />View on Open Library
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
