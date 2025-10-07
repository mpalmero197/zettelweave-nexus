import { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ZettelCard } from '@/types/zettel';
import { exportCardAsImage, shareToSocial, printCards } from '@/utils/exportUtils';
import { MoreHorizontal, Download, Share2, Printer, Bot, Trash2, Edit3, Copy } from 'lucide-react';
import { AIEditDialog } from './AIEditDialog';
import { SimilarContentDialog } from './SimilarContentDialog';
import { useSimilarContent } from '@/hooks/useSimilarContent';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

interface CardActionsMenuProps {
  card: ZettelCard;
  onEdit?: (card: ZettelCard) => void;
  onDelete?: (card: ZettelCard) => void;
  onUpdate?: (card: ZettelCard) => void;
}

export function CardActionsMenu({ card, onEdit, onDelete, onUpdate }: CardActionsMenuProps) {
  const isMobile = useIsMobile();
  const [showAIEdit, setShowAIEdit] = useState(false);
  const [showSimilarDialog, setShowSimilarDialog] = useState(false);
  const { loading, similarItems, findSimilar, mergeContent } = useSimilarContent();

  const handleExportImage = async () => {
    const cardElement = document.querySelector(`[data-card-id="${card.id}"]`) as HTMLElement;
    if (cardElement) {
      await exportCardAsImage(cardElement, `zettel-${card.number}`);
    }
  };

  const handleFindSimilar = async () => {
    const results = await findSimilar(card.id, 'zettel_card');
    if (results.length > 0) {
      setShowSimilarDialog(true);
    }
  };

  const handleMerge = async (sourceId: string, destinationId: string, mergedContent: string) => {
    await mergeContent(sourceId, destinationId, mergedContent, 'zettel_card');
    toast.success('Content merged successfully');
    // Trigger a refresh by calling onUpdate
    if (onUpdate) {
      const updatedCard = { ...card, content: mergedContent };
      onUpdate(updatedCard);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48" side={isMobile ? "bottom" : "left"}>
          <DropdownMenuItem onClick={() => onEdit?.(card)}>
            <Edit3 className="mr-2 h-4 w-4" />
            Edit Card
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => setShowAIEdit(true)}>
            <Bot className="mr-2 h-4 w-4" />
            AI Edit
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleFindSimilar} disabled={loading}>
            <Copy className="mr-2 h-4 w-4" />
            {loading ? 'Searching...' : 'Find Similar'}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleExportImage}>
            <Download className="mr-2 h-4 w-4" />
            Export as Image
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => printCards([card])}>
            <Printer className="mr-2 h-4 w-4" />
            Print Card
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => shareToSocial(card, 'twitter')}>
            <Share2 className="mr-2 h-4 w-4" />
            Share to Twitter
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => shareToSocial(card, 'linkedin')}>
            <Share2 className="mr-2 h-4 w-4" />
            Share to LinkedIn
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => shareToSocial(card, 'facebook')}>
            <Share2 className="mr-2 h-4 w-4" />
            Share to Facebook
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => onDelete?.(card)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Card
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showAIEdit && (
        <AIEditDialog
          card={card}
          onCardUpdate={(updatedCard) => {
            onUpdate?.(updatedCard);
            setShowAIEdit(false);
          }}
          trigger={null}
        />
      )}

      <SimilarContentDialog
        open={showSimilarDialog}
        onOpenChange={setShowSimilarDialog}
        currentItem={{
          id: card.id,
          title: card.title,
          content: card.content,
          created_at: card.created,
          type: 'zettel_card'
        }}
        similarItems={similarItems}
        onMerge={handleMerge}
      />
    </>
  );
}