import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { getCategoryInfo } from "@/utils/deweySystem";
import { Calendar, Edit3, Link2, Tag, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardActionsMenu } from "./CardActionsMenu";

interface ZettelCardProps {
  card: ZettelCardType;
  onEdit?: (card: ZettelCardType) => void;
  onLink?: (card: ZettelCardType) => void;
  onWordHover?: (word: string, element: HTMLElement) => void;
  onDelete?: (card: ZettelCardType) => void;
  onUpdate?: (card: ZettelCardType) => void;
  className?: string;
}

export function ZettelCard({ card, onEdit, onLink, onWordHover, onDelete, onUpdate, className }: ZettelCardProps) {
  const categoryInfo = getCategoryInfo(card.category);

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent click when clicking on buttons or interactive elements
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    // Trigger the onEdit callback to open the card viewer
    onEdit?.(card);
  };

  const handleWordHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'SPAN' && target.dataset.word) {
      onWordHover?.(target.dataset.word, target);
    }
  };

  const renderContentWithHoverWords = (content: string) => {
    // Split content into words and wrap each in a span for hover detection
    return content.split(/(\s+)/).map((part, index) => {
      if (part.trim() && part.match(/^[a-zA-Z]+$/)) {
        return (
          <span 
            key={index}
            data-word={part.toLowerCase()}
            className="hover:bg-accent/20 hover:rounded-sm cursor-help transition-colors"
            onMouseEnter={handleWordHover}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <Card
      data-card-id={card.id}
      onClick={handleCardClick}
      className={cn(
        "group rounded-xl bg-card shadow-card hover:shadow-hover transition-all duration-200 animate-fade-in cursor-pointer",
        "border border-border/60 dark:border-border/50",
        "hover:scale-[1.02] hover:shadow-glow",
        className
      )}
      style={{
        borderLeft: `4px solid hsl(var(--category-${categoryInfo.color}))`
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                variant="outline" 
                className="text-xs font-mono"
                style={{ 
                  borderColor: `hsl(var(--category-${categoryInfo.color}))`,
                  color: `hsl(var(--category-${categoryInfo.color}))`
                }}
              >
                {card.number}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {categoryInfo.name}
              </Badge>
            </div>
            <CardTitle className="text-xl md:text-2xl leading-snug mb-1 text-foreground">
              {card.title}
            </CardTitle>
            {card.description && (
              <p className="text-sm md:text-base text-muted-foreground line-clamp-3">
                {card.description}
              </p>
            )}
          </div>
          <div className="flex gap-1 text-muted-foreground">
            <Button variant="ghost" size="sm" onClick={() => onEdit?.(card)} aria-label="Edit card" className="hover:text-foreground">
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onLink?.(card)} aria-label="Link card" className="hover:text-foreground">
              <Link2 className="h-4 w-4" />
            </Button>
            <CardActionsMenu
              card={card}
              onEdit={onEdit}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div 
          className="text-[0.95rem] leading-7 text-foreground/90 line-clamp-6"
          onMouseMove={handleWordHover}
        >
          {renderContentWithHoverWords(card.content)}
        </div>
        
        {/* Media display */}
        {(card.imageUrl || card.videoUrl) && (
          <div className="space-y-2">
            {card.imageUrl && (
              <img 
                src={card.imageUrl} 
                alt="Card image" 
                className="w-full max-h-48 object-cover rounded-md border"
              />
            )}
            {card.videoUrl && (
              <video 
                src={card.videoUrl} 
                controls 
                className="w-full max-h-48 object-cover rounded-md border"
              />
            )}
          </div>
        )}
        
        {card.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Tag className="h-3 w-3 text-muted-foreground" />
            {card.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(card.created).toLocaleDateString()}
          </div>
          {card.linkedCards.length > 0 && (
            <div className="flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              {card.linkedCards.length} links
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}