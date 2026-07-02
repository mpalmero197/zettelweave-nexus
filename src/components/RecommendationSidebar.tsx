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
  const [generationRound, setGenerationRound] = useState(1);

  const cardsPerPage = 9;
  const currentRecommendations = recommendations.slice(
    currentPage * cardsPerPage,
    (currentPage + 1) * cardsPerPage
  );

  const generateRecommendations = async (baseCards: ZettelCardType[] = existingCards) => {
    setIsLoading(true);
    
    try {
      // Analyze existing cards to generate intelligent recommendations
      const cardTopics = baseCards.map(card => ({
        title: card.title,
        content: card.content.substring(0, 200),
        category: card.category,
        tags: card.tags
      }));

      // Generate recommendations based on content analysis
      const newRecommendations: RecommendedCard[] = await generateIntelligentRecommendations(cardTopics, generationRound);
      
      setRecommendations(prev => [...prev, ...newRecommendations]);
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
      // Fallback to template-based recommendations
      setRecommendations(prev => [...prev, ...generateFallbackRecommendations(baseCards)]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateIntelligentRecommendations = async (cardTopics: any[], round: number): Promise<RecommendedCard[]> => {
    // This would integrate with an AI service - for now, intelligent template generation
    const themes = extractThemes(cardTopics);
    const categories = [...new Set(cardTopics.map(c => c.category))];
    
    const recommendations: RecommendedCard[] = [];
    const baseId = Date.now();

    themes.forEach((theme, index) => {
      // Generate related concepts
      const relatedConcepts = getRelatedConcepts(theme, round);
      
      relatedConcepts.forEach((concept, conceptIndex) => {
        const category = categories[Math.floor(Math.random() * categories.length)] || "000";
        const categoryInfo = getCategoryInfo(category);
        
        recommendations.push({
          id: `rec-${baseId}-${index}-${conceptIndex}`,
          title: concept.title,
          description: concept.description,
          content: concept.content,
          category,
          tags: [...theme.tags, ...concept.tags],
          reasoning: `Related to "${theme.topic}" through ${concept.connection}`
        });
      });
    });

    return recommendations.slice(0, 27); // Return enough for 3 pages
  };

  const extractThemes = (cardTopics: any[]) => {
    const themes = [];
    const allTags = cardTopics.flatMap(c => c.tags);
    const commonTags = allTags.filter((tag, index, arr) => 
      arr.indexOf(tag) !== index
    );

    // Extract themes from titles and content
    cardTopics.forEach(card => {
      const words = card.title.toLowerCase().split(/\s+/);
      const contentWords = card.content.toLowerCase().split(/\s+/).slice(0, 20);
      
      themes.push({
        topic: card.title,
        tags: card.tags,
        keywords: [...words, ...contentWords].filter(w => w.length > 3),
        category: card.category
      });
    });

    return themes;
  };

  const getRelatedConcepts = (theme: any, round: number) => {
    const conceptBanks = {
      1: { // First round - direct relations
        philosophy: [
          { title: "Epistemological Foundations", description: "Exploring knowledge acquisition", content: "How do we know what we know? This fundamental question...", tags: ["epistemology", "knowledge"], connection: "philosophical inquiry" },
          { title: "Ethical Implications", description: "Moral considerations and frameworks", content: "Every decision carries moral weight...", tags: ["ethics", "morality"], connection: "value systems" }
        ],
        science: [
          { title: "Empirical Validation", description: "Testing theoretical frameworks", content: "The scientific method provides...", tags: ["research", "validation"], connection: "methodology" },
          { title: "Interdisciplinary Connections", description: "Cross-field applications", content: "Modern science thrives on...", tags: ["interdisciplinary", "synthesis"], connection: "knowledge integration" }
        ],
        technology: [
          { title: "Human-Computer Interaction", description: "Interface design principles", content: "How humans interact with technology...", tags: ["HCI", "design"], connection: "user experience" },
          { title: "Ethical AI Development", description: "Responsible technology creation", content: "As AI capabilities expand...", tags: ["AI", "ethics"], connection: "technological responsibility" }
        ]
      },
      2: { // Second round - deeper connections
        philosophy: [
          { title: "Phenomenological Analysis", description: "Experience and consciousness", content: "The structure of experience reveals...", tags: ["phenomenology", "consciousness"], connection: "lived experience" },
          { title: "Dialectical Reasoning", description: "Thesis, antithesis, synthesis", content: "Through contradiction comes understanding...", tags: ["dialectics", "logic"], connection: "reasoning process" }
        ],
        science: [
          { title: "Complex Systems Theory", description: "Emergence and self-organization", content: "Complex systems exhibit properties...", tags: ["complexity", "emergence"], connection: "systemic thinking" },
          { title: "Quantum Implications", description: "Reality at the quantum level", content: "Quantum mechanics challenges...", tags: ["quantum", "reality"], connection: "fundamental nature" }
        ]
      }
    };

    const themeKeywords = theme.keywords.join(' ').toLowerCase();
    let category = 'philosophy'; // default

    if (themeKeywords.includes('science') || themeKeywords.includes('research') || themeKeywords.includes('study')) {
      category = 'science';
    } else if (themeKeywords.includes('technology') || themeKeywords.includes('digital') || themeKeywords.includes('ai')) {
      category = 'technology';
    }

    const roundConcepts = conceptBanks[round as keyof typeof conceptBanks] || conceptBanks[1];
    return roundConcepts[category as keyof typeof roundConcepts] || roundConcepts.philosophy || [];
  };

  const generateFallbackRecommendations = (baseCards: ZettelCardType[]): RecommendedCard[] => {
    const categories = ["000", "100", "200", "300", "400", "500", "600", "700", "800", "900"];
    const baseId = Date.now();
    
    return Array.from({ length: 9 }, (_, index) => ({
      id: `fallback-${baseId}-${index}`,
      title: `Suggested Topic ${index + 1}`,
      description: `A recommended exploration based on your existing cards`,
      content: `This card builds upon themes from your current collection...`,
      category: categories[index % categories.length],
      tags: ["suggested", "related"],
      reasoning: "Generated based on existing card patterns"
    }));
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
    
    // Generate next round based on selected cards
    const selectedRecommendations = recommendations.filter(rec => selectedCards.has(rec.id));
    if (selectedRecommendations.length > 0) {
      setGenerationRound(prev => prev + 1);
      generateRecommendations(selectedRecommendations as any);
    }
    
    setSelectedCards(new Set());
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
    if (isOpen && recommendations.length === 0) {
      generateRecommendations();
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