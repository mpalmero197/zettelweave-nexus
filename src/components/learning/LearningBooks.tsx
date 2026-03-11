import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, Loader2, BookOpen, Library } from "lucide-react";
import { toast } from "sonner";

interface BookResult {
  key: string;
  title: string;
  author: string;
  year?: number;
  coverId?: number;
  subjects?: string[];
  editionCount?: number;
}

const POPULAR_SEARCHES = [
  "Atomic Habits", "Sapiens", "Deep Work",
  "Thinking Fast and Slow", "The Art of War",
  "Meditations", "1984", "Dune",
];

export function LearningBooks() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchBooks = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=12&fields=key,title,author_name,first_publish_year,cover_i,subject,edition_count`
      );
      if (!res.ok) throw new Error("Failed to search Open Library");
      const data = await res.json();

      const parsed: BookResult[] = (data.docs || []).map((doc: any) => ({
        key: doc.key,
        title: doc.title,
        author: doc.author_name?.[0] || "Unknown author",
        year: doc.first_publish_year,
        coverId: doc.cover_i,
        subjects: doc.subject?.slice(0, 3),
        editionCount: doc.edition_count,
      }));

      setResults(parsed);
      if (parsed.length === 0) toast.info("No books found");
    } catch (err: any) {
      console.error(err);
      toast.error("Search failed", { description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => { e.preventDefault(); searchBooks(query); }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search millions of books…"
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </form>

      {!searched && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground font-medium">Try searching for</p>
          <div className="flex flex-wrap gap-2">
            {POPULAR_SEARCHES.map((term) => (
              <Badge
                key={term}
                variant="outline"
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => { setQuery(term); searchBooks(term); }}
              >
                {term}
              </Badge>
            ))}
          </div>

          <a href="https://openlibrary.org" target="_blank" rel="noopener noreferrer">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Library className="h-4 w-4 text-primary" />
                  Open Library
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Browse and borrow from millions of free ebooks. Powered by the Internet Archive.
                </p>
              </CardContent>
            </Card>
          </a>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((book) => (
            <a
              key={book.key}
              href={`https://openlibrary.org${book.key}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardContent className="pt-4 flex gap-3">
                  {book.coverId ? (
                    <img
                      src={`https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`}
                      alt={book.title}
                      className="w-16 h-24 object-cover rounded-sm shrink-0 bg-muted"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-16 h-24 bg-muted rounded-sm shrink-0 flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium leading-snug line-clamp-2">{book.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{book.author}</p>
                    {book.year && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">First published {book.year}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {book.subjects?.map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-[9px] px-1 py-0">{s}</Badge>
                      ))}
                    </div>
                    {book.editionCount && book.editionCount > 1 && (
                      <p className="text-[10px] text-muted-foreground mt-1">{book.editionCount} editions</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No books found. Try different keywords.</p>
        </div>
      )}
    </div>
  );
}
