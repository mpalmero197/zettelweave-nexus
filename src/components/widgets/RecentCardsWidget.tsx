import { Brain, ArrowUpRight } from "lucide-react";
import { useZettelCards } from "@/hooks/useZettelCards";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { formatDistanceToNow } from "date-fns";

interface RecentCardsWidgetProps {
  onEdit?: (card: ZettelCardType) => void;
  onNavigate?: (tab: string) => void;
}

export function RecentCardsWidget({ onEdit, onNavigate }: RecentCardsWidgetProps) {
  const { cards } = useZettelCards();

  const recentCards = cards
    .sort((a, b) => new Date(b.updated_at || b.modified).getTime() - new Date(a.updated_at || a.modified).getTime())
    .slice(0, 4);

  const remaining = Math.max(0, cards.length - 4);

  const timeAgo = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: false });

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="widget-header-left">
          <Brain className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-medium text-foreground">Recent Cards</h3>
        </div>
        {onNavigate && (
          <button className="widget-header-link" onClick={() => onNavigate('cards')}>
            View all →
          </button>
        )}
      </div>
      <div className="widget-body">
        {recentCards.length > 0 ? (
          recentCards.map((card) => (
            <button
              key={card.id}
              className="w-full flex items-center justify-between p-2 hover:bg-accent/50 rounded-md transition-colors text-left group"
              onClick={() => onEdit?.(card)}
              aria-label={`Open card: ${card.title}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{card.title}</p>
                <p className="text-[11px] text-muted-foreground">{card.number} · {timeAgo(card.updated_at || card.modified)} ago</p>
              </div>
              <ArrowUpRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" aria-hidden="true" />
            </button>
          ))
        ) : (
          <p className="text-xs text-muted-foreground py-6 text-center">No cards yet</p>
        )}
      </div>
      {remaining > 0 && (
        <div className="widget-footer">{remaining} more card{remaining !== 1 ? 's' : ''}</div>
      )}
    </div>
  );
}
