import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Search, Loader2, Brain, GraduationCap, Video, BookOpen,
  ExternalLink, Play, Sparkles, X, ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AISearchBar } from "@/components/AISearchBar";
import { UnifiedSearchResults } from "@/components/UnifiedSearchResults";
import { SearchHistorySidebar } from "@/components/SearchHistorySidebar";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { JarvisChat } from "@/components/jarvis/JarvisChat";
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
    if (subTab === "videos") searchVideos(q);
    else if (subTab === "books") searchBooks(q);
    else if (subTab === "courses") {
      window.open(`https://www.classcentral.com/search?q=${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer");
    }
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

  const isLoading = videoLoading || bookLoading;

  /* ── Render ── */
  return (
    <div className="space-y-0">
      {/* ── Premium search bar ── */}
      <div className="sticky top-10 md:top-12 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 px-3 sm:px-4 py-2.5">
        <div className="max-w-3xl mx-auto">
          {subTab === "knowledge" ? (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <AISearchBar
                  key={`knowledge-${currentQuery || 'active'}`}
                  autoFocus
                  initialQuery={currentQuery || undefined}
                  cards={cards}
                  onSearchResults={(results) => onSearchResults(results)}
                  onQueryChange={onQueryChange}
                />
              </div>
              <SearchHistorySidebar
                history={history}
                onRerun={handleRerunSearch}
                onCombine={handleCombineSearches}
                onClear={clearHistory}
                onRemove={removeItem}
              />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
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
                  className="pl-9 h-10 bg-muted/30 border-border/50 focus-visible:ring-primary/30 rounded-xl"
                  autoFocus
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => handleQueryChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                size="sm"
                className="h-10 px-4 rounded-xl gap-1.5 font-medium"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : subTab === "courses" ? (
                  <><ExternalLink className="h-3.5 w-3.5" />Search</>
                ) : (
                  <><Search className="h-3.5 w-3.5" />Search</>
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
          )}
        </div>
      </div>

      {/* ── Sub-tab strip ── */}
      <div className="px-3 sm:px-4 pt-3">
        <Tabs value={subTab} onValueChange={setSubTab} className="w-full">
          <TabsList className="w-full grid grid-cols-5 max-w-xl h-10 p-1 bg-muted/40 backdrop-blur-sm rounded-xl border border-border/30">
            <TabsTrigger value="knowledge" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground transition-all">
              <Brain className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Knowledge</span>
            </TabsTrigger>
            <TabsTrigger value="alice" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground transition-all">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">ALICE</span>
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground transition-all">
              <GraduationCap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Courses</span>
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground transition-all">
              <Video className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Videos</span>
            </TabsTrigger>
            <TabsTrigger value="books" className="gap-1.5 text-xs sm:text-sm rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground transition-all">
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Books</span>
            </TabsTrigger>
          </TabsList>

          {/* ── ALICE ── */}
          <TabsContent value="alice" className="mt-4">
            <div className="px-1 sm:px-2">
              <div className="border border-border rounded-xl overflow-hidden h-[calc(100vh-260px)] min-h-[480px] bg-card">
                <JarvisChat />
              </div>
            </div>
          </TabsContent>

          {/* ── Knowledge ── */}
          <TabsContent value="knowledge" className="mt-4">
            <div className="px-1 sm:px-2">
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
                <EmptyState
                  icon={<Brain className="h-10 w-10" />}
                  title="Search your second brain"
                  description="Ask questions, search your notes, or explore the web — all from one place."
                />
              )}
            </div>
          </TabsContent>

          {/* ── Courses ── */}
          <TabsContent value="courses" className="mt-4">
            <div className="px-1 sm:px-2 space-y-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ExternalLink className="h-3 w-3" />
                Results open on Class Central in a new tab
              </div>
              <TopicChips topics={POPULAR_TOPICS} onSelect={chipAction} label="Popular topics" />
            </div>
          </TabsContent>

          {/* ── Videos ── */}
          <TabsContent value="videos" className="mt-4">
            <div className="px-1 sm:px-2 space-y-5">
              {!videoSearched && (
                <>
                  <TopicChips topics={POPULAR_TOPICS} onSelect={chipAction} label="Popular topics" />
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Video className="h-3 w-3" />
                    Searches YouTube, Odysee, Khan Academy, TED & more
                  </div>
                </>
              )}

              {videoLoading && <LoadingState label="Searching videos…" />}

              {!videoLoading && videoSearched && videoResults.length === 0 && (
                <EmptyState
                  icon={<Video className="h-10 w-10" />}
                  title="No videos found"
                  description="Try a different search term"
                  action={
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg"
                      onClick={() =>
                        window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer")
                      }
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Search YouTube
                    </Button>
                  }
                />
              )}

              {videoResults.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {videoResults.map((video, i) => (
                    <Card key={i} className="overflow-hidden border-border/40 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group bg-card/50 backdrop-blur-sm rounded-xl">
                      <div className="relative">
                        <AspectRatio ratio={16 / 9}>
                          {video.thumbnail ? (
                            <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover bg-muted" loading="lazy" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Video className="h-8 w-8 text-muted-foreground/30" />
                            </div>
                          )}
                        </AspectRatio>
                        <Badge className={`absolute top-2.5 left-2.5 text-[10px] shadow-md ${VIDEO_PROVIDER_COLOR[video.provider] || VIDEO_PROVIDER_COLOR.Web}`}>
                          {video.provider}
                        </Badge>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px]">
                          <div className="rounded-full bg-background/90 p-2.5 shadow-lg">
                            <Play className="h-5 w-5 text-foreground fill-foreground" />
                          </div>
                        </div>
                      </div>
                      <CardContent className="p-3.5 space-y-1.5">
                        <h3 className="text-sm font-medium leading-snug line-clamp-2 text-foreground">{video.title}</h3>
                        <p className="text-[11px] text-muted-foreground font-medium">{video.channel}</p>
                        {video.description && <p className="text-xs text-muted-foreground/80 line-clamp-2 leading-relaxed">{video.description}</p>}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full text-xs h-8 mt-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
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
          <TabsContent value="books" className="mt-4">
            <div className="px-1 sm:px-2 space-y-5">
              {!bookSearched && <TopicChips topics={POPULAR_BOOKS} onSelect={chipAction} label="Try searching for" />}

              {bookLoading && <LoadingState label="Searching books…" />}

              {!bookLoading && bookSearched && bookResults.length === 0 && (
                <EmptyState
                  icon={<BookOpen className="h-10 w-10" />}
                  title="No books found"
                  description="Try a different search term"
                />
              )}

              {bookResults.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {bookResults.map((book) => (
                    <Card key={book.key} className="overflow-hidden border-border/40 hover:border-primary/30 hover:shadow-lg transition-all duration-300 bg-card/50 backdrop-blur-sm rounded-xl">
                      <CardContent className="p-3.5 flex gap-3.5">
                        {book.coverId ? (
                          <img
                            src={`https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`}
                            alt={book.title}
                            className="w-16 h-24 object-cover rounded-lg bg-muted shrink-0 shadow-sm"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-16 h-24 bg-muted rounded-lg flex items-center justify-center shrink-0">
                            <BookOpen className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <h3 className="text-sm font-medium leading-snug line-clamp-2 text-foreground">{book.title}</h3>
                          <p className="text-[11px] text-muted-foreground">{book.author}{book.year ? ` · ${book.year}` : ""}</p>
                          {book.subjects && book.subjects.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {book.subjects.slice(0, 3).map((s) => (
                                <Badge key={s} variant="secondary" className="text-[9px] rounded-md bg-muted/60">{s}</Badge>
                              ))}
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs h-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors px-2"
                            onClick={() => window.open(`https://openlibrary.org${book.key}`, "_blank", "noopener,noreferrer")}
                          >
                            <ExternalLink className="h-3 w-3 mr-1.5" />Open Library
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

/* ── Shared sub-components ── */

function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="rounded-2xl bg-muted/40 p-5 mb-5 text-muted-foreground/50">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        <Loader2 className="h-7 w-7 animate-spin text-primary relative" />
      </div>
      <p className="text-sm text-muted-foreground mt-4 font-medium">{label}</p>
    </div>
  );
}

function TopicChips({ topics, onSelect, label }: {
  topics: string[];
  onSelect: (t: string) => void;
  label: string;
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <button
            key={topic}
            onClick={() => onSelect(topic)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-full border border-border/50 bg-muted/30 text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all duration-200"
          >
            {topic}
            <ArrowRight className="h-3 w-3 opacity-0 -ml-1 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
}
