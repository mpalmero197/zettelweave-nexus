import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, ExternalLink, Sparkles, Image as ImageIcon, X, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useState, useEffect } from 'react';

interface SearchResultsCanvasProps {
  query: string;
  result: string;
  images?: string[];
  relatedQuestions?: string[];
  onClose: () => void;
  onRelatedSearch?: (query: string) => void;
}

export function SearchResultsCanvas({ 
  query, 
  result, 
  images = [], 
  relatedQuestions = [],
  onClose,
  onRelatedSearch 
}: SearchResultsCanvasProps) {
  const [suggestedSearches, setSuggestedSearches] = useState<string[]>([]);
  const [mainContent, setMainContent] = useState('');
  const [extractedLinks, setExtractedLinks] = useState<{ url: string; text: string }[]>([]);

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

  return (
    <div className="h-full w-full bg-gradient-to-br from-background via-background to-primary/5 p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] pointer-events-none" />
      
      <div className="relative h-full flex flex-col max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 backdrop-blur-sm border border-primary/20">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Search Results
                </h1>
                <p className="text-sm text-muted-foreground mt-1">Powered by ALICE</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-accent/50 to-accent/30 rounded-xl p-4 border border-border/30 backdrop-blur-sm">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                    Your Query
                  </p>
                  <p className="text-base font-medium">{query}</p>
                </div>
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="ml-4 rounded-xl hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Main content area */}
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Images section */}
            {images.length > 0 && (
              <Card className="p-6 bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-sm border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Related Images</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative group rounded-lg overflow-hidden border border-border/30 hover:border-primary/50 transition-all aspect-video"
                    >
                      <img
                        src={img}
                        alt={`Result ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full"
                          onClick={() => window.open(img, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-2" />
                          View Full
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Main content */}
            <Card className="p-6 bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-sm border-border/50">
              <div className="prose prose-sm dark:prose-invert max-w-none">
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
              <Card className="p-6 bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-sm border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <ExternalLink className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Referenced Sources</h2>
                </div>
                <div className="grid gap-3">
                  {extractedLinks.map((link, idx) => (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg bg-accent/30 hover:bg-accent/50 border border-border/30 hover:border-primary/50 transition-all group"
                    >
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Globe className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate group-hover:text-primary transition-colors">
                          {link.text}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{link.url}</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </a>
                  ))}
                </div>
              </Card>
            )}

            {/* Suggested searches */}
            {suggestedSearches.length > 0 && (
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 backdrop-blur-sm border-primary/20">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-primary">Continue Exploring</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {suggestedSearches.map((search, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      onClick={() => onRelatedSearch?.(search)}
                      className="h-auto py-3 px-4 justify-start text-left hover:bg-primary/10 hover:border-primary/50 transition-all group"
                    >
                      <div className="flex items-start gap-2 w-full">
                        <Badge variant="secondary" className="mt-0.5 flex-shrink-0">
                          {idx + 1}
                        </Badge>
                        <span className="text-sm flex-1">{search}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
                      </div>
                    </Button>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
