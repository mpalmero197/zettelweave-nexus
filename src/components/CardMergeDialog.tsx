import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, X, AlertCircle } from "lucide-react";
import { ZettelCard } from "@/types/zettel";
import { sanitizeCardInput } from "@/utils/security";

interface Difference {
  type: 'identical' | 'similar' | 'unique-card1' | 'unique-card2';
  card1Text: string;
  card2Text: string;
  similarity?: number;
  selectedVersion?: 1 | 2;
}

interface CardMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card1: Partial<ZettelCard>;
  card2: Partial<ZettelCard>;
  onMerge: (mergedCard: Partial<ZettelCard>) => void;
  onSkip: () => void;
}

export const CardMergeDialog = ({
  open,
  onOpenChange,
  card1,
  card2,
  onMerge,
  onSkip
}: CardMergeDialogProps) => {
  const [differences, setDifferences] = useState<Difference[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<Map<number, 1 | 2>>(new Map());

  useEffect(() => {
    if (card1 && card2) {
      analyzeDifferences();
    }
  }, [card1, card2]);

  const analyzeDifferences = () => {
    const content1 = card1.content || '';
    const content2 = card2.content || '';
    
    // Split into sentences
    const sentences1 = content1.split(/[.!?]\s+/).filter(s => s.trim());
    const sentences2 = content2.split(/[.!?]\s+/).filter(s => s.trim());
    
    const diffs: Difference[] = [];
    const used2 = new Set<number>();
    
    // Find identical and similar sentences
    sentences1.forEach((sent1, idx1) => {
      let bestMatch = -1;
      let bestSimilarity = 0;
      
      sentences2.forEach((sent2, idx2) => {
        if (used2.has(idx2)) return;
        
        const similarity = calculateSimilarity(sent1, sent2);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = idx2;
        }
      });
      
      if (bestSimilarity === 1) {
        // Identical
        diffs.push({
          type: 'identical',
          card1Text: sent1,
          card2Text: sentences2[bestMatch],
          selectedVersion: 1
        });
        used2.add(bestMatch);
      } else if (bestSimilarity > 0.7) {
        // Similar
        diffs.push({
          type: 'similar',
          card1Text: sent1,
          card2Text: sentences2[bestMatch],
          similarity: bestSimilarity,
          selectedVersion: sent1.length >= sentences2[bestMatch].length ? 1 : 2
        });
        used2.add(bestMatch);
      } else {
        // Unique to card1
        diffs.push({
          type: 'unique-card1',
          card1Text: sent1,
          card2Text: '',
          selectedVersion: 1
        });
      }
    });
    
    // Find sentences unique to card2
    sentences2.forEach((sent2, idx) => {
      if (!used2.has(idx)) {
        diffs.push({
          type: 'unique-card2',
          card1Text: '',
          card2Text: sent2,
          selectedVersion: 2
        });
      }
    });
    
    setDifferences(diffs);
    
    // Initialize selections
    const selections = new Map<number, 1 | 2>();
    diffs.forEach((diff, idx) => {
      if (diff.selectedVersion) {
        selections.set(idx, diff.selectedVersion);
      }
    });
    setSelectedVersions(selections);
  };

  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    
    const words1 = new Set(s1.split(/\s+/));
    const words2 = new Set(s2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  };

  const toggleVersion = (diffIndex: number) => {
    const current = selectedVersions.get(diffIndex);
    const newVersion = current === 1 ? 2 : 1;
    setSelectedVersions(new Map(selectedVersions.set(diffIndex, newVersion)));
  };

  const handleMerge = () => {
    const mergedSentences: string[] = [];
    const uniqueDifferences: string[] = [];
    
    differences.forEach((diff, idx) => {
      const selected = selectedVersions.get(idx);
      
      if (diff.type === 'identical') {
        mergedSentences.push(diff.card1Text);
      } else if (diff.type === 'similar') {
        const chosenText = selected === 1 ? diff.card1Text : diff.card2Text;
        mergedSentences.push(chosenText);
        
        // Add the unchosen version to differences section
        const unchosenText = selected === 1 ? diff.card2Text : diff.card1Text;
        if (unchosenText !== chosenText) {
          uniqueDifferences.push(`• ${unchosenText}`);
        }
      } else if (diff.type === 'unique-card1' && selected === 1) {
        mergedSentences.push(diff.card1Text);
      } else if (diff.type === 'unique-card2' && selected === 2) {
        mergedSentences.push(diff.card2Text);
      }
    });
    
    let mergedContent = mergedSentences.join('. ') + '.';
    
    if (uniqueDifferences.length > 0) {
      mergedContent += '\n\n--- Alternative versions ---\n' + uniqueDifferences.join('\n');
    }
    
    // Sanitize merged content
    const sanitizedContent = sanitizeCardInput(mergedContent);
    
    // Determine which card has more comprehensive information
    const card1WordCount = (card1.content || '').split(/\s+/).length;
    const card2WordCount = (card2.content || '').split(/\s+/).length;
    const baseCard = card1WordCount >= card2WordCount ? card1 : card2;
    
    const mergedCard: Partial<ZettelCard> = {
      ...baseCard,
      content: sanitizedContent,
      title: sanitizeCardInput(card1.title || card2.title || 'Merged Card'),
      tags: [...new Set([...(card1.tags || []), ...(card2.tags || [])])].slice(0, 50),
      linkedCards: [...new Set([...(card1.linkedCards || []), ...(card2.linkedCards || [])])].slice(0, 100)
    };
    
    onMerge(mergedCard);
    onOpenChange(false);
  };

  const identicalCount = differences.filter(d => d.type === 'identical').length;
  const similarCount = differences.filter(d => d.type === 'similar').length;
  const uniqueCount = differences.length - identicalCount - similarCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Merge Similar Cards
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">{identicalCount} Identical</Badge>
            <Badge variant="outline">{similarCount} Similar</Badge>
            <Badge variant="outline">{uniqueCount} Unique</Badge>
          </div>

          {/* Card Headers */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-3 bg-primary/5">
              <h3 className="font-semibold text-sm">{card1.title}</h3>
              <p className="text-xs text-muted-foreground">{card1.number}</p>
            </Card>
            <Card className="p-3 bg-accent/5">
              <h3 className="font-semibold text-sm">{card2.title}</h3>
              <p className="text-xs text-muted-foreground">{card2.number}</p>
            </Card>
          </div>

          <Separator />

          {/* Differences */}
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {differences.map((diff, idx) => {
              const selected = selectedVersions.get(idx);
              
              if (diff.type === 'identical') {
                return (
                  <div key={idx} className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-1" />
                      <p className="text-sm flex-1">{diff.card1Text}</p>
                    </div>
                  </div>
                );
              }
              
              if (diff.type === 'similar') {
                return (
                  <div key={idx} className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span className="text-xs text-muted-foreground">
                        {Math.round((diff.similarity || 0) * 100)}% similar - Choose version:
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => toggleVersion(idx)}
                        className={`p-2 rounded text-left text-sm transition-all ${
                          selected === 1
                            ? 'bg-primary/20 border-2 border-primary'
                            : 'bg-background border border-border hover:bg-accent/10'
                        }`}
                      >
                        {diff.card1Text}
                      </button>
                      <button
                        onClick={() => toggleVersion(idx)}
                        className={`p-2 rounded text-left text-sm transition-all ${
                          selected === 2
                            ? 'bg-primary/20 border-2 border-primary'
                            : 'bg-background border border-border hover:bg-accent/10'
                        }`}
                      >
                        {diff.card2Text}
                      </button>
                    </div>
                  </div>
                );
              }
              
              return (
                <div key={idx} className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="flex items-start gap-2">
                    <Badge variant="outline" className="mt-1">
                      {diff.type === 'unique-card1' ? 'Card 1 only' : 'Card 2 only'}
                    </Badge>
                    <p className="text-sm flex-1">{diff.card1Text || diff.card2Text}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={onSkip}>
              Skip
            </Button>
            <Button onClick={handleMerge}>
              Merge Cards
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
