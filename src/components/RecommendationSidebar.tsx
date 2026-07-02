import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { getCategoryInfo } from "@/utils/deweySystem";
import { Lightbulb, ChevronRight, ChevronLeft, Sparkles, X, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


interface RecommendedCard {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
  reasoning: string;
}

interface RecommendationSidebarProps {
  existingCards: ZettelCardType[];
  onAddCards: (cards: Omit<ZettelCardType, 'id' | 'number' | 'created' | 'linkedCards'>[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function RecommendationSidebar({ existingCards, onAddCards, isOpen, onClose }: RecommendationSidebarProps) {
  const [recommendations, setRecommendations] = useState<RecommendedCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  // Fingerprint of the cards the current recommendations were generated from,
  // so suggestions refresh when the user's actual content changes.
  const generatedForRef = useRef<string>("");

  const cardsPerPage = 9;
  const currentRecommendations = recommendations.slice(
    currentPage * cardsPerPage,
    (currentPage + 1) * cardsPerPage
  );

  const cardsFingerprint = (cards: ZettelCardType[]) =>
    cards
      .slice(0, 40)
      .map(c => `${c.id}:${c.title}:${(c.content || "").length}`)
      .join("|");

  const generateRecommendations = async (opts: { fresh?: boolean } = {}) => {
    setIsLoading(true);
    try {
      const payloadCards = existingCards.slice(0, 40).map(card => ({
        title: card.title,
        content: (card.content || "").substring(0, 300),
        description: card.description,
        category: card.category,
        tags: card.tags,
      }));

      const excludeTitles = opts.fresh
        ? []
        : recommendations.map(r => r.title);

      const { data, error } = await supabase.functions.invoke("recommend-cards", {
        body: { cards: payloadCards, excludeTitles, count: 9 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const suggestions: RecommendedCard[] = data?.suggestions || [];
      if (suggestions.length === 0) {
        toast.info("No new suggestions right now — try adding more content to your cards.");
      }

      generatedForRef.current = cardsFingerprint(existingCards);
      if (opts.fresh) {
        setRecommendations(suggestions);
        setCurrentPage(0);
        setSelectedCards(new Set());
      } else {
        setRecommendations(prev => [...prev, ...suggestions]);
      }
    } catch (error: any) {
      console.error("Failed to generate recommendations:", error);
      toast.error(error?.message || "Couldn't generate recommendations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardSelect = (cardId: string, checked: boolean) => {

    const newSelected = new Set(selectedCards);
    if (checked) {
      newSelected.add(cardId);
    } else {
      newSelected.delete(cardId);
    }
    setSelectedCards(newSelected);
  };

  const handleAddSelected = () => {
    const cardsToAdd = recommendations
      .filter(rec => selectedCards.has(rec.id))
      .map(rec => ({
        title: rec.title,
        description: rec.description,
        content: rec.content,
        category: rec.category,
        tags: rec.tags,
        modified: new Date().toISOString(),
        author: "AI Recommendation"
      }));

    onAddCards(cardsToAdd);

    // Remove added cards from the suggestion list and keep browsing
    setRecommendations(prev => prev.filter(rec => !selectedCards.has(rec.id)));
    setSelectedCards(new Set());
    setCurrentPage(0);
  };

  const nextPage = () => {
    if ((currentPage + 1) * cardsPerPage >= recommendations.length && !isLoading) {
      generateRecommendations();
    }
    setCurrentPage(prev => prev + 1);
  };

  const prevPage = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  useEffect(() => {
    if (!isOpen) return;
    // Regenerate when opened with no suggestions, or when the user's cards
    // have changed since the last generation (fixes stale/static suggestions).
    const fp = cardsFingerprint(existingCards);
    if (recommendations.length === 0 || generatedForRef.current !== fp) {
      generateRecommendations({ fresh: true });
    }
  }, [isOpen]);


  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-card border-l border-border z-50 shadow-2xl animate-slide-in-right">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Recommendations</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {currentRecommendations.map((rec) => {
            const categoryInfo = getCategoryInfo(rec.category);
            return (
              <Card key={rec.id} className="relative group hover-scale">
                <div className="absolute top-3 right-3">
                  <Checkbox
                    checked={selectedCards.has(rec.id)}
                    onCheckedChange={(checked) => handleCardSelect(rec.id, checked as boolean)}
                  />
                </div>
                
                <CardHeader className="pb-2 pr-12">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      variant="outline" 
                      className="text-xs"
                      style={{ 
                        borderColor: `hsl(var(--category-${categoryInfo.color}))`,
                        color: `hsl(var(--category-${categoryInfo.color}))`
                      }}
                    >
                      {categoryInfo.name}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm leading-tight">
                    {rec.title}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {rec.description}
                  </p>
                </CardHeader>
                
                <CardContent className="pt-0 space-y-2">
                  <p className="text-xs leading-relaxed line-clamp-3">
                    {rec.content}
                  </p>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Lightbulb className="h-3 w-3" />
                    {rec.reasoning}
                  </div>
                  
                  {rec.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {rec.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-muted-foreground">Generating recommendations...</div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={prevPage}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <span className="text-sm text-muted-foreground">
              Page {currentPage + 1}
            </span>
            
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={nextPage}
              disabled={isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {selectedCards.size > 0 && (
            <Button 
              onClick={handleAddSelected}
              className="w-full"
              disabled={selectedCards.size === 0}
            >
              Add {selectedCards.size} Selected Cards
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}