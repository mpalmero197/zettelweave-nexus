import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Globe, ExternalLink, Sparkles, Image as ImageIcon, X, ArrowRight, Search, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SearchResultsCanvasProps {
  query: string;
  result: string;
  images?: string[];
  citations?: string[];
  relatedQuestions?: string[];
  onClose: () => void;
  onRelatedSearch?: (query: string) => void;
}

export function SearchResultsCanvas({ 
  query, 
  result, 
  images = [], 
  citations = [],
  relatedQuestions = [],
  onClose,
  onRelatedSearch 
}: SearchResultsCanvasProps) {
  const [suggestedSearches, setSuggestedSearches] = useState<string[]>([]);
  const [mainContent, setMainContent] = useState('');
  const [extractedLinks, setExtractedLinks] = useState<{ url: string; text: string }[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Extract suggested searches if present
    const suggestedMatch = result.match(/\*\*Suggested searches:\*\*\n([\s\S]*?)(?:\n\n|$)/);
    if (suggestedMatch) {
      const searches = suggestedMatch[1]
        .split('\n')
        .filter(line => line.trim().match(/^\d+\./))
        .map(line => line.replace(/^\d+\.\s*/, '').trim());
      setSuggestedSearches(searches);
      setMainContent(result.replace(suggestedMatch[0], '').trim());
    } else {
      setMainContent(result);
      setSuggestedSearches(relatedQuestions);
    }

    // Extract markdown links
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links: { url: string; text: string }[] = [];
    let match;
    while ((match = linkRegex.exec(result)) !== null) {
      links.push({ text: match[1], url: match[2] });
    }
    setExtractedLinks(links);
  }, [result, relatedQuestions]);

  const handleSearch = async () => {
    if (!searchInput.trim() || isSearching) return;
    
    // Trigger the search via the parent component
    onRelatedSearch?.(searchInput);
    setSearchInput('');
  };

  return (
    <div className="glass-card rounded-2xl p-6 shadow-card hover:shadow-hover transition-all duration-500 animate-fade-in-up min-h-[calc(100vh-200px)]">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-2xl pointer-events-none" />
      
      <div className="relative space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary shadow-lg shadow-primary/20">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Web Search
                </h1>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5" />
                  Search the internet for anything
                </p>
              </div>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <div className="flex gap-3 p-2 bg-card/80 backdrop-blur-xl border border-border/50 rounded-xl shadow-lg">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search for anything on the internet..."
                  className="pl-12 h-12 bg-background/50 border-0 text-base focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg"
                  disabled={isSearching}
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={isSearching || !searchInput.trim()}
                size="lg"
                className="h-12 px-6 rounded-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 transition-all"
              >
                {isSearching ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Current Query Display */}
          {query && (
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-accent/30 to-primary/30 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative bg-gradient-to-r from-accent/20 to-primary/20 rounded-xl p-5 border border-border/40 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/20 mt-0.5">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                      Current Search
                    </p>
                    <p className="text-lg font-medium leading-relaxed">{query}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main content area */}
        <div className="space-y-6">
            {/* Images section - Google-style */}
            {images && images.length > 0 && (
              <Card className="p-8 bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-xl border border-primary/20 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                    <ImageIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">Images</h2>
                    <p className="text-sm text-muted-foreground">Visual results from the web</p>
                  </div>
                  <Badge variant="secondary" className="ml-auto">
                    {images.length} {images.length === 1 ? 'image' : 'images'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {images.map((img, idx) => (
                    <a
                      key={idx}
                      href={img}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative group rounded-xl overflow-hidden border border-border/40 hover:border-primary/60 transition-all aspect-square bg-muted/20 hover:shadow-xl"
                    >
                      <img
                        src={img}
                        alt={`Search result ${idx + 1} for "${query}"`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.classList.add('hidden');
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-3">
                        <ExternalLink className="h-5 w-5 text-white" />
                      </div>
                    </a>
                  ))}
                </div>
              </Card>
            )}

            {/* Main content */}
            <Card className="p-8 bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-xl border border-primary/10 shadow-2xl">
              <div className="prose prose-base dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-p:text-base prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
                <ReactMarkdown
                  components={{
                    a: ({ href, children }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 underline decoration-primary/30 hover:decoration-primary inline-flex items-center gap-1 transition-all"
                      >
                        {children}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ),
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-semibold mb-3 mt-6">{children}</h2>
                    ),
                    p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="space-y-2 mb-4">{children}</ul>,
                    li: ({ children }) => (
                      <li className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                        <span>{children}</span>
                      </li>
                    ),
                  }}
                >
                  {mainContent}
                </ReactMarkdown>
              </div>
            </Card>

            {/* Links section */}
            {extractedLinks.length > 0 && (
              <Card className="p-8 bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-xl border border-accent/20 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-accent/20 to-accent/10">
                    <ExternalLink className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <h2 className="text-xl font-bold">Verified Sources</h2>
                  <Badge variant="secondary" className="ml-auto">
                    {extractedLinks.length} {extractedLinks.length === 1 ? 'source' : 'sources'}
                  </Badge>
                </div>
                <div className="grid gap-3">
                  {extractedLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-accent/10 to-transparent hover:from-accent/20 hover:to-accent/10 border border-border/40 hover:border-primary/60 transition-all group shadow-sm hover:shadow-lg"
                    >
                      <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                        <Globe className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate group-hover:text-primary transition-colors text-base">
                          {link.text}
                        </p>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">{link.url}</p>
                      </div>
                      <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </a>
                  ))}
                </div>
              </Card>
            )}

            {/* Suggested searches */}
            {suggestedSearches.length > 0 && (
              <Card className="p-8 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 backdrop-blur-xl border border-primary/30 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/30 to-primary/20">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    Explore Further
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {suggestedSearches.map((search, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      onClick={() => onRelatedSearch?.(search)}
                      className="h-auto py-4 px-5 justify-start text-left hover:bg-primary/10 hover:border-primary/50 hover:shadow-lg transition-all group border-primary/20 rounded-xl"
                    >
                      <div className="flex items-start gap-3 w-full">
                        <Badge variant="secondary" className="mt-1 flex-shrink-0 bg-primary/20 text-primary group-hover:bg-primary/30 transition-colors">
                          {idx + 1}
                        </Badge>
                        <span className="text-sm flex-1 leading-relaxed font-medium">{search}</span>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5" />
                      </div>
                    </Button>
                  ))}
                </div>
              </Card>
            )}
        </div>
      </div>
    </div>
  );
}
