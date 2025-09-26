import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Plus, X } from "lucide-react";
import { WordDefinition } from "@/types/zettel";

interface WordDefinitionPopoverProps {
  word: string;
  position: { x: number; y: number };
  onClose: () => void;
  onCreateCard: (word: string, definition: WordDefinition) => void;
  cards?: any[];
}

// Enhanced definition lookup with primary card search
const getMockDefinition = async (word: string, cards: any[] = []): Promise<WordDefinition> => {
  // First check if there's a primary card with this title
  const primaryCard = cards.find(card => 
    card.title.toLowerCase() === word.toLowerCase() ||
    card.title.toLowerCase().includes(word.toLowerCase())
  );

  if (primaryCard) {
    return {
      word,
      definition: primaryCard.content.substring(0, 200) + (primaryCard.content.length > 200 ? "..." : ""),
      partOfSpeech: "reference",
      examples: [`From your card: "${primaryCard.title}"`],
      cardReference: primaryCard
    };
  }

  // Enhanced dictionary definitions
  const definitions: Record<string, WordDefinition> = {
    "halcyon": {
      word: "halcyon",
      definition: "Denoting a period of time in the past that was idyllically happy and peaceful. Often refers to a mythical bird that was said to charm the wind and waves into calmness.",
      partOfSpeech: "adjective",
      examples: ["Those were the halcyon days of summer.", "She recalled the halcyon period of her youth."]
    },
    "knowledge": {
      word: "knowledge",
      definition: "Facts, information, and skills acquired by a person through experience or education; the theoretical or practical understanding of a subject.",
      partOfSpeech: "noun",
      examples: ["Her knowledge of languages was impressive.", "Scientific knowledge continues to evolve."]
    },
    "learning": {
      word: "learning",
      definition: "The acquisition of knowledge or skills through experience, study, or by being taught.",
      partOfSpeech: "noun",
      examples: ["Machine learning algorithms", "Learning is a lifelong process"]
    },
    "system": {
      word: "system",
      definition: "A set of connected things or parts forming a complex whole; an organized scheme or method.",
      partOfSpeech: "noun",
      examples: ["The education system", "A computer system"]
    },
    "zettel": {
      word: "zettel",
      definition: "German word meaning 'slip of paper' or 'note'. In knowledge management, refers to individual notes in a zettelkasten system.",
      partOfSpeech: "noun",
      examples: ["Each zettel should contain one main idea.", "Connect related zettel to build knowledge networks."]
    }
  };

  return definitions[word.toLowerCase()] || {
    word,
    definition: `Definition for "${word}" - A concept or term that may benefit from further exploration and note-taking.`,
    partOfSpeech: "unknown",
    examples: []
  };
};

export function WordDefinitionPopover({ word, position, onClose, onCreateCard, cards = [] }: WordDefinitionPopoverProps) {
  const [definition, setDefinition] = useState<WordDefinition | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDefinition = async () => {
      setLoading(true);
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      const def = await getMockDefinition(word, cards);
      setDefinition(def);
      setLoading(false);
    };

    fetchDefinition();
  }, [word, cards]);

  const handleCreateCard = () => {
    if (definition) {
      onCreateCard(word, definition);
      onClose();
    }
  };

  return (
    <div 
      className="fixed z-50 w-80"
      style={{
        left: Math.min(position.x, window.innerWidth - 320),
        top: Math.min(position.y + 20, window.innerHeight - 300),
      }}
    >
      <Card className="shadow-hover border border-border bg-card animate-in slide-in-from-top-2 duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <CardTitle className="text-base capitalize">{word}</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {loading ? (
            <div className="space-y-2">
              <div className="h-4 bg-muted animate-pulse rounded"></div>
              <div className="h-4 bg-muted animate-pulse rounded w-3/4"></div>
            </div>
          ) : definition ? (
            <>
              <div className="space-y-2">
                <Badge variant="outline" className="text-xs">
                  {definition.partOfSpeech}
                </Badge>
                <p className="text-sm leading-relaxed">
                  {definition.definition}
                </p>
              </div>
              
              {definition.examples && definition.examples.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Examples
                  </h4>
                  <ul className="space-y-1">
                    {definition.examples.map((example, index) => (
                      <li key={index} className="text-xs text-muted-foreground italic">
                        "{example}"
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="flex justify-end pt-2">
                <Button 
                  size="sm" 
                  onClick={handleCreateCard}
                  className="bg-gradient-accent hover:bg-accent-hover"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Create Card
                </Button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Could not load definition for "{word}"
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}