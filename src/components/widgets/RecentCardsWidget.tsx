import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Star, ArrowUpRight } from "lucide-react";
import { useZettelCards } from "@/hooks/useZettelCards";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { format, isToday, isYesterday } from "date-fns";

interface RecentCardsWidgetProps {
  onEdit?: (card: ZettelCardType) => void;
}

export function RecentCardsWidget({ onEdit }: RecentCardsWidgetProps) {
  const { cards } = useZettelCards();

  const recentCards = cards
    .sort((a, b) => new Date(b.updated_at || b.modified).getTime() - new Date(a.updated_at || a.modified).getTime())
    .slice(0, 5);

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
          <Brain className="h-3.5 w-3.5" aria-hidden="true" />
          Recent Cards
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0.5 overflow-y-auto max-h-72">
        {recentCards.length > 0 ? (
          recentCards.map((card) => (
            <button
              key={card.id}
              className="w-full flex items-center justify-between p-2.5 hover:bg-accent/50 rounded-md transition-colors text-left group"
              onClick={() => onEdit?.(card)}
              aria-label={`Open card: ${card.title}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{card.title}</p>
                <p className="text-xs text-muted-foreground">{card.number} · {getTimeAgo(card.updated_at || card.modified)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {card.is_favorite && <Star className="h-3 w-3 text-foreground fill-foreground" aria-label="Favorited" />}
                <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-8">
            <Brain className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No cards yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
