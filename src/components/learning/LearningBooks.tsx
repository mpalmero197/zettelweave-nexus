import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Search, Loader2, BookOpen, BookmarkPlus, BookmarkCheck, Star, X, ArrowLeft, ChevronRight, Maximize, Minimize, Globe, ExternalLink, Library } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface BookResult {
  key: string;
  title: string;
  displayTitle: string;
  author: string;
  year?: number;
  coverId?: number;
  coverUrl?: string;
  subjects?: string[];
  editionCount?: number;
  iaId?: string;
  languages?: string[];
  ebookAccess?: string;
  originalLang?: string;
  source: "openlibrary" | "gutenberg" | "google";
  readUrl?: string;
}

interface EditionEntry {
  key: string;
  title: string;
  publishers?: string[];
  publish_date?: string;
  languages?: { key: string }[];
  ocaid?: string;
  covers?: number[];
  number_of_pages?: number;
  physical_format?: string;
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

const FREE_EBOOK_RESOURCES = [
  { name: "Project Gutenberg", url: "https://www.gutenberg.org", description: "Over 70,000 free public domain ebooks.", icon: "📚" },
  { name: "Internet Archive", url: "https://archive.org/details/texts", description: "Millions of free texts including books and historical documents.", icon: "🏛️" },
  { name: "Open Library", url: "https://openlibrary.org", description: "Universal catalog with millions of free full-text books.", icon: "📖" },
  { name: "Standard Ebooks", url: "https://standardebooks.org", description: "Beautifully formatted public domain ebooks.", icon: "✨" },
  { name: "ManyBooks", url: "https://manybooks.net", description: "50,000+ free ebooks in multiple formats.", icon: "📕" },
  { name: "Feedbooks", url: "https://www.feedbooks.com/publicdomain", description: "Public domain books in EPUB and PDF.", icon: "📄" },
  { name: "Google Books", url: "https://books.google.com/books?q=subject:fiction&filter=free-ebooks", description: "Free full-view books from Google.", icon: "🔍" },
  { name: "Smashwords", url: "https://www.smashwords.com/books/category/1/newest/0/free/any", description: "Free indie ebooks across all genres.", icon: "✍️" },
  { name: "LibriVox", url: "https://librivox.org", description: "Free public domain audiobooks.", icon: "🎧" },
  { name: "BookBub", url: "https://www.bookbub.com/ebook-deals/free-ebooks", description: "Curated free ebook deals.", icon: "💎" },
  { name: "DPLA", url: "https://dp.la", description: "Digital items from libraries and museums.", icon: "🏛️" },
  { name: "Baen Free Library", url: "https://www.baen.com/catalog/category/view/id/2012", description: "Free sci-fi and fantasy ebooks.", icon: "🚀" },
  { name: "HathiTrust", url: "https://www.hathitrust.org", description: "Academic library partnership with public domain works.", icon: "🎓" },
  { name: "Library of Congress", url: "https://www.loc.gov/books", description: "Digital collections from the world's largest library.", icon: "🏛️" },
  { name: "Loyal Books", url: "https://www.loyalbooks.com", description: "Free audiobooks and ebooks in multiple languages.", icon: "🌍" },
  { name: "ICDL", url: "http://en.childrenslibrary.org", description: "Free children's books in dozens of languages.", icon: "👶" },
  { name: "Open Culture", url: "https://www.openculture.com/free_ebooks", description: "800+ curated free ebooks.", icon: "🎭" },
  { name: "Obooko", url: "https://www.obooko.com", description: "Free full-length ebooks across categories.", icon: "📘" },
  { name: "Authorama", url: "https://www.authorama.com", description: "Public domain books with clean formatting.", icon: "📃" },
  { name: "Bartleby", url: "https://www.bartleby.com", description: "Classic literature and reference works.", icon: "📜" },
  { name: "Online Books Page", url: "https://onlinebooks.library.upenn.edu", description: "3 million+ free books directory.", icon: "🗂️" },
  { name: "Planet eBook", url: "https://www.planetebook.com", description: "Free classic novels in PDF.", icon: "🌍" },
  { name: "Libby", url: "https://www.overdrive.com", description: "Free ebooks via your library card.", icon: "📱" },
  { name: "Hoopla", url: "https://www.hoopladigital.com", description: "Free digital content via public library.", icon: "📱" },
];

function detectLanguage(text: string): string {
  if (/[\u4e00-\u9fff]/.test(text)) return "chi";
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return "jpn";
  if (/[\uac00-\ud7af]/.test(text)) return "kor";
  if (/[\u0400-\u04ff]/.test(text)) return "rus";
  if (/[\u0600-\u06ff]/.test(text)) return "ara";
  if (/[\u0900-\u097f]/.test(text)) return "hin";
  if (/[áéíóúñ¿¡]/i.test(text)) return "spa";
  if (/[àâæçéèêëïîôœùûüÿ]/i.test(text)) return "fre";
  if (/[äöüß]/i.test(text)) return "ger";
  if (/[ãõç]/i.test(text) && /[àáâ]/i.test(text)) return "por";
  return "eng";
}

export function LearningBooks() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [view, setView] = useState<"search" | "library" | "resources">("search");
  const [savedBooks, setSavedBooks] = useState<SavedBook[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [selectedBook, setSelectedBook] = useState<BookResult | null>(null);
  const [bookDetails, setBookDetails] = useState<BookDetailData | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesText, setNotesText] = useState("");
  const [readerBook, setReaderBook] = useState<{ title: string; iaId: string; lang?: string } | null>(null);
  const [lastSearchLang, setLastSearchLang] = useState("eng");
  const [readerFullscreen, setReaderFullscreen] = useState(false);
  const [editionPickerBook, setEditionPickerBook] = useState<BookResult | SavedBook | null>(null);
  const [editions, setEditions] = useState<EditionEntry[]>([]);
  const [loadingEditions, setLoadingEditions] = useState(false);
  const [accessFilter, setAccessFilter] = useState<"all" | "readable" | "fulltext">("all");
  const [langFilter, setLangFilter] = useState<string>("eng");
  const [visibleCount, setVisibleCount] = useState(40);
  const readerContainerRef = useRef<HTMLDivElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const toolbarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Escape key to exit reader
  useEffect(() => {
    if (!readerBook) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (document.fullscreenElement) document.exitFullscreen();
        else setReaderBook(null);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [readerBook]);

  // Auto-hide toolbar after 3s
  useEffect(() => {
    if (!readerBook) return;
    const resetTimer = () => {
      setToolbarVisible(true);
      if (toolbarTimer.current) clearTimeout(toolbarTimer.current);
      toolbarTimer.current = setTimeout(() => setToolbarVisible(false), 3000);
    };
    resetTimer();
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("touchstart", resetTimer);
    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
      if (toolbarTimer.current) clearTimeout(toolbarTimer.current);
    };
  }, [readerBook]);

