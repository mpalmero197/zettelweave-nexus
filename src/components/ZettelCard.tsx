import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { getCategoryInfo } from "@/utils/deweySystem";
import { Calendar, Edit3, Link2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface ZettelCardProps {
  card: ZettelCardType;
  onEdit?: (card: ZettelCardType) => void;
  onLink?: (card: ZettelCardType) => void;
  onWordHover?: (word: string, element: HTMLElement) => void;
  className?: string;
}

export function ZettelCard({ card, onEdit, onLink, onWordHover, className }: ZettelCardProps) {
  const categoryInfo = getCategoryInfo(card.category);

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
    <Card className={cn(
      "bg-gradient-card shadow-card hover:shadow-hover transition-all duration-300 group",
      "border-l-4",
      className
    )}
    style={{ 
      borderLeftColor: `hsl(var(--category-${categoryInfo.color}))` 
    }}>
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
            <CardTitle className="text-lg leading-tight mb-1">
              {card.title}
            </CardTitle>
            {card.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {card.description}
              </p>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={() => onEdit?.(card)}>
              <Edit3 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onLink?.(card)}>
              <Link2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div 
          className="text-sm leading-relaxed prose prose-sm max-w-none"
          onMouseMove={handleWordHover}
        >
          {renderContentWithHoverWords(card.content)}
        </div>
        
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
            {card.created.toLocaleDateString()}
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