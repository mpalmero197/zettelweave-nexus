import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, Calendar, Tag, Hash, FileText } from "lucide-react";
import { ZettelCard } from "@/types/zettel";

interface SearchBarProps {
  cards: ZettelCard[];
  onSearchResults: (results: ZettelCard[]) => void;
  className?: string;
}

type SearchFilter = 'all' | 'title' | 'content' | 'tags' | 'category' | 'date';

export function SearchBar({ cards, onSearchResults, className }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<SearchFilter[]>(['all']);
  const [showFilters, setShowFilters] = useState(false);

  const filterOptions: { value: SearchFilter; label: string; icon: React.ReactNode }[] = [
    { value: 'all', label: 'All Fields', icon: <Search className="h-3 w-3" /> },
    { value: 'title', label: 'Title', icon: <FileText className="h-3 w-3" /> },
    { value: 'content', label: 'Content', icon: <FileText className="h-3 w-3" /> },
    { value: 'tags', label: 'Tags', icon: <Tag className="h-3 w-3" /> },
    { value: 'category', label: 'Category', icon: <Hash className="h-3 w-3" /> },
    { value: 'date', label: 'Date', icon: <Calendar className="h-3 w-3" /> }
  ];

  const searchCards = (searchQuery: string, filters: SearchFilter[]) => {
    if (!searchQuery.trim()) {
      onSearchResults(cards);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = cards.filter(card => {
      if (filters.includes('all')) {
        return (
          card.title.toLowerCase().includes(query) ||
          card.content.toLowerCase().includes(query) ||
          card.description?.toLowerCase().includes(query) ||
          card.tags.some(tag => tag.toLowerCase().includes(query)) ||
          card.number.includes(query) ||
          card.category.includes(query)
        );
      }

      return filters.some(filter => {
        switch (filter) {
          case 'title':
            return card.title.toLowerCase().includes(query);
          case 'content':
            return card.content.toLowerCase().includes(query);
          case 'tags':
            return card.tags.some(tag => tag.toLowerCase().includes(query));
          case 'category':
            return card.category.includes(query) || card.number.includes(query);
          case 'date':
            return card.created.toLocaleDateString().includes(query) ||
                   card.modified.toLocaleDateString().includes(query);
          default:
            return false;
        }
      });
    });

    onSearchResults(results);
  };

  const handleSearch = (newQuery: string) => {
    setQuery(newQuery);
    searchCards(newQuery, activeFilters);
  };

  const toggleFilter = (filter: SearchFilter) => {
    let newFilters: SearchFilter[];
    
    if (filter === 'all') {
      newFilters = ['all'];
    } else {
      const filteredFilters = activeFilters.filter(f => f !== 'all');
      if (filteredFilters.includes(filter)) {
        newFilters = filteredFilters.filter(f => f !== filter);
        if (newFilters.length === 0) newFilters = ['all'];
      } else {
        newFilters = [...filteredFilters, filter];
      }
    }
    
    setActiveFilters(newFilters);
    searchCards(query, newFilters);
  };

  const clearSearch = () => {
    setQuery("");
    setActiveFilters(['all']);
    onSearchResults(cards);
  };

  return (
    <div className={className}>
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search cards by title, content, tags, category..."
              className="pl-10 pr-20 bg-card shadow-sm"
            />
            {query && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-12 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "bg-accent" : ""}
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {showFilters && (
          <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-card border border-border rounded-lg shadow-card z-10">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Search in:</p>
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                  <Badge
                    key={option.value}
                    variant={activeFilters.includes(option.value) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => toggleFilter(option.value)}
                  >
                    {option.icon}
                    <span className="ml-1">{option.label}</span>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {query && (
        <div className="mt-2 text-sm text-muted-foreground">
          Showing results for "{query}" • {cards.length} cards found
        </div>
      )}
    </div>
  );
}