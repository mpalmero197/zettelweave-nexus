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
  onSearchResults: (results: ZettelCard[]) => void;
  className?: string;
}

export function AISearchBar({ cards, onSearchResults, className }: AISearchBarProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [reasoning, setReasoning] = useState("");

  const handleAISearch = async () => {
    if (!query.trim()) {
      onSearchResults(cards);
      setReasoning("");
      return;
    }

    setIsSearching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('ai-search', {
        body: { query, userId: user.id }
      });

      if (error) throw error;

      onSearchResults(data.cards || []);
      setReasoning(data.reasoning || "");
      
      toast.success(`Found ${data.cards?.length || 0} matching cards`, {
        description: data.reasoning
      });
    } catch (error: any) {
      console.error('AI Search error:', error);
      toast.error('Search failed', {
        description: error.message || 'Please try again'
      });
      // Fallback to regular search
      handleRegularSearch(query);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRegularSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) {
      onSearchResults(cards);
      setReasoning("");
      return;
    }

    const q = searchQuery.toLowerCase();
    const results = cards.filter(card => 
      card.title.toLowerCase().includes(q) ||
      card.content.toLowerCase().includes(q) ||
      card.description?.toLowerCase().includes(q) ||
      card.tags.some(tag => tag.toLowerCase().includes(q)) ||
      card.number.includes(q) ||
      card.category.toLowerCase().includes(q)
    );

    onSearchResults(results);
    setReasoning(`Found ${results.length} exact matches`);
  };

  const clearSearch = () => {
    setQuery("");
    setReasoning("");
    onSearchResults(cards);
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
              placeholder="Search with AI (e.g., 'long-necked animal' → giraffe)"
              className="pl-10 pr-24 bg-card shadow-sm"
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