  useEffect(() => {
    if (user) loadSavedBooks();
  }, [user]);

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

  const fetchOpenLibrary = async (searchParam: string, isEmptyQuery: boolean, currentLang: string): Promise<(BookResult & { _languages: string[] })[]> => {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(searchParam)}&limit=80&fields=key,title,author_name,first_publish_year,cover_i,subject,edition_count,ia,language,ebook_access${isEmptyQuery ? "&sort=rating" : ""}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.docs || []).map((doc: any) => {
      const langs: string[] = doc.language || [];
      const primaryLang = langs.length > 0 ? langs[0] : null;
      const isOriginallyForeign = primaryLang && primaryLang !== currentLang;
      const origLangName = isOriginallyForeign && LANG_NAMES[primaryLang] ? LANG_NAMES[primaryLang] : (isOriginallyForeign ? primaryLang : null);
      const displayTitle = origLangName ? `${doc.title} (${origLangName})` : doc.title;
      return {
        key: doc.key, title: doc.title, displayTitle, author: doc.author_name?.[0] || "Unknown author",
        year: doc.first_publish_year, coverId: doc.cover_i, subjects: doc.subject?.slice(0, 5),
        editionCount: doc.edition_count, iaId: doc.ia?.[0] || null, languages: langs, _languages: langs,
        ebookAccess: doc.ebook_access || "no_ebook", originalLang: isOriginallyForeign ? primaryLang : undefined,
        source: "openlibrary" as const,
      };
    });
  };

  const fetchGutenberg = async (query: string, currentLang: string): Promise<(BookResult & { _languages: string[] })[]> => {
    const langMap: Record<string, string> = { eng: "en", spa: "es", fre: "fr", ger: "de", por: "pt", ita: "it", chi: "zh", jpn: "ja", kor: "ko", rus: "ru", ara: "ar", hin: "hi", dut: "nl", swe: "sv", pol: "pl", tur: "tr" };
    const gutLang = langMap[currentLang] || "en";
    const url = `https://gutendex.com/books/?search=${encodeURIComponent(query)}&languages=${gutLang}&mime_type=text`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((book: any) => ({
      key: `gutenberg:${book.id}`, title: book.title, displayTitle: book.title,
      author: book.authors?.[0]?.name || "Unknown author", year: book.authors?.[0]?.birth_year || undefined,
      coverUrl: book.formats?.["image/jpeg"] || null, subjects: book.subjects?.slice(0, 5),
      ebookAccess: "public", languages: [currentLang], _languages: [currentLang],
      source: "gutenberg" as const, readUrl: `https://www.gutenberg.org/ebooks/${book.id}`,
    }));
  };

  const fetchGoogleBooks = async (query: string, currentLang: string): Promise<(BookResult & { _languages: string[] })[]> => {
    const langMap: Record<string, string> = { eng: "en", spa: "es", fre: "fr", ger: "de", por: "pt", ita: "it", chi: "zh-CN", jpn: "ja", kor: "ko", rus: "ru", ara: "ar", hin: "hi", dut: "nl", swe: "sv", pol: "pl", tur: "tr" };
    const gLang = langMap[currentLang] || "en";
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&filter=free-ebooks&langRestrict=${gLang}&maxResults=30&fields=items(id,volumeInfo)`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((item: any) => {
      const v = item.volumeInfo;
      return {
        key: `google:${item.id}`, title: v.title || "Untitled", displayTitle: v.title || "Untitled",
        author: v.authors?.[0] || "Unknown author", year: v.publishedDate ? parseInt(v.publishedDate) : undefined,
        coverUrl: v.imageLinks?.thumbnail?.replace("http:", "https:") || null, subjects: v.categories?.slice(0, 5),
        ebookAccess: "public", languages: [currentLang], _languages: [currentLang],
        source: "google" as const, readUrl: v.previewLink || `https://books.google.com/books?id=${item.id}`,
      };
    });
  };

  const searchBooks = useCallback(async (searchQuery: string, overrideLang?: string, overrideAccess?: string) => {
    setLoading(true);
    setSearched(true);
    const currentLang = overrideLang ?? langFilter;
    const currentAccess = overrideAccess ?? accessFilter;
    try {
      const isEmptyQuery = !searchQuery.trim();
      const searchParam = isEmptyQuery ? "subject:popular" : searchQuery;
      const [olResults, gutenbergResults, googleResults] = await Promise.allSettled([
        fetchOpenLibrary(searchParam, isEmptyQuery, currentLang),
        isEmptyQuery ? Promise.resolve([]) : fetchGutenberg(searchQuery, currentLang),
        isEmptyQuery ? Promise.resolve([]) : fetchGoogleBooks(searchQuery, currentLang),
      ]);
      const allBooks: (BookResult & { _languages: string[] })[] = [];
      const seenTitles = new Set<string>();
      const addBooks = (books: (BookResult & { _languages: string[] })[]) => {
        for (const b of books) {
          const normKey = `${b.title.toLowerCase().replace(/[^a-z0-9]/g, "")}::${b.author.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
          if (!seenTitles.has(normKey)) { seenTitles.add(normKey); allBooks.push(b); }
        }
      };
      if (olResults.status === "fulfilled") addBooks(olResults.value);
      if (gutenbergResults.status === "fulfilled") addBooks(gutenbergResults.value);
      if (googleResults.status === "fulfilled") addBooks(googleResults.value);
      const langResult = allBooks.filter((b) => {
        if (!Array.isArray(b._languages) || b._languages.length === 0) return true;
        return b._languages.includes(currentLang);
      });
      const accessFiltered = langResult.filter((b) => {
        if (b.source !== "openlibrary") return true;
        if (currentAccess === "fulltext") return b.ebookAccess === "public";
        if (currentAccess === "readable") return b.ebookAccess === "public" || b.ebookAccess === "borrowable";
        return true;
      });
      setResults(accessFiltered);
      setVisibleCount(40);
      if (accessFiltered.length === 0) toast.info("No books found for these filters");
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
      if (res.ok) setBookDetails(await res.json());
    } catch (e) { console.error("Failed to load details:", e); }
    finally { setLoadingDetails(false); }
  };

  const openReader = async (book: BookResult | SavedBook) => {
    const workKey = 'key' in book ? book.key : ('book_key' in book ? book.book_key : null);
    if (!workKey) {
      const searchTerm = `${book.title} ${'author' in book && book.author ? book.author : ''}`.trim();
      setIframeLoaded(false);
      setReaderBook({ title: book.title, iaId: `search:${searchTerm}` });
      return;
    }
    setEditionPickerBook(book);
    setEditions([]);
    setLoadingEditions(true);
    try {
      const res = await fetch(`https://openlibrary.org${workKey}/editions.json?limit=100`);
      if (res.ok) {
        const data = await res.json();
        const entries: EditionEntry[] = (data.entries || []).filter((ed: any) => ed.ocaid);
        setEditions(entries);
        if (entries.length === 0) {
          toast.info("No readable editions found for this book");
          setEditionPickerBook(null);
          const searchTerm = `${book.title} ${'author' in book && book.author ? book.author : ''}`.trim();
          setIframeLoaded(false);
          setReaderBook({ title: book.title, iaId: `search:${searchTerm}` });
        }
      }
    } catch (e) {
      console.error("Failed to fetch editions:", e);
      setEditionPickerBook(null);
    }
    setLoadingEditions(false);
  };

  const selectEdition = (edition: EditionEntry) => {
    const title = editionPickerBook?.title || edition.title;
    setIframeLoaded(false);
    setReaderBook({ title, iaId: edition.ocaid! });
    setEditionPickerBook(null);
  };

  const saveBook = async (book: BookResult) => {
    if (!user) { toast.error("Sign in to save books"); return; }
    const { error } = await supabase.from("reading_list").insert({
      user_id: user.id, book_key: book.key, title: book.title, author: book.author,
      cover_id: book.coverId || null, year: book.year || null, subjects: book.subjects || [], status: "want_to_read",
    });
    if (error) { toast.error("Failed to save"); return; }
    toast.success("Added to reading list!");
    setSavedKeys(prev => new Set(prev).add(book.key));
    loadSavedBooks();
  };

  const updateBookStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("reading_list").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (!error) { setSavedBooks(prev => prev.map(b => b.id === id ? { ...b, status } : b)); toast.success("Status updated"); }
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

  const statusLabel: Record<string, string> = { want_to_read: "Want to Read", reading: "Reading", finished: "Finished" };
  const getDescriptionText = (desc: any): string => {
    if (!desc) return ""; if (typeof desc === "string") return desc; if (desc.value) return desc.value; return "";
  };

  const sourceIcon: Record<string, string> = { openlibrary: "📖", gutenberg: "📚", google: "🔍" };

  // ── IMMERSIVE READER ──
  if (readerBook) {
    const isSearch = readerBook.iaId.startsWith("search:");
    const iframeSrc = isSearch
      ? `https://openlibrary.org/search?q=${encodeURIComponent(readerBook.iaId.slice(7))}&mode=ebooks&has_fulltext=true&language=${lastSearchLang}`
      : `https://archive.org/embed/${readerBook.iaId}`;

    return (
      <div ref={readerContainerRef} className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Floating toolbar — auto-hides */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 z-10 flex items-center gap-3 px-3 py-2 bg-black/70 backdrop-blur-sm transition-opacity duration-300",
            toolbarVisible ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <Button
            size="sm"
            variant="ghost"
            className="text-white hover:bg-white/10 h-8"
            onClick={() => {
              if (document.fullscreenElement) document.exitFullscreen();
              setReaderBook(null);
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back
          </Button>
          <h2 className="text-sm font-medium text-white/90 truncate flex-1">{readerBook.title}</h2>
          <Button
            size="icon"
            variant="ghost"
            className="text-white hover:bg-white/10 h-8 w-8 shrink-0"
            onClick={toggleFullscreen}
          >
            {readerFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>

        {/* Loading overlay */}
        {!iframeLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-[5]">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-white/60 mx-auto" />
              <p className="text-sm text-white/50">Loading reader…</p>
            </div>
          </div>
        )}

        <iframe
          src={iframeSrc}
          className="w-full h-full border-0"
          allow="fullscreen"
          title={`Reading: ${readerBook.title}`}
          onLoad={() => setIframeLoaded(true)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* View toggle — pill-style */}
      <div className="flex items-center gap-1.5 bg-muted rounded-lg p-1 w-fit">
        {[
          { key: "search", label: "Discover", icon: Search },
          { key: "library", label: "Library", icon: BookmarkCheck, count: savedBooks.length },
          { key: "resources", label: "Resources", icon: Library },
        ].map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => { setView(key as any); if (key === "library") loadSavedBooks(); }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
              view === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {count ? <span className="text-[10px] opacity-60">({count})</span> : null}
          </button>
        ))}
      </div>

      {view === "search" ? (
        <div className="space-y-3">
          {/* Search form */}
          <form onSubmit={(e) => { e.preventDefault(); searchBooks(query); }} className="space-y-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search by title, author, or subject…" value={query}
                  onChange={(e) => setQuery(e.target.value)} className="pl-8 h-9" />
              </div>
              <Button type="submit" disabled={loading} size="sm" className="h-9">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={langFilter} onValueChange={(v) => { setLangFilter(v); if (searched) searchBooks(query, v); }}>
                <SelectTrigger className="w-[120px] h-7 text-xs">
                  <Globe className="h-3 w-3 mr-1" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LANG_NAMES).map(([code, name]) => (
                    <SelectItem key={code} value={code} className="text-xs">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={accessFilter} onValueChange={(v: any) => { setAccessFilter(v); if (searched) searchBooks(query, undefined, v); }}>
                <SelectTrigger className="w-[110px] h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Access</SelectItem>
                  <SelectItem value="readable" className="text-xs">Readable</SelectItem>
                  <SelectItem value="fulltext" className="text-xs">Full Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </form>

          {/* Popular searches */}
          {!searched && (
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_SEARCHES.map(t => (
                <Badge key={t} variant="outline" className="cursor-pointer hover:bg-accent text-xs"
                  onClick={() => { setQuery(t); searchBooks(t); }}>{t}</Badge>
              ))}
            </div>
          )}

          {/* Results */}
          {loading ? (
            <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{results.length} books from {new Set(results.map(b => b.source)).size} sources</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {results.slice(0, visibleCount).map((book) => (
                  <Card key={book.key} className="group border-border/40 hover:border-primary/30 transition-all cursor-pointer overflow-hidden"
                    onClick={() => book.source === "openlibrary" ? openBookDetail(book) : book.readUrl ? window.open(book.readUrl, "_blank") : openBookDetail(book)}>
                    <CardContent className="p-0">
                      {/* Cover — taller aspect ratio */}
                      <div className="aspect-[2/3] relative bg-muted overflow-hidden">
                        {book.coverId ? (
                          <img src={`https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`}
                            alt={book.title} className="w-full h-full object-cover" loading="lazy" />
                        ) : book.coverUrl ? (
                          <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                        )}
                        {/* Source dot */}
                        <span className="absolute top-1.5 right-1.5 text-sm" title={book.source}>
                          {sourceIcon[book.source]}
                        </span>
                        {/* Hover overlay with actions */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100">
                          <div className="flex gap-1">
                            {book.source !== "openlibrary" && book.readUrl && (
                              <Button size="sm" variant="secondary" className="h-7 text-[10px] px-2"
                                onClick={(e) => { e.stopPropagation(); window.open(book.readUrl, "_blank"); }}>
                                <ExternalLink className="h-3 w-3 mr-1" />Read
                              </Button>
                            )}
                            {!savedKeys.has(book.key) && (
                              <Button size="sm" variant="secondary" className="h-7 text-[10px] px-2"
                                onClick={(e) => { e.stopPropagation(); saveBook(book); }}>
                                <BookmarkPlus className="h-3 w-3 mr-1" />Save
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="p-2 space-y-0.5">
                        <h4 className="text-xs font-medium line-clamp-2 leading-snug">{book.displayTitle}</h4>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{book.author}</p>
                        <div className="flex items-center gap-1 pt-0.5">
                          {book.ebookAccess === "public" && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" title="Full Text" />
                          )}
                          {book.year && <span className="text-[10px] text-muted-foreground">{book.year}</span>}
                          {savedKeys.has(book.key) && <BookmarkCheck className="h-3 w-3 text-primary ml-auto" />}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {visibleCount < results.length && (
                <div className="text-center pt-2">
                  <Button variant="outline" size="sm" onClick={() => setVisibleCount(v => v + 40)}>
                    Show more ({results.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </div>
          ) : searched ? (
            <EmptyState icon={BookOpen} message="No books found" sub="Try different search terms or filters" />
          ) : null}
        </div>
      ) : view === "library" ? (
        <div className="space-y-3">
          {loadingSaved ? (
            <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
          ) : savedBooks.length === 0 ? (
            <EmptyState icon={BookOpen} message="Your library is empty" sub="Search and save books to start reading" />
          ) : (
            <div className="space-y-4">
              {["reading", "want_to_read", "finished"].map(status => {
                const filtered = savedBooks.filter(b => b.status === status);
                if (filtered.length === 0) return null;
                return (
                  <div key={status}>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      {statusLabel[status]}
                      <span className="text-[10px] bg-muted rounded-full px-1.5 py-0.5 normal-case tracking-normal">{filtered.length}</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {filtered.map((book) => (
                        <Card key={book.id} className="border-border/40">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex gap-3">
                              {book.cover_id ? (
                                <img src={`https://covers.openlibrary.org/b/id/${book.cover_id}-M.jpg`}
                                  alt={book.title} className="w-12 h-[72px] object-cover rounded-sm shrink-0 bg-muted" />
                              ) : (
                                <div className="w-12 h-[72px] bg-muted rounded-sm shrink-0 flex items-center justify-center">
                                  <BookOpen className="h-4 w-4 text-muted-foreground/40" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <h4 className="text-sm font-medium line-clamp-2">{book.title}</h4>
                                <p className="text-xs text-muted-foreground">{book.author}</p>
                                <div className="flex gap-0.5 mt-1">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s}
                                      className={cn("h-3 w-3 cursor-pointer", book.rating && s <= book.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30")}
                                      onClick={() => updateBookRating(book.id, s)} />
                                  ))}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <select className="text-xs bg-muted rounded px-2 py-1 border border-border"
                                value={book.status} onChange={(e) => updateBookStatus(book.id, e.target.value)}>
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
                                  onChange={(e) => setNotesText(e.target.value)} placeholder="Add your notes…" />
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
        </div>
      ) : (
        /* Resources — clean 2-column list */
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Free ebook libraries and platforms</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {FREE_EBOOK_RESOURCES.map((r) => (
              <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent transition-colors">
                <span className="text-lg shrink-0">{r.icon}</span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{r.name}</h4>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{r.description}</p>
                </div>
                <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/30 group-hover:text-primary transition-colors" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Edition Picker Sheet */}
      <Sheet open={!!editionPickerBook} onOpenChange={(open) => !open && setEditionPickerBook(null)}>
        <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
          {editionPickerBook && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left">Choose an Edition</SheetTitle>
                <SheetDescription className="text-left">
                  Select which version of "{editionPickerBook.title}" you'd like to read
                </SheetDescription>
              </SheetHeader>
              {loadingEditions ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />Loading editions…
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 mt-4">
                  {editions.map((ed) => {
                    const langCodes = ed.languages?.map(l => l.key.replace('/languages/', '')) || [];
                    const langNames = langCodes.map(c => LANG_NAMES[c] || c).join(', ');
                    return (
                      <Button key={ed.key} variant="outline"
                        className="justify-start gap-3 h-auto py-3 px-4 text-left whitespace-normal"
                        onClick={() => selectEdition(ed)}>
                        <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium line-clamp-1">{ed.title}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                            {ed.publishers?.[0] && <span>{ed.publishers[0]}</span>}
                            {ed.publish_date && <span>{ed.publish_date}</span>}
                            {langNames && <span>{langNames}</span>}
                            {ed.number_of_pages && <span>{ed.number_of_pages} pages</span>}
                            {ed.physical_format && <span className="capitalize">{ed.physical_format}</span>}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </Button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Book Detail Sheet */}
      <Sheet open={!!selectedBook} onOpenChange={(open) => !open && setSelectedBook(null)}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          {selectedBook && (
            <>
              <SheetHeader>
                <SheetTitle className="text-left flex items-center gap-2 flex-wrap">
                  {selectedBook.displayTitle || selectedBook.title}
                  {selectedBook.ebookAccess === "public" && (
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="Full Text" />
                  )}
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
                      <BookOpen className="h-3.5 w-3.5 mr-1.5" />Read
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
                        <p className="text-xs text-muted-foreground leading-relaxed">{getDescriptionText(bookDetails.description)}</p>
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

// Reusable empty state
function EmptyState({ icon: Icon, message, sub }: { icon: any; message: string; sub: string }) {
  return (
    <div className="text-center py-10 text-muted-foreground">
      <Icon className="h-10 w-10 mx-auto mb-2 opacity-30" />
      <p className="text-sm font-medium">{message}</p>
      <p className="text-xs mt-0.5">{sub}</p>
    </div>
  );
}
