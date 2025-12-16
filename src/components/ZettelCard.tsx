import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { getCategoryInfo } from "@/utils/deweySystem";
import { Calendar, Edit3, Link2, Tag, MoreHorizontal, Palette, Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardActionsMenu } from "./CardActionsMenu";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";

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
  { name: "Blue", value: "210", bg: "bg-blue-500", border: "border-blue-600", text: "text-white" },
  { name: "Green", value: "142", bg: "bg-green-500", border: "border-green-600", text: "text-white" },
  { name: "Purple", value: "280", bg: "bg-purple-500", border: "border-purple-600", text: "text-white" },
  { name: "Orange", value: "25", bg: "bg-orange-500", border: "border-orange-600", text: "text-white" },
  { name: "Pink", value: "320", bg: "bg-pink-500", border: "border-pink-600", text: "text-white" },
  { name: "Teal", value: "180", bg: "bg-teal-500", border: "border-teal-600", text: "text-white" },
  { name: "Red", value: "0", bg: "bg-red-500", border: "border-red-600", text: "text-white" },
  { name: "Yellow", value: "60", bg: "bg-yellow-500", border: "border-yellow-600", text: "text-gray-900" },
  { name: "Default", value: "", bg: "", border: "", text: "" }
];

export function ZettelCard({ card, onEdit, onLink, onWordHover, onDelete, onUpdate, className }: ZettelCardProps) {
  const categoryInfo = getCategoryInfo(card.category);
  const currentColor = cardColors.find(c => c.value === card.cardColor) || cardColors[cardColors.length - 1];
  const [globalDictionaryEnabled, setGlobalDictionaryEnabled] = useState(() => {
    const stored = localStorage.getItem('globalDictionaryEnabled');
    return stored !== null ? stored === 'true' : true;
  });

  // Check if card is "new" (created within last 24 hours)
  const isNewCard = () => {
    const createdDate = new Date(card.created);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

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
      });
    }
  };

  const toggleFavorite = () => {
    if (onUpdate) {
      onUpdate({
        ...card,
        is_favorite: !card.is_favorite
      });
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
        "group rounded-xl shadow-card hover:shadow-hover transition-all duration-300 animate-fade-in-up cursor-pointer overflow-hidden",
        "border border-border/60 dark:border-border/50",
        "hover:-translate-y-1 hover:shadow-glow backdrop-blur-sm",
        currentColor.bg || "bg-card/80",
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
            <div className="flex flex-col gap-1.5 mb-2">
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs font-mono",
                    currentColor.text && "border-primary/30 bg-primary/10"
                  )}
                  style={!currentColor.text ? { 
                    borderColor: `hsl(var(--category-${categoryInfo.color}))`,
                    color: `hsl(var(--category-${categoryInfo.color}))`
                  } : undefined}
                >
                  {card.number}
                </Badge>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-xs",
                    currentColor.text && "border-primary/30 bg-primary/20"
                  )}
                  style={!currentColor.bg ? {
                    backgroundColor: `hsl(var(--category-${categoryInfo.color}) / 0.15)`,
                    color: `hsl(var(--category-${categoryInfo.color}))`
                  } : undefined}
                >
                  {categoryInfo.name}
                </Badge>
                {isNewCard() && (
                  <Badge 
                    variant="default" 
                    className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white animate-pulse"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    New
                  </Badge>
                )}
              </div>
              {/* Display detailed Dewey classification if available */}
              {card.category && card.category.includes('-') && (
                <p className={cn(
                  "text-xs italic",
                  currentColor.text ? `${currentColor.text} opacity-90` : "text-muted-foreground"
                )}>
                  {card.category}
                </p>
              )}
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
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); toggleFavorite(); }} 
              aria-label={card.is_favorite ? "Remove from favorites" : "Add to favorites"} 
              className={cn("hover:bg-accent/50", card.is_favorite ? "text-yellow-500" : (currentColor.text || "text-muted-foreground hover:text-foreground"))}
            >
              <Star className={cn("h-4 w-4", card.is_favorite && "fill-yellow-500")} />
            </Button>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onEdit?.(card); }} aria-label="Edit card" className={cn("hover:bg-accent/50", currentColor.text || "text-muted-foreground hover:text-foreground")}>
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onLink?.(card); }} aria-label="Link card" className={cn("hover:bg-accent/50", currentColor.text || "text-muted-foreground hover:text-foreground")}>
              <Link2 className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" aria-label="Change card color" onClick={(e) => e.stopPropagation()} className={cn("hover:bg-accent/20", currentColor.text || "text-muted-foreground")}>
                  <Palette className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end"  className="z-50 bg-popover/95 backdrop-blur-sm"  onClick={(e) => e.stopPropagation()}>
                {cardColors.map((color) => (
                  <DropdownMenuItem
                    key={color.name}
                    onClick={(e) => {
                      e.stopPropagation();
                      changeCardColor(color.value);
                    }}
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
          onMouseMove={globalDictionaryEnabled ? handleWordHover : undefined}
        >
          {globalDictionaryEnabled ? renderContentWithHoverWords(card.content) : card.content}
        </div>
        
        {/* Media display */}
        {(card.image_url || card.video_url) && (
          <div className="space-y-2">
            {card.image_url && (
              <img 
                src={card.image_url} 
                alt="Card image" 
                className="w-full max-h-48 object-cover rounded-md border"
              />
            )}
            {card.video_url && (
              <video 
                src={card.video_url} 
                controls 
                className="w-full max-h-48 object-cover rounded-md border"
              />
            )}
          </div>
        )}
        
        {card.tags && card.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            <Tag className={cn("h-3 w-3", currentColor.text ? "opacity-80" : "text-muted-foreground")} />
            {card.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className={cn("text-xs", currentColor.text && "border-primary/30 bg-primary/10")}>
                {tag}
              </Badge>
            ))}
          </div>
        )}
        
        <div className={cn("flex items-center justify-between text-xs pt-2 border-t", currentColor.text ? "border-primary/20 opacity-80" : "text-muted-foreground border-border/50")}>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(card.created).toLocaleDateString()}
          </div>
          {card.linkedCards && card.linkedCards.length > 0 && (
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