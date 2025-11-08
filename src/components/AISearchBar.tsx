import { useState } from "react";
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
  onSearchResults: (results: { 
    cards: ZettelCard[], 
    notes: any[], 
    stickyNotes: any[], 
    scratchNotes: ScratchNote[],
    webResults?: { query: string; result: string; images?: string[]; citations?: string[]; relatedQuestions?: string[] } | null,
    reasoning: string, 
    query: string 
  }) => void;
  className?: string;
}

export function AISearchBar({ cards, onSearchResults, className }: AISearchBarProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [reasoning, setReasoning] = useState("");

  const handleAISearch = async () => {
    if (!query.trim()) {
      onSearchResults({ cards, notes: [], stickyNotes: [], scratchNotes: [], reasoning: "", query: "" });
      setReasoning("");
      return;
    }

    setIsSearching(true);
    
    // First search locally for instant feedback
    const localResults = handleRegularSearch(query);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to search');
        throw new Error('Not authenticated');
      }

      // Get sticky notes and scratch notes from localStorage
      const stickyNotesRaw = localStorage.getItem('stickyNotes');
      const allStickyNotes = stickyNotesRaw ? JSON.parse(stickyNotesRaw) : [];
      
      const scratchNotesRaw = localStorage.getItem('scratchpad:notes:v1');
      const allScratchNotes = scratchNotesRaw ? JSON.parse(scratchNotesRaw) : [];

      console.log('Starting comprehensive search:', query);

      // Always run AI search and web search in parallel
      const [aiSearchResult, webSearchResult] = await Promise.allSettled([
        supabase.functions.invoke('ai-search', {
          body: { 
            query,
            stickyNotes: allStickyNotes.map((n: any) => ({
              id: n.id,
              content: n.content,
              timestamp: n.timestamp
            }))
          }
        }),
        // Use dedicated web search function
        supabase.functions.invoke('web-search', {
          body: { query }
        })
      ]);

      let finalCards = localResults.cards;
      let finalNotes = localResults.notes;
      let finalStickyNotes = localResults.stickyNotes;
      let finalScratchNotes = localResults.scratchNotes;
      let webResults = null;
      let reasoning = `Found ${localResults.total} local matches`;

      // Process AI search results
      if (aiSearchResult.status === 'fulfilled' && aiSearchResult.value.data) {
        const data = aiSearchResult.value.data;
        const safeCards = (data.cards || []).map((card: any) => ({
          ...card,
          tags: card.tags || [],
          linkedCards: card.linkedCards || card.linked_cards || [],
        }));
        
        const safeNotes = data.notes || [];
        const safeStickyNotes = (data.stickyNotes || []).map((sn: any) => 
          allStickyNotes.find((n: any) => n.id === sn.id) || sn
        );

        if (safeCards.length > 0 || safeNotes.length > 0 || safeStickyNotes.length > 0) {
          finalCards = safeCards;
          finalNotes = safeNotes;
          finalStickyNotes = safeStickyNotes;
          reasoning = data.reasoning || `AI found ${safeCards.length + safeNotes.length + safeStickyNotes.length} relevant results`;
        }
      }

      // Process web search results
      if (webSearchResult.status === 'fulfilled' && webSearchResult.value.data) {
        const data = webSearchResult.value.data;
        webResults = {
          query,
          result: data.result || '',
          images: data.images || [],
          videos: data.videos || [],
          shopping: data.shopping || [],
          news: data.news || [],
          citations: data.citations || [],
          relatedQuestions: data.relatedQuestions || []
        };
      }

      const totalResults = finalCards.length + finalNotes.length + finalStickyNotes.length + finalScratchNotes.length;
      
      onSearchResults({ 
        cards: finalCards, 
        notes: finalNotes, 
        stickyNotes: finalStickyNotes,
        scratchNotes: finalScratchNotes,
        webResults,
        reasoning: webResults ? `${reasoning} + web results` : reasoning,
        query 
      });
      
      setReasoning(webResults ? `${reasoning} + web results` : reasoning);
      
      toast.success(`Search complete: ${totalResults} local results${webResults ? ' + web' : ''}`, {
        description: reasoning
      });
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error('Search completed with errors', {
        description: 'Showing local results'
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
    
    // Search cards
    const matchedCards = cards.filter(card => {
      const titleMatch = card.title?.toLowerCase().includes(q);
      const contentMatch = card.content?.toLowerCase().includes(q);
      const descMatch = card.description?.toLowerCase().includes(q);
      const tagMatch = card.tags?.some(tag => tag.toLowerCase().includes(q));
      const numMatch = card.number?.includes(q);
      const catMatch = card.category?.toLowerCase().includes(q);
      
      return titleMatch || contentMatch || descMatch || tagMatch || numMatch || catMatch;
    });

    // Search sticky notes
    const stickyNotesRaw = localStorage.getItem('stickyNotes');
    const allStickyNotes = stickyNotesRaw ? JSON.parse(stickyNotesRaw) : [];
    const matchedStickyNotes = allStickyNotes.filter((note: any) =>
      note.content?.toLowerCase().includes(q)
    );

    // Search scratch notes
    const scratchNotesRaw = localStorage.getItem('scratchpad:notes:v1');
    const allScratchNotes = scratchNotesRaw ? JSON.parse(scratchNotesRaw) : [];
    const matchedScratchNotes = allScratchNotes.filter((note: any) =>
      note.content?.toLowerCase().includes(q)
    );

    const total = matchedCards.length + matchedStickyNotes.length + matchedScratchNotes.length;
    const resultReasoning = `Found ${total} local match${total !== 1 ? 'es' : ''}`;
    
    onSearchResults({ 
      cards: matchedCards, 
      notes: [], 
      stickyNotes: matchedStickyNotes,
      scratchNotes: matchedScratchNotes,
      reasoning: resultReasoning,
      query: searchQuery
    });
    setReasoning(resultReasoning);
    
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
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Search"
              className="pl-10 pr-24 bg-card shadow-sm"
              dir="ltr"
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
            onClick={handleAISearch}
            disabled={isSearching}
            className="bg-gradient-to-r from-primary to-secondary shadow-glow hover:scale-105 transition-all"
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
