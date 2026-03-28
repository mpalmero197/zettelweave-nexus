import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ExternalLink } from 'lucide-react';
import { ZettelCard } from '@/types/zettel';

interface FocusReadingViewProps {
  card?: ZettelCard | null;
  note?: any | null;
  onClose: () => void;
}

export function FocusReadingView({ card, note, onClose }: FocusReadingViewProps) {
  const title = card?.title || note?.title || 'Untitled';
  const content = card?.content || note?.content || '';
  const tags = card?.tags || note?.tags || [];

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-xl rounded-2xl overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white/90 truncate">{title}</h3>
        <Button size="sm" variant="ghost" onClick={onClose} className="h-6 w-6 p-0 text-white/40 hover:text-white">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {tags.map((tag: string) => (
              <span key={tag} className="px-1.5 py-0.5 text-[10px] rounded bg-white/5 text-white/40">
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
          {content || 'No content available.'}
        </div>
      </ScrollArea>
    </div>
  );
}
