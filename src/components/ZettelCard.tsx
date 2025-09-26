import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { getCategoryInfo } from "@/utils/deweySystem";
import { Calendar, Edit3, Link2, Tag, MoreHorizontal, Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardActionsMenu } from "./CardActionsMenu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ZettelCardProps {
  card: ZettelCardType;
  onEdit?: (card: ZettelCardType) => void;
  onLink?: (card: ZettelCardType) => void;
  onWordHover?: (word: string, element: HTMLElement) => void;
  onDelete?: (card: ZettelCardType) => void;
  onUpdate?: (card: ZettelCardType) => void;
  className?: string;
}

const cardColors = [
  { name: "Blue", value: "210", bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900" },
  { name: "Green", value: "142", bg: "bg-green-50", border: "border-green-200", text: "text-green-900" },
  { name: "Purple", value: "280", bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-900" },
  { name: "Orange", value: "25", bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-900" },
  { name: "Pink", value: "320", bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-900" },
  { name: "Teal", value: "180", bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-900" },
  { name: "Default", value: "", bg: "", border: "", text: "" }
];

export function ZettelCard({ card, onEdit, onLink, onWordHover, onDelete, onUpdate, className }: ZettelCardProps) {
  const categoryInfo = getCategoryInfo(card.category);
  const currentColor = cardColors.find(c => c.value === (card as any).cardColor) || cardColors[6];

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

  const changeCardColor = (colorValue: string) => {
    if (onUpdate) {
      onUpdate({
        ...card,
        cardColor: colorValue
      } as any);
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
        currentColor.bg,
        currentColor.border && `border-l-4 ${currentColor.border}`,
        className
      )}
      style={!currentColor.bg ? {
        borderLeft: `4px solid hsl(var(--category-${categoryInfo.color}))`
      } : undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge 
                variant="outline" 
                className={cn("text-xs font-mono", currentColor.text)}
                style={!currentColor.text ? { 
                  borderColor: `hsl(var(--category-${categoryInfo.color}))`,
                  color: `hsl(var(--category-${categoryInfo.color}))`
                } : undefined}
              >
                {card.number}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {categoryInfo.name}
              </Badge>
            </div>
            <CardTitle className={cn("text-xl md:text-2xl leading-snug mb-1", currentColor.text || "text-foreground")}>
              {card.title}
            </CardTitle>
            {card.description && (
              <p className={cn("text-sm md:text-base line-clamp-3", currentColor.text || "text-muted-foreground")}>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Change card color">
                  <Palette className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {cardColors.map((color) => (
                  <DropdownMenuItem
                    key={color.name}
                    onClick={() => changeCardColor(color.value)}
                    className="flex items-center gap-2"
                  >
                    <div 
                      className={cn("w-4 h-4 rounded border", color.bg, color.border)}
                      style={color.value ? undefined : { backgroundColor: `hsl(var(--category-${categoryInfo.color}))` }}
                    />
                    {color.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
          className={cn("text-[0.95rem] leading-7 line-clamp-6", currentColor.text || "text-foreground/90")}
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