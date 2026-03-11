import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Search, Loader2, BookOpen, BookmarkPlus, BookmarkCheck, Star, X, ArrowLeft, ChevronRight, Maximize, Minimize, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BookResult {
  key: string;
  title: string;
  author: string;
  year?: number;
  coverId?: number;
  subjects?: string[];
  editionCount?: number;
  iaId?: string; // Internet Archive identifier
  languages?: string[];
  ebookAccess?: string;
}

const LANG_NAMES: Record<string, string> = {
  eng: "English", spa: "Spanish", fre: "French", ger: "German",
  por: "Portuguese", ita: "Italian", chi: "Chinese", jpn: "Japanese",
  kor: "Korean", rus: "Russian", ara: "Arabic", hin: "Hindi",
  dut: "Dutch", swe: "Swedish", pol: "Polish", tur: "Turkish",
};

interface SavedBook {
  id: string;
  book_key: string;
  title: string;
  author: string | null;
  cover_id: number | null;
  year: number | null;
  subjects: string[];
  status: string;
  notes: string | null;
  rating: number | null;
}

interface BookDetailData {
  description?: string | { value: string };
  subjects?: string[];
  covers?: number[];
  links?: { title: string; url: string }[];
}

const POPULAR_SEARCHES = [
  "Atomic Habits", "Sapiens", "Deep Work",
  "Thinking Fast and Slow", "The Art of War",
  "Meditations", "1984", "Dune",
];

// Detect language from query text to filter Open Library results
function detectLanguage(text: string): string {
  // Check for CJK characters (Chinese/Japanese/Korean)
  if (/[\u4e00-\u9fff]/.test(text)) return "chi";
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return "jpn";
  if (/[\uac00-\ud7af]/.test(text)) return "kor";
  // Check for Cyrillic (Russian)
  if (/[\u0400-\u04ff]/.test(text)) return "rus";
  // Check for Arabic script
  if (/[\u0600-\u06ff]/.test(text)) return "ara";
  // Check for Devanagari (Hindi)
  if (/[\u0900-\u097f]/.test(text)) return "hin";
  // Check for common Spanish patterns
  if (/[áéíóúñ¿¡]/i.test(text)) return "spa";
  // Check for common French patterns
  if (/[àâæçéèêëïîôœùûüÿ]/i.test(text)) return "fre";
  // Check for German patterns
  if (/[äöüß]/i.test(text)) return "ger";
  // Check for Portuguese patterns
  if (/[ãõç]/i.test(text) && /[àáâ]/i.test(text)) return "por";
  // Default to English
  return "eng";
}

export function LearningBooks() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [view, setView] = useState<"search" | "library">("search");
  const [savedBooks, setSavedBooks] = useState<SavedBook[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [selectedBook, setSelectedBook] = useState<BookResult | null>(null);
  const [bookDetails, setBookDetails] = useState<BookDetailData | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const [readerBook, setReaderBook] = useState<{ title: string; iaId: string } | null>(null);
  const [lastSearchLang, setLastSearchLang] = useState("eng");
  const [readerFullscreen, setReaderFullscreen] = useState(false);
  const [accessFilter, setAccessFilter] = useState<"all" | "readable" | "fulltext">("all");
  const [langFilter, setLangFilter] = useState<string>("eng");
  const readerContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      readerContainerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handler = () => setReaderFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    if (user) loadSavedBooks();
  }, [user]);

  // Load popular books on mount
  useEffect(() => {
    searchBooks("");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSavedBooks = async () => {
    if (!user) return;
    setLoadingSaved(true);
    const { data, error } = await supabase
      .from("reading_list")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setSavedBooks(data.map((b: any) => ({
        ...b,
        subjects: Array.isArray(b.subjects) ? b.subjects : [],
      })));
      setSavedKeys(new Set(data.map((b: any) => b.book_key)));
    }
    setLoadingSaved(false);
  };

  const searchBooks = useCallback(async (searchQuery: string, overrideLang?: string, overrideAccess?: string) => {
    setLoading(true);
    setSearched(true);
    const currentLang = overrideLang ?? langFilter;
    const currentAccess = overrideAccess ?? accessFilter;
    try {
      const langParam = `language:${currentLang}`;
      const isEmptyQuery = !searchQuery.trim();
      const searchParam = isEmptyQuery ? `subject:popular ${langParam}` : `${searchQuery} ${langParam}`;
      const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(searchParam)}&limit=48&fields=key,title,author_name,first_publish_year,cover_i,subject,edition_count,ia,language,ebook_access${isEmptyQuery ? "&sort=rating" : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to search Open Library");
      const data = await res.json();
      const allDocs: (BookResult & { _languages: string[] })[] = (data.docs || []).map((doc: any) => ({
        key: doc.key,
        title: doc.title,
        author: doc.author_name?.[0] || "Unknown author",
        year: doc.first_publish_year,
        coverId: doc.cover_i,
        subjects: doc.subject?.slice(0, 5),
        editionCount: doc.edition_count,
        iaId: doc.ia?.[0] || null,
        languages: doc.language || [],
        _languages: doc.language || [],
        ebookAccess: doc.ebook_access || "no_ebook",
      }));

      // Strict client-side language filter
      const langResult = allDocs.filter((b: any) =>
        Array.isArray(b._languages) && b._languages.includes(currentLang)
      );

      // Apply ebook access filter
      const accessFiltered = langResult.filter((b) => {
        if (currentAccess === "fulltext") return b.ebookAccess === "public";
        if (currentAccess === "readable") return b.ebookAccess === "public" || b.ebookAccess === "borrowable";
        return true;
      });

      const parsed = accessFiltered.slice(0, 12);

      setResults(parsed);
      if (parsed.length === 0) toast.info("No books found for these filters");
    } catch (err: any) {
      console.error(err);
      toast.error("Search failed", { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [langFilter, accessFilter]);

  const openBookDetail = async (book: BookResult) => {
    setSelectedBook(book);
    setBookDetails(null);
    setLoadingDetails(true);
    try {
      const res = await fetch(`https://openlibrary.org${book.key}.json`);
      if (res.ok) {
        const data = await res.json();
        setBookDetails(data);
      }
    } catch (e) {
      console.error("Failed to load details:", e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const openReader = (book: BookResult | SavedBook) => {
    // Try to find an Internet Archive identifier
    const iaId = 'iaId' in book && book.iaId ? book.iaId : null;
    const title = book.title;

    if (iaId) {
      setReaderBook({ title, iaId });
    } else {
      // Search Archive.org for the book and open in embedded reader
      const searchTerm = `${title} ${'author' in book && book.author ? book.author : ''}`.trim();
      setReaderBook({ title, iaId: `search:${searchTerm}` });
    }
  };

  const saveBook = async (book: BookResult) => {
    if (!user) { toast.error("Sign in to save books"); return; }
    const { error } = await supabase.from("reading_list").insert({
      user_id: user.id,
      book_key: book.key,
      title: book.title,
      author: book.author,
      cover_id: book.coverId || null,
      year: book.year || null,
      subjects: book.subjects || [],
      status: "want_to_read",
    });
    if (error) { toast.error("Failed to save"); return; }
    toast.success("Added to reading list!");
    setSavedKeys(prev => new Set(prev).add(book.key));
    loadSavedBooks();
  };

  const updateBookStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("reading_list")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      setSavedBooks(prev => prev.map(b => b.id === id ? { ...b, status } : b));
      toast.success("Status updated");
    }
  };

  const updateBookRating = async (id: string, rating: number) => {
    await supabase.from("reading_list").update({ rating }).eq("id", id);
    setSavedBooks(prev => prev.map(b => b.id === id ? { ...b, rating } : b));
  };

  const saveNotes = async (id: string) => {
    await supabase.from("reading_list").update({ notes: notesText }).eq("id", id);
    setSavedBooks(prev => prev.map(b => b.id === id ? { ...b, notes: notesText } : b));
    setEditingNotes(null);
    toast.success("Notes saved");
  };

  const removeBook = async (id: string, bookKey: string) => {
    await supabase.from("reading_list").delete().eq("id", id);
    setSavedBooks(prev => prev.filter(b => b.id !== id));
    setSavedKeys(prev => { const n = new Set(prev); n.delete(bookKey); return n; });
    toast.success("Removed from reading list");
  };

  const statusLabel: Record<string, string> = {
    want_to_read: "Want to Read",
    reading: "Reading",
    finished: "Finished",
  };

  const getDescriptionText = (desc: any): string => {
    if (!desc) return "";
    if (typeof desc === "string") return desc;
    if (desc.value) return desc.value;
    return "";
  };

  // Full-screen embedded reader
  if (readerBook) {
    const isSearch = readerBook.iaId.startsWith("search:");
    const iframeSrc = isSearch
      ? `https://openlibrary.org/search?q=${encodeURIComponent(readerBook.iaId.slice(7))}&mode=ebooks&has_fulltext=true&language=${lastSearchLang}`
      : `https://archive.org/embed/${readerBook.iaId}`;

    return (
      <div ref={readerContainerRef} className="flex flex-col h-[calc(100vh-12rem)] bg-background">
        <div className="flex items-center gap-3 pb-3 border-b border-border mb-3 px-1">
          <Button size="sm" variant="ghost" onClick={() => { if (document.fullscreenElement) document.exitFullscreen(); setReaderBook(null); }}>
            <ArrowLeft className="h-4 w-4 mr-1.5" />Back
          </Button>
          <h2 className="text-sm font-medium truncate flex-1">{readerBook.title}</h2>
          <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={toggleFullscreen}>
            {readerFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex-1 rounded-lg overflow-hidden border border-border bg-muted">
          <iframe
            src={iframeSrc}
            className="w-full h-full border-0"
            allow="fullscreen"
            title={`Reading: ${readerBook.title}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex gap-2">
        <Button size="sm" variant={view === "search" ? "default" : "outline"} onClick={() => setView("search")}>
          <Search className="h-3.5 w-3.5 mr-1.5" />Discover
        </Button>
        <Button size="sm" variant={view === "library" ? "default" : "outline"} onClick={() => { setView("library"); loadSavedBooks(); }}>
          <BookmarkCheck className="h-3.5 w-3.5 mr-1.5" />
          My Library {savedBooks.length > 0 && `(${savedBooks.length})`}
        </Button>
      </div>

      {view === "search" && (
        <>
          <form onSubmit={(e) => { e.preventDefault(); searchBooks(query); }} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search millions of books…" className="pl-9" />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </form>

          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex gap-1.5 flex-wrap">
              {([
                ["all", "All"],
                ["readable", "Full Text + Borrow"],
                ["fulltext", "Full Text Only"],
              ] as const).map(([value, label]) => (
                <Badge key={value} variant={accessFilter === value ? "default" : "outline"}
                  className="cursor-pointer text-[11px] transition-colors hover:bg-accent"
                  onClick={() => { setAccessFilter(value); searchBooks(query, undefined, value); }}>
                  {label}
                </Badge>
              ))}
            </div>
            <Select value={langFilter} onValueChange={(v) => { setLangFilter(v); searchBooks(query, v); }}>
              <SelectTrigger className="w-[130px] h-7 text-[11px]">
                <Globe className="h-3 w-3 mr-1 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LANG_NAMES).map(([code, name]) => (
                  <SelectItem key={code} value={code} className="text-xs">{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!searched && !loading && results.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground font-medium">Try searching for</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((term) => (
                  <Badge key={term} variant="outline" className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => { setQuery(term); searchBooks(term); }}>
                    {term}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {results.map((book) => (
                <Card key={book.key} className="hover:border-primary/30 transition-colors cursor-pointer h-full"
                  onClick={() => openBookDetail(book)}>
                  <CardContent className="pt-4 flex gap-3">
                    {book.coverId ? (
                      <img src={`https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`}
                        alt={book.title} className="w-16 h-24 object-cover rounded-sm shrink-0 bg-muted" loading="lazy" />
                    ) : (
                      <div className="w-16 h-24 bg-muted rounded-sm shrink-0 flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium leading-snug line-clamp-2">{book.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{book.author}</p>
                      {book.year && <p className="text-[10px] text-muted-foreground mt-0.5">First published {book.year}</p>}
                      {book.languages && book.languages.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {[...new Set(book.languages)].slice(0, 3).map((lang) => (
                            <Badge key={lang} variant="outline" className="text-[9px] px-1.5 py-0">
                              {LANG_NAMES[lang] || lang}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <Badge variant={book.ebookAccess === "public" ? "default" : "outline"}
                        className={`text-[9px] px-1.5 py-0 mt-1 ${book.ebookAccess === "public" ? "bg-green-600 hover:bg-green-600" : book.ebookAccess === "borrowable" ? "border-yellow-500 text-yellow-600" : "border-muted-foreground/40 text-muted-foreground"}`}>
                        {book.ebookAccess === "public" ? "Full Text" : book.ebookAccess === "borrowable" ? "Borrow" : "Preview"}
                      </Badge>
                      <div className="flex items-center gap-1 mt-1.5">
                        {savedKeys.has(book.key) ? (
                          <Badge variant="secondary" className="text-[9px]"><BookmarkCheck className="h-3 w-3 mr-0.5" />Saved</Badge>
                        ) : (
                          <Button size="sm" variant="ghost" className="text-[10px] h-5 px-1.5"
                            onClick={(e) => { e.stopPropagation(); saveBook(book); }}>
                            <BookmarkPlus className="h-3 w-3 mr-0.5" />Save
                          </Button>
                        )}
                        {book.iaId && (
                          <Button size="sm" variant="ghost" className="text-[10px] h-5 px-1.5 text-primary"
                            onClick={(e) => { e.stopPropagation(); openReader(book); }}>
                            <BookOpen className="h-3 w-3 mr-0.5" />Read
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {searched && !loading && results.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No books found. Try different keywords.</p>
            </div>
          )}
        </>
      )}

      {view === "library" && (
        <>
          {loadingSaved ? (
            <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
          ) : savedBooks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Your library is empty. Search and save books to start your reading list.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {["reading", "want_to_read", "finished"].map(status => {
                const filtered = savedBooks.filter(b => b.status === status);
                if (filtered.length === 0) return null;
                return (
                  <div key={status}>
                    <h3 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      {statusLabel[status]}
                      <Badge variant="secondary" className="text-[10px]">{filtered.length}</Badge>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filtered.map((book) => (
                        <Card key={book.id} className="border-border/50">
                          <CardContent className="pt-4 space-y-2">
                            <div className="flex gap-3">
                              {book.cover_id ? (
                                <img src={`https://covers.openlibrary.org/b/id/${book.cover_id}-M.jpg`}
                                  alt={book.title} className="w-12 h-18 object-cover rounded-sm shrink-0 bg-muted" />
                              ) : (
                                <div className="w-12 h-18 bg-muted rounded-sm shrink-0 flex items-center justify-center">
                                  <BookOpen className="h-4 w-4 text-muted-foreground/40" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-medium line-clamp-2">{book.title}</h4>
                                <p className="text-xs text-muted-foreground">{book.author}</p>
                                <div className="flex gap-0.5 mt-1">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s}
                                      className={`h-3 w-3 cursor-pointer ${book.rating && s <= book.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`}
                                      onClick={() => updateBookRating(book.id, s)} />
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              <select className="text-xs bg-muted rounded px-2 py-1 border border-border"
                                value={book.status}
                                onChange={(e) => updateBookStatus(book.id, e.target.value)}>
                                <option value="want_to_read">Want to Read</option>
                                <option value="reading">Reading</option>
                                <option value="finished">Finished</option>
                              </select>
                              <Button size="sm" variant="outline" className="text-xs h-6 px-2"
                                onClick={() => openReader(book)}>
                                <BookOpen className="h-3 w-3 mr-1" />Read
                              </Button>
                              <Button size="sm" variant="ghost" className="text-xs h-6 px-2 text-destructive"
                                onClick={() => removeBook(book.id, book.book_key)}>Remove</Button>
                            </div>

                            {editingNotes === book.id ? (
                              <div className="space-y-1.5">
                                <Textarea className="text-xs min-h-[60px]" value={notesText}
                                  onChange={(e) => setNotesText(e.target.value)} placeholder="Add your notes about this book…" />
                                <div className="flex gap-1.5">
                                  <Button size="sm" className="text-xs h-6" onClick={() => saveNotes(book.id)}>Save</Button>
                                  <Button size="sm" variant="ghost" className="text-xs h-6" onClick={() => setEditingNotes(null)}>Cancel</Button>
                                </div>
                              </div>
                            ) : (
                              <button className="text-[11px] text-primary hover:underline"
                                onClick={() => { setEditingNotes(book.id); setNotesText(book.notes || ""); }}>
                                {book.notes ? "Edit notes" : "Add notes"}
                              </button>
                            )}
                            {book.notes && editingNotes !== book.id && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2 bg-muted/50 rounded p-1.5">{book.notes}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Book Detail Sheet */}
      <Sheet open={!!selectedBook} onOpenChange={(open) => !open && setSelectedBook(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          {selectedBook && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left flex items-center gap-2 flex-wrap">
                  {selectedBook.title}
                  <Badge variant={selectedBook.ebookAccess === "public" ? "default" : "outline"}
                    className={`text-[10px] ${selectedBook.ebookAccess === "public" ? "bg-green-600 hover:bg-green-600" : selectedBook.ebookAccess === "borrowable" ? "border-yellow-500 text-yellow-600" : "border-muted-foreground/40 text-muted-foreground"}`}>
                    {selectedBook.ebookAccess === "public" ? "Full Text" : selectedBook.ebookAccess === "borrowable" ? "Borrow" : "Preview"}
                  </Badge>
                </SheetTitle>
                <SheetDescription className="text-left">{selectedBook.author}{selectedBook.year ? ` · ${selectedBook.year}` : ""}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                <div className="flex gap-4">
                  {selectedBook.coverId ? (
                    <img src={`https://covers.openlibrary.org/b/id/${selectedBook.coverId}-L.jpg`}
                      alt={selectedBook.title} className="w-28 h-auto rounded shadow-md" />
                  ) : (
                    <div className="w-28 h-40 bg-muted rounded flex items-center justify-center">
                      <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="space-y-2">
                    {selectedBook.editionCount && (
                      <p className="text-xs text-muted-foreground">{selectedBook.editionCount} editions</p>
                    )}
                    {!savedKeys.has(selectedBook.key) ? (
                      <Button size="sm" onClick={() => saveBook(selectedBook)}>
                        <BookmarkPlus className="h-3.5 w-3.5 mr-1.5" />Add to Library
                      </Button>
                    ) : (
                      <Badge><BookmarkCheck className="h-3 w-3 mr-1" />In Library</Badge>
                    )}
                    <Button size="sm" variant="outline" onClick={() => { setSelectedBook(null); openReader(selectedBook); }}>
                      <BookOpen className="h-3.5 w-3.5 mr-1.5" />Read in PendragonX
                    </Button>
                  </div>
                </div>

                {loadingDetails ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : bookDetails && (
                  <>
                    {getDescriptionText(bookDetails.description) && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Description</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {getDescriptionText(bookDetails.description)}
                        </p>
                      </div>
                    )}
                    {bookDetails.subjects && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Subjects</h4>
                        <div className="flex flex-wrap gap-1">
                          {(bookDetails.subjects as string[]).slice(0, 15).map((s: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {selectedBook.subjects && selectedBook.subjects.length > 0 && !bookDetails?.subjects && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Subjects</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedBook.subjects.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
