import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { getCategoryInfo } from "@/utils/deweySystem";
import { Calendar, Edit3, Link2, Tag, MoreHorizontal, Palette, Star, Trash2, Download, Share2, Printer, Bot, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { AIEditDialog } from "./AIEditDialog";
import { SimilarContentDialog } from "./SimilarContentDialog";
import { useSimilarContent } from "@/hooks/useSimilarContent";
import { exportCardAsImage, shareToSocial, printCards } from "@/utils/exportUtils";
import { toast } from "sonner";

interface ZettelCardProps {
  card: ZettelCardType;
  onEdit?: (card: ZettelCardType) => void;
  onLink?: (card: ZettelCardType) => void;
  onDelete?: (card: ZettelCardType) => void;
  onUpdate?: (card: ZettelCardType) => void;
  variant?: "default" | "compact";
  className?: string;
}

const cardColors = [
  { name: "Blue", value: "210" },
  { name: "Green", value: "142" },
  { name: "Purple", value: "280" },
  { name: "Orange", value: "25" },
  { name: "Pink", value: "320" },
  { name: "Teal", value: "180" },
  { name: "Red", value: "0" },
  { name: "Yellow", value: "60" },
  { name: "Default", value: "" }
];

const COLOR_MAP: Record<string, string> = {
  "210": "hsl(210 70% 55%)",
  "142": "hsl(142 60% 45%)",
  "280": "hsl(280 60% 55%)",
  "25": "hsl(25 90% 55%)",
  "320": "hsl(320 60% 55%)",
  "180": "hsl(180 55% 42%)",
  "0": "hsl(0 70% 55%)",
  "60": "hsl(60 80% 48%)",
};

function getRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ZettelCard({ card, onEdit, onLink, onDelete, onUpdate, variant = "default", className }: ZettelCardProps) {
  const categoryInfo = getCategoryInfo(card.category);
  const [showAIEdit, setShowAIEdit] = useState(false);
  const [showSimilarDialog, setShowSimilarDialog] = useState(false);
  const { loading: similarLoading, similarItems, findSimilar, mergeContent } = useSimilarContent();

  const isNew = () => {
    const h = (Date.now() - new Date(card.created).getTime()) / 3600000;
    return h <= 24;
  };

  const topBorderColor = card.cardColor && COLOR_MAP[card.cardColor]
    ? COLOR_MAP[card.cardColor]
    : `hsl(var(--category-${categoryInfo.color}))`;

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, [role="menuitem"]')) return;
    onEdit?.(card);
  };

  const toggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate?.({ ...card, is_favorite: !card.is_favorite });
  };

  const changeCardColor = (colorValue: string) => {
    onUpdate?.({ ...card, cardColor: colorValue });
  };

  const handleExportImage = async () => {
    const el = document.querySelector(`[data-card-id="${card.id}"]`) as HTMLElement;
    if (el) await exportCardAsImage(el, `zettel-${card.number}`);
  };

  const handleFindSimilar = async () => {
    const results = await findSimilar(card.id, 'zettel_card');
    if (results.length > 0) setShowSimilarDialog(true);
  };

  const handleMerge = async (sourceId: string, destinationId: string, mergedContent: string) => {
    await mergeContent(sourceId, destinationId, mergedContent, 'zettel_card');
    toast.success('Content merged successfully');
    onUpdate?.({ ...card, content: mergedContent });
  };

  const visibleTags = card.tags?.slice(0, 2) || [];
  const extraTags = (card.tags?.length || 0) - 2;

  // ─── Compact list variant ───
  if (variant === "compact") {
    return (
      <>
        <div
          data-card-id={card.id}
          onClick={handleCardClick}
          className={cn(
            "group flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors",
            "bg-card/80 backdrop-blur-sm border border-border/40 hover:bg-accent/30",
            className
          )}
        >
          {/* Category dot */}
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: topBorderColor }} />

          {/* Title */}
          <span className="text-sm font-medium truncate flex-1 text-foreground">{card.title}</span>

          {/* Tags */}
          {visibleTags.length > 0 && (
            <div className="hidden sm:flex items-center gap-1">
              {visibleTags.map((tag, i) => (
                <span key={i} className="text-[0.65rem] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{tag}</span>
              ))}
              {extraTags > 0 && <span className="text-[0.65rem] text-muted-foreground">+{extraTags}</span>}
            </div>
          )}

          {/* Date */}
          <span className="text-[0.65rem] text-muted-foreground shrink-0 tabular-nums">{getRelativeDate(card.created)}</span>

          {/* New dot */}
          {isNew() && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}

          {/* Favorite star (only when favorited) */}
          {card.is_favorite && (
            <button onClick={toggleFavorite} className="shrink-0 text-yellow-500">
              <Star className="h-3.5 w-3.5 fill-yellow-500" />
            </button>
          )}

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onEdit?.(card)}><Edit3 className="mr-2 h-3.5 w-3.5" />View / Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleFavorite(e as any); }}>
                <Star className="mr-2 h-3.5 w-3.5" />{card.is_favorite ? "Unfavorite" : "Favorite"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onLink?.(card)}><Link2 className="mr-2 h-3.5 w-3.5" />Link</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete?.(card)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {showAIEdit && (
          <AIEditDialog card={card} onCardUpdate={(c) => { onUpdate?.(c); setShowAIEdit(false); }} trigger={null} />
        )}
        <SimilarContentDialog
          open={showSimilarDialog} onOpenChange={setShowSimilarDialog}
          currentItem={{ id: card.id, title: card.title, content: card.content, created_at: card.created, type: 'zettel_card' }}
          similarItems={similarItems} onMerge={handleMerge}
        />
      </>
    );
  }

  // ─── Default grid card ───
  return (
    <>
      <div
        data-card-id={card.id}
        onClick={handleCardClick}
        className={cn(
          "widget-card group relative rounded-xl cursor-pointer overflow-hidden transition-shadow hover:shadow-md",
          className
        )}
        style={{ borderTop: `3px solid ${topBorderColor}` }}
      >
        <div className="p-3 sm:p-4 space-y-2">
          {/* Header row: title + actions */}
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                {/* New dot */}
                {isNew() && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                <h3 className="text-sm font-semibold truncate text-foreground">{card.title}</h3>
              </div>
              {card.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">{card.description}</p>
              )}
            </div>

            {/* Inline favorite (only when favorited) */}
            {card.is_favorite && (
              <button onClick={toggleFavorite} className="shrink-0 mt-0.5 text-yellow-500 hover:text-yellow-400 transition-colors">
                <Star className="h-3.5 w-3.5 fill-yellow-500" />
              </button>
            )}

            {/* Actions dropdown - visible on hover or always on mobile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 z-50 bg-popover/95 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => onEdit?.(card)}>
                  <Edit3 className="mr-2 h-3.5 w-3.5" />View / Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleFavorite(e as any); }}>
                  <Star className="mr-2 h-3.5 w-3.5" />{card.is_favorite ? "Unfavorite" : "Favorite"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onLink?.(card)}>
                  <Link2 className="mr-2 h-3.5 w-3.5" />Link Cards
                </DropdownMenuItem>

                {/* Color submenu */}
                <DropdownMenuSeparator />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Palette className="mr-2 h-3.5 w-3.5" />Change Color
                    </DropdownMenuItem>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="left" className="w-36 z-[60] bg-popover/95 backdrop-blur-sm">
                    {cardColors.map((color) => (
                      <DropdownMenuItem key={color.name} onClick={() => changeCardColor(color.value)} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: color.value ? (COLOR_MAP[color.value] || "hsl(var(--muted))") : `hsl(var(--category-${categoryInfo.color}))` }} />
                        <span className="text-xs">{color.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowAIEdit(true)}>
                  <Bot className="mr-2 h-3.5 w-3.5" />AI Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleFindSimilar} disabled={similarLoading}>
                  <Copy className="mr-2 h-3.5 w-3.5" />{similarLoading ? "Searching..." : "Find Similar"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportImage}>
                  <Download className="mr-2 h-3.5 w-3.5" />Export Image
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => printCards([card])}>
                  <Printer className="mr-2 h-3.5 w-3.5" />Print
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => shareToSocial(card, 'twitter')}>
                  <Share2 className="mr-2 h-3.5 w-3.5" />Share Twitter
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => shareToSocial(card, 'linkedin')}>
                  <Share2 className="mr-2 h-3.5 w-3.5" />Share LinkedIn
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete?.(card)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Content preview */}
          <p className="text-[0.8rem] leading-relaxed line-clamp-3 text-foreground/80">{card.content}</p>

          {/* Media */}
          {(card.image_url || card.video_url) && (
            <div className="space-y-1.5">
              {card.image_url && (
                <img src={card.image_url} alt="Card image" className="w-full max-h-32 object-cover rounded-md border border-border/40" />
              )}
              {card.video_url && (
                <video src={card.video_url} controls className="w-full max-h-32 object-cover rounded-md border border-border/40" />
              )}
            </div>
          )}

          {/* Tags */}
          {visibleTags.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {visibleTags.map((tag, i) => (
                <span key={i} className="text-[0.65rem] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{tag}</span>
              ))}
              {extraTags > 0 && <span className="text-[0.65rem] text-muted-foreground">+{extraTags}</span>}
            </div>
          )}

          {/* Footer: category dot + number + date + links */}
          <div className="flex items-center gap-2 text-[0.7rem] text-muted-foreground pt-1 border-t border-border/30">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: topBorderColor }} />
            <span className="font-mono">{card.number}</span>
            <span className="text-border">·</span>
            <span className="tabular-nums">{getRelativeDate(card.created)}</span>
            {card.linkedCards && card.linkedCards.length > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="flex items-center gap-0.5">
                  <Link2 className="h-2.5 w-2.5" />{card.linkedCards.length}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {showAIEdit && (
        <AIEditDialog card={card} onCardUpdate={(c) => { onUpdate?.(c); setShowAIEdit(false); }} trigger={null} />
      )}
      <SimilarContentDialog
        open={showSimilarDialog} onOpenChange={setShowSimilarDialog}
        currentItem={{ id: card.id, title: card.title, content: card.content, created_at: card.created, type: 'zettel_card' }}
        similarItems={similarItems} onMerge={handleMerge}
      />
    </>
  );
}
