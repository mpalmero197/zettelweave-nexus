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

interface AISearchBarProps {
  cards: ZettelCard[];
  onSearchResults: (results: { cards: ZettelCard[], notes: any[], stickyNotes: any[], reasoning: string, query: string }) => void;
  className?: string;
}

export function AISearchBar({ cards, onSearchResults, className }: AISearchBarProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [reasoning, setReasoning] = useState("");

  const handleAISearch = async () => {
    if (!query.trim()) {
      onSearchResults({ cards, notes: [], stickyNotes: [], reasoning: "", query: "" });
      setReasoning("");
      return;
    }

    setIsSearching(true);
    
    // First try regular search immediately for instant feedback
    handleRegularSearch(query);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to search');
        throw new Error('Not authenticated');
      }

      // Get sticky notes from localStorage
      const stickyNotesRaw = localStorage.getItem('stickyNotes');
      const allStickyNotes = stickyNotesRaw ? JSON.parse(stickyNotesRaw) : [];

      console.log('Calling AI search with query:', query);
      console.log('Available cards count:', cards.length);

      const { data, error } = await supabase.functions.invoke('ai-search', {
        body: { 
          query,
          stickyNotes: allStickyNotes.map((n: any) => ({
            id: n.id,
            content: n.content,
            timestamp: n.timestamp
          }))
        }
      });

      if (error) {
        console.error('AI Search error:', error);
        throw error;
      }

      console.log('AI Search response:', data);

      // Ensure all arrays exist with defaults
      const safeCards = (data.cards || []).map((card: any) => ({
        ...card,
        tags: card.tags || [],
        linkedCards: card.linkedCards || card.linked_cards || [],
      }));
      
      const safeNotes = data.notes || [];
      const safeStickyNotes = (data.stickyNotes || []).map((sn: any) => 
        allStickyNotes.find((n: any) => n.id === sn.id) || sn
      );

      const total = safeCards.length + safeNotes.length + safeStickyNotes.length;
      
      // If AI found results, use them; otherwise keep the regular search results
      if (total > 0) {
        onSearchResults({ 
          cards: safeCards, 
          notes: safeNotes, 
          stickyNotes: safeStickyNotes,
          reasoning: data.reasoning || `Found ${total} results`,
          query 
        });
        setReasoning(data.reasoning || `Found ${total} results`);
        
        toast.success(`AI Search: ${total} results`, {
          description: data.reasoning
        });
      } else {
        // Keep the regular search results that were already shown
        const reasoning = data.reasoning || 'No AI matches. Showing exact keyword matches.';
        setReasoning(reasoning);
        toast.info('AI Search', {
          description: reasoning
        });
      }
    } catch (error: any) {
      console.error('AI Search error:', error);
      toast.error('AI Search unavailable', {
        description: 'Showing exact keyword matches instead'
      });
      // Regular search results were already shown at the start
    } finally {
      setIsSearching(false);
    }
  };

  const handleRegularSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) {
      onSearchResults({ cards, notes: [], stickyNotes: [], reasoning: "", query: "" });
      setReasoning("");
      return;
    }

    const q = searchQuery.toLowerCase();
    
    console.log('Regular search for:', q);
    console.log('Searching in', cards.length, 'cards');
    
    // Search cards with comprehensive field matching
    const matchedCards = cards.filter(card => {
      const titleMatch = card.title?.toLowerCase().includes(q);
      const contentMatch = card.content?.toLowerCase().includes(q);
      const descMatch = card.description?.toLowerCase().includes(q);
      const tagMatch = card.tags?.some(tag => tag.toLowerCase().includes(q));
      const numMatch = card.number?.includes(q);
      const catMatch = card.category?.toLowerCase().includes(q);
      
      return titleMatch || contentMatch || descMatch || tagMatch || numMatch || catMatch;
    });

    console.log('Found', matchedCards.length, 'matching cards');

    // Search sticky notes from localStorage
    const stickyNotesRaw = localStorage.getItem('stickyNotes');
    const allStickyNotes = stickyNotesRaw ? JSON.parse(stickyNotesRaw) : [];
    const matchedStickyNotes = allStickyNotes.filter((note: any) =>
      note.content?.toLowerCase().includes(q)
    );

    const total = matchedCards.length + matchedStickyNotes.length;
    const resultReasoning = `Found ${total} exact keyword match${total !== 1 ? 'es' : ''}`;
    
    onSearchResults({ 
      cards: matchedCards, 
      notes: [], 
      stickyNotes: matchedStickyNotes,
      reasoning: resultReasoning,
      query: searchQuery
    });
    setReasoning(resultReasoning);
    
    console.log('Search results:', { cards: matchedCards.length, stickyNotes: matchedStickyNotes.length });
  };

  const clearSearch = () => {
    setQuery("");
    setReasoning("");
    onSearchResults({ cards, notes: [], stickyNotes: [], reasoning: "", query: "" });
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
              placeholder="Search all content: cards, notes, sticky notes..."
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
