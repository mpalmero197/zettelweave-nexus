import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Sparkles, X, Loader2 } from "lucide-react";
import { ZettelCard } from "@/types/zettel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
}

interface ScratchNote {
  id: string;
  content: string;
  timestamp: Date;
}

interface AISearchBarProps {
  cards: ZettelCard[];
  autoFocus?: boolean;
  initialQuery?: string;
  onSearchResults: (results: { 
    cards: ZettelCard[], 
    notes: any[], 
    stickyNotes: any[], 
    scratchNotes: ScratchNote[],
    webResults?: { query: string; result: string; images?: string[]; videos?: string[]; shopping?: string[]; news?: string[]; citations?: string[]; relatedQuestions?: string[]; contextualData?: any } | null,
    generatedImage?: { imageUrl: string; prompt: string } | null,
    multimediaResults?: { videos: any[]; images: any[] } | null,
    reasoning: string, 
    query: string,
    intent?: string;
    resultCount?: number;
  }) => void;
  className?: string;
  onQueryChange?: (query: string) => void;
}

export function AISearchBar({ cards, onSearchResults, className, onQueryChange, autoFocus, initialQuery }: AISearchBarProps) {
  const [query, setQuery] = useState(initialQuery || "");
  const [isSearching, setIsSearching] = useState(false);
  const [reasoning, setReasoning] = useState("");
  const initialSearchDone = useRef(false);

  // Auto-execute search when initialQuery is provided
  useEffect(() => {
    if (initialQuery && !initialSearchDone.current) {
      initialSearchDone.current = true;
      setQuery(initialQuery);
      onQueryChange?.(initialQuery);
      // Delay slightly to ensure component is mounted
      setTimeout(() => {
        handleAISearch(initialQuery);
      }, 100);
    }
  }, [initialQuery]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    onQueryChange?.(value);
  };

  const handleAISearch = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) {
      onSearchResults({ cards, notes: [], stickyNotes: [], scratchNotes: [], reasoning: "", query: "" });
      setReasoning("");
      return;
    }

    setIsSearching(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to search');
        throw new Error('Not authenticated');
      }

      // STEP 1: Classify intent first (CRITICAL to prevent hallucination)
      const { data: intentData } = await supabase.functions.invoke('classify-intent', {
        body: { query: q }
      });

      const intent = intentData?.intent || 'internal_search';
      const confidence = intentData?.confidence || 0.5;

      let finalCards: ZettelCard[] = [];
      let finalNotes: any[] = [];
      let finalStickyNotes: any[] = [];
      let finalScratchNotes: ScratchNote[] = [];
      let webResults = null;
      let generatedImage = null;
      let multimediaResults = null;
      let reasoning = intentData?.reason || '';

      // Get sticky notes and scratch notes from localStorage
      const stickyNotesRaw = localStorage.getItem('stickyNotes');
      const allStickyNotes = stickyNotesRaw ? JSON.parse(stickyNotesRaw) : [];
      
      const scratchNotesRaw = localStorage.getItem('scratchpad:notes:v1');
      const allScratchNotes = scratchNotesRaw ? JSON.parse(scratchNotesRaw) : [];

      // STEP 2: Route to correct service based on intent
      if (intent === 'internal_search') {
        const { data: aiSearchResult } = await supabase.functions.invoke('ai-search', {
          body: { 
            query: q,
            stickyNotes: allStickyNotes.map((n: any) => ({
              id: n.id,
              content: n.content,
              timestamp: n.timestamp
            }))
          }
        });

        if (aiSearchResult) {
          finalCards = (aiSearchResult.cards || []).map((card: any) => ({
            ...card,
            tags: card.tags || [],
            linkedCards: card.linkedCards || card.linked_cards || [],
          }));
          finalNotes = aiSearchResult.notes || [];
          finalStickyNotes = (aiSearchResult.stickyNotes || []).map((sn: any) => 
            allStickyNotes.find((n: any) => n.id === sn.id) || sn
          );
          finalScratchNotes = allScratchNotes.filter((note: any) =>
            note.content?.toLowerCase().includes(q.toLowerCase())
          );
          reasoning = aiSearchResult.reasoning || `Found ${finalCards.length + finalNotes.length + finalStickyNotes.length} results in your notes`;
        }
      } 
      else if (intent === 'web_search') {
        const { data: webSearchResult } = await supabase.functions.invoke('web-search', {
          body: { query: q, includeContext: true }
        });

        if (webSearchResult) {
          webResults = {
            query: q,
            result: webSearchResult.result || '',
            images: webSearchResult.images || [],
            videos: webSearchResult.videos || [],
            shopping: webSearchResult.shopping || [],
            news: webSearchResult.news || [],
            citations: webSearchResult.citations || [],
            relatedQuestions: webSearchResult.relatedQuestions || [],
            contextualData: webSearchResult.contextualData || null
          };
          reasoning = webSearchResult.contextualData 
            ? `Live web search with AI insights for: "${query}"`
            : `Live web search results for: "${query}"`;
        }
      }
      else if (intent === 'image_generation') {
        const { data: imageResult } = await supabase.functions.invoke('generate-image', {
          body: { prompt: q }
        });

        if (imageResult?.imageUrl) {
          generatedImage = {
            imageUrl: imageResult.imageUrl,
            prompt: q
          };
          reasoning = `AI generated image for: "${q}"`;
        }
      }
      else if (intent === 'multimedia_search') {
        // Use web-search but filter for multimedia content
        const { data: webSearchResult } = await supabase.functions.invoke('web-search', {
          body: { query: q }
        });

        if (webSearchResult) {
          multimediaResults = {
            videos: webSearchResult.videos || [],
            images: webSearchResult.images || []
          };
          reasoning = `Found ${(webSearchResult.videos?.length || 0) + (webSearchResult.images?.length || 0)} multimedia results`;
        }
      }

      const totalResults = finalCards.length + finalNotes.length + finalStickyNotes.length + finalScratchNotes.length +
        (webResults?.citations?.length || 0) + (webResults?.images?.length || 0) +
        (multimediaResults?.videos?.length || 0) + (multimediaResults?.images?.length || 0) +
        (generatedImage ? 1 : 0);
      
      onSearchResults({ 
        cards: finalCards, 
        notes: finalNotes, 
        stickyNotes: finalStickyNotes,
        scratchNotes: finalScratchNotes,
        webResults,
        generatedImage,
        multimediaResults,
        reasoning,
        query: q,
        intent,
        resultCount: totalResults
      });
      
      setReasoning(reasoning);
      
      const resultMessage = intent === 'internal_search' 
        ? `Found ${totalResults} results in your notes`
        : intent === 'web_search'
        ? 'Live web results fetched'
        : intent === 'image_generation'
        ? 'Image generated'
        : 'Multimedia results found';

      toast.success(resultMessage, {
        description: reasoning
      });
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error('Search failed', {
        description: error.message || 'Please try again'
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleRegularSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) {
      onSearchResults({ cards, notes: [], stickyNotes: [], scratchNotes: [], reasoning: "", query: "" });
      setReasoning("");
      return { cards: [], notes: [], stickyNotes: [], scratchNotes: [], total: 0 };
    }

    const q = searchQuery.toLowerCase();
    
    const matchedCards = cards.filter(card => {
      const titleMatch = card.title?.toLowerCase().includes(q);
      const contentMatch = card.content?.toLowerCase().includes(q);
      const descMatch = card.description?.toLowerCase().includes(q);
      const tagMatch = card.tags?.some(tag => tag.toLowerCase().includes(q));
      const numMatch = card.number?.includes(q);
      const catMatch = card.category?.toLowerCase().includes(q);
      
      return titleMatch || contentMatch || descMatch || tagMatch || numMatch || catMatch;
    });

    const stickyNotesRaw = localStorage.getItem('stickyNotes');
    const allStickyNotes = stickyNotesRaw ? JSON.parse(stickyNotesRaw) : [];
    const matchedStickyNotes = allStickyNotes.filter((note: any) =>
      note.content?.toLowerCase().includes(q)
    );

    const scratchNotesRaw = localStorage.getItem('scratchpad:notes:v1');
    const allScratchNotes = scratchNotesRaw ? JSON.parse(scratchNotesRaw) : [];
    const matchedScratchNotes = allScratchNotes.filter((note: any) =>
      note.content?.toLowerCase().includes(q)
    );

    const total = matchedCards.length + matchedStickyNotes.length + matchedScratchNotes.length;
    
    return { 
      cards: matchedCards, 
      notes: [], 
      stickyNotes: matchedStickyNotes, 
      scratchNotes: matchedScratchNotes,
      total 
    };
  };

  const clearSearch = () => {
    setQuery("");
    setReasoning("");
    onSearchResults({ cards, notes: [], stickyNotes: [], scratchNotes: [], reasoning: "", query: "" });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAISearch();
    }
  };

  return (
    <div className={className}>
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search"
              className="pl-10 pr-24 bg-card shadow-sm"
              dir="ltr"
              autoFocus={autoFocus}
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-14 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <Button
            onClick={() => handleAISearch()}
            disabled={isSearching}
            className="bg-primary shadow-glow hover:scale-105 transition-all"
          >
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      {reasoning && (
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            {reasoning}
          </Badge>
        </div>
      )}
    </div>
  );
}
