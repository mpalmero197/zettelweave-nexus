import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { getCategoryInfo } from "@/utils/deweySystem";
import { Calendar, Edit3, Link2, Tag, Share2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { AttachmentDisplay } from "./AttachmentDisplay";
import { EditCardDialog } from "./EditCardDialog";
import { LinkedItemsPanel } from "./LinkedItemsPanel";
import { supabase } from "@/integrations/supabase/client";

interface LinkedCardInfo {
  id: string;
  number: string;
  title: string;
  category: string;
}

interface CardViewerProps {
  card: ZettelCardType | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (card: ZettelCardType) => void;
  onUpdate?: (card: ZettelCardType) => void;
  onDelete?: (card: ZettelCardType) => void;
  onNavigateToCard?: (cardId: string) => void;
}

export function CardViewer({ card, isOpen, onClose, onEdit, onUpdate, onDelete, onNavigateToCard }: CardViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [linkedCardsInfo, setLinkedCardsInfo] = useState<LinkedCardInfo[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  
  useEffect(() => {
    const fetchLinkedCards = async () => {
      if (!card || !card.linkedCards || card.linkedCards.length === 0) {
        setLinkedCardsInfo([]);
        return;
      }

      setLoadingLinks(true);
      try {
        const { data, error } = await supabase
          .from('zettel_cards')
          .select('id, number, title, category')
          .in('id', card.linkedCards);

        if (error) throw error;
        
        setLinkedCardsInfo(data || []);
      } catch (error) {
        console.error('Error fetching linked cards:', error);
        setLinkedCardsInfo([]);
      } finally {
        setLoadingLinks(false);
      }
    };

    if (isOpen) {
      fetchLinkedCards();
    }
  }, [card, isOpen]);
  
  if (!card) return null;

  const categoryInfo = getCategoryInfo(card.category);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = (updatedCard: ZettelCardType) => {
    onUpdate?.(updatedCard);
    setIsEditing(false);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: card.title,
          text: card.description || card.content.substring(0, 100) + "...",
          url: window.location.href
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(`${card.title}\n\n${card.description || card.content}`);
    }
  };

  return (
    <>
      <Dialog open={isOpen && !isEditing} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden bg-card border border-border shadow-hover">
          <DialogTitle className="sr-only">{card.title}</DialogTitle>
          <DialogDescription className="sr-only">{card.description || 'Card details'}</DialogDescription>
          {/* Header */}
          <div className="flex items-start justify-between p-8 pb-6 border-b border-border/20 bg-muted/30 backdrop-blur-sm">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <Badge 
                  variant="outline" 
                  className="text-sm font-mono px-3 py-1 border-2 bg-background"
                  style={{ 
                    borderColor: `hsl(var(--category-${categoryInfo.color}))`,
                    color: `hsl(var(--category-${categoryInfo.color}))`
                  }}
                >
                  {card.number}
                </Badge>
                <Badge variant="secondary" className="text-sm px-3 py-1 bg-secondary text-secondary-foreground">
                  {categoryInfo.name}
                </Badge>
              </div>
              
              <h1 className="text-4xl font-bold leading-tight text-foreground">
                {card.title}
              </h1>
              
              {card.description && (
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {card.description}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2 ml-6">
              <Button variant="ghost" size="sm" onClick={handleShare} className="hover:bg-primary/10 text-muted-foreground hover:text-primary">
                <Share2 className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleEdit} className="hover:bg-primary/10 text-muted-foreground hover:text-primary">
                <Edit3 className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1 max-h-[60vh]">
            <div className="p-8 space-y-8">
              {/* Main Content */}
              <div className="prose prose-lg max-w-none">
                <div className="text-foreground leading-8 whitespace-pre-wrap">
                  {card.content}
                </div>
              </div>

              {/* Media */}
              {(card.imageUrl || card.videoUrl) && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-foreground">Media</h3>
                  <div className="grid gap-4">
                    {card.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-border shadow-sm">
                        <img 
                          src={card.imageUrl} 
                          alt="Card media" 
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    )}
                    {card.videoUrl && (
                      <div className="rounded-xl overflow-hidden border border-border shadow-sm">
                        <video 
                          src={card.videoUrl} 
                          controls 
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Attachments */}
              {/* Note: Attachments will be implemented when the type is updated */}

              {/* Tags */}
              {card.tags.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-foreground">Tags</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    {card.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-sm hover:bg-primary/10 transition-colors bg-background">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Linked Items (backlinks + outgoing + siblings + related) */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Linked Items
                </h3>
                <LinkedItemsPanel
                  itemId={card.id}
                  itemType="card"
                  itemTitle={card.title}
                  category={card.category}
                  tags={card.tags}
                  outgoingIds={card.linkedCards}
                  onNavigate={(id, type) => {
                    if (type === "card") onNavigateToCard?.(id);
                  }}
                />
              </div>

              {/* Metadata */}
              <div className="border-t border-border/20 pt-6 space-y-4">
                <h3 className="text-xl font-semibold text-foreground">Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Created: {new Date(card.created).toLocaleDateString(undefined, { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Modified: {new Date(card.modified).toLocaleDateString(undefined, { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <EditCardDialog
        card={card}
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        onSave={handleSave}
      />
    </>
  );
}