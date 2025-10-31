import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Loader2, Link2, X, Check, Sparkles, TrendingUp, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LinkSuggestion {
  cardId: string;
  cardTitle: string;
  relationshipType: 'related' | 'builds-on' | 'contrasts' | 'example' | 'supports';
  reasoning: string;
  strength: number;
}

interface SmartLinkingSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCardId: string | null;
  allCards: any[];
  onLinkAccepted: (sourceCardId: string, targetCardId: string) => void;
}

const relationshipIcons: Record<string, string> = {
  'related': '🔗',
  'builds-on': '🏗️',
  'contrasts': '⚖️',
  'example': '💡',
  'supports': '🤝',
};

const relationshipColors: Record<string, string> = {
  'related': 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
  'builds-on': 'bg-green-500/10 text-green-700 dark:text-green-300',
  'contrasts': 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
  'example': 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
  'supports': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
};

export function SmartLinkingSidebar({ 
  open, 
  onOpenChange, 
  currentCardId, 
  allCards,
  onLinkAccepted 
}: SmartLinkingSidebarProps) {
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [acceptedLinks, setAcceptedLinks] = useState<Set<string>>(new Set());
  const [rejectedLinks, setRejectedLinks] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && currentCardId && allCards.length > 0) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
      setAcceptedLinks(new Set());
      setRejectedLinks(new Set());
    }
  }, [open, currentCardId, allCards]);

  const fetchSuggestions = async () => {
    if (!currentCardId) return;

    setLoading(true);
    setSuggestions([]);

    try {
      const { data, error } = await supabase.functions.invoke('suggest-smart-links', {
        body: {
          cardId: currentCardId,
          allCards: allCards,
        },
      });

      if (error) throw error;

      const sortedSuggestions = (data?.suggestions || []).sort(
        (a: LinkSuggestion, b: LinkSuggestion) => b.strength - a.strength
      );

      setSuggestions(sortedSuggestions);

      if (sortedSuggestions.length === 0) {
        toast.info('No link suggestions found', {
          description: 'Try adding more cards to build a richer knowledge graph.',
        });
      } else {
        toast.success('Smart links ready!', {
          description: `Found ${sortedSuggestions.length} potential connection${sortedSuggestions.length > 1 ? 's' : ''}.`,
        });
      }
    } catch (error: any) {
      console.error('Smart linking error:', error);
      toast.error('Failed to generate suggestions', {
        description: error.message || 'Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptLink = (suggestion: LinkSuggestion) => {
    if (!currentCardId) return;
    
    onLinkAccepted(currentCardId, suggestion.cardId);
    setAcceptedLinks(prev => new Set([...prev, suggestion.cardId]));
    
    toast.success('Link created!', {
      description: `Connected to "${suggestion.cardTitle}"`,
    });
  };

  const handleRejectLink = (cardId: string) => {
    setRejectedLinks(prev => new Set([...prev, cardId]));
  };

  const currentCard = allCards.find(c => c.id === currentCardId);
  const visibleSuggestions = suggestions.filter(
    s => !acceptedLinks.has(s.cardId) && !rejectedLinks.has(s.cardId)
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[540px] sm:max-w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Smart Linking Assistant
          </SheetTitle>
          <SheetDescription>
            AI-powered suggestions to connect your knowledge
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {currentCard && (
            <Card className="border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Current Card</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-semibold text-sm">{currentCard.title}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {currentCard.content}
                </p>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing your knowledge graph...</p>
            </div>
          ) : visibleSuggestions.length === 0 ? (
            <Card>
              <CardContent className="pt-6 pb-6 text-center">
                <Link2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {suggestions.length === 0 
                    ? 'No suggestions available. Add more cards to build connections.'
                    : 'All suggestions reviewed!'}
                </p>
                {acceptedLinks.size > 0 && (
                  <p className="text-xs text-primary mt-2">
                    ✓ {acceptedLinks.size} link{acceptedLinks.size > 1 ? 's' : ''} created
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Suggested Connections
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {visibleSuggestions.length} suggestions
                </Badge>
              </div>

              <ScrollArea className="h-[calc(100vh-340px)]">
                <div className="space-y-3 pr-4">
                  {visibleSuggestions.map((suggestion, index) => (
                    <Card key={suggestion.cardId} className="hover:border-primary/40 transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              {relationshipIcons[suggestion.relationshipType]}
                              {suggestion.cardTitle}
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${relationshipColors[suggestion.relationshipType]}`}
                              >
                                {suggestion.relationshipType}
                              </Badge>
                              <span className="ml-2">
                                {Math.round(suggestion.strength * 100)}% confidence
                              </span>
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {suggestion.reasoning}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptLink(suggestion)}
                            className="flex-1"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Link Cards
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRejectLink(suggestion.cardId)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {!loading && suggestions.length > 0 && (
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSuggestions}
                className="w-full"
              >
                <ArrowRight className="h-3 w-3 mr-2" />
                Refresh Suggestions
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
