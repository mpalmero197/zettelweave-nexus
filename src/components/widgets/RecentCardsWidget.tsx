import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Star } from "lucide-react";
import { useZettelCards } from "@/hooks/useZettelCards";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { format, isToday, isYesterday } from "date-fns";

interface RecentCardsWidgetProps {
  onEdit?: (card: ZettelCardType) => void;
}

export function RecentCardsWidget({ onEdit }: RecentCardsWidgetProps) {
  const { cards } = useZettelCards();

  const recentCards = cards
    .sort((a, b) => {
      const aDate = new Date(a.updated_at || a.modified).getTime();
      const bDate = new Date(b.updated_at || b.modified).getTime();
      return bDate - aDate;
    })
    .slice(0, 5);

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  return (
    <Card className="glass-card shadow-material-2 hover:shadow-material-3 transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            Recent Zettel Cards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 overflow-y-auto max-h-80">
          {recentCards.length > 0 ? (
            recentCards.map((card) => (
              <div 
                key={card.id} 
                className="group flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 rounded-xl transition-all duration-300 hover:scale-105 cursor-pointer"
                onClick={() => onEdit?.(card)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onEdit?.(card)}
                aria-label={`Open card: ${card.title}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">{card.title}</p>
                  <p className="text-xs text-muted-foreground">{card.number} • {getTimeAgo(card.updated_at || card.modified)}</p>
                </div>
                {card.is_favorite && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground">No cards yet</p>
            </div>
          )}
        </CardContent>
      </Card>
  );
}