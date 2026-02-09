import { useState, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { X, ChevronDown, ChevronUp, Replace, CaseSensitive } from 'lucide-react';

interface CatalystFindReplaceProps {
  open: boolean;
  onClose: () => void;
  content: string;
  onReplace: (searchTerm: string, replaceTerm: string, replaceAll: boolean) => void;
  onHighlight: (searchTerm: string, caseSensitive: boolean) => void;
}

export function CatalystFindReplace({ open, onClose, content, onReplace, onHighlight }: CatalystFindReplaceProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [matchCount, setMatchCount] = useState(0);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setMatchCount(0);
      onHighlight('', false);
      return;
    }

    const plainText = content.replace(/<[^>]*>/g, '');
    const flags = caseSensitive ? 'g' : 'gi';
    const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = plainText.match(new RegExp(escaped, flags));
    setMatchCount(matches ? matches.length : 0);
    onHighlight(searchTerm, caseSensitive);
  }, [searchTerm, caseSensitive, content, onHighlight]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
      }
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="absolute top-14 right-4 z-20 bg-background border rounded-lg shadow-lg p-3 w-80 space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Find..."
          className="h-8 text-sm flex-1"
          autoFocus
        />
        <Toggle
          size="sm"
          pressed={caseSensitive}
          onPressedChange={setCaseSensitive}
          className="h-8 w-8 p-0"
          title="Case sensitive"
        >
          <CaseSensitive className="h-3.5 w-3.5" />
        </Toggle>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setShowReplace(!showReplace)}
          title="Toggle replace"
        >
          <Replace className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {searchTerm && (
        <p className="text-xs text-muted-foreground">
          {matchCount} {matchCount === 1 ? 'match' : 'matches'} found
        </p>
      )}

      {showReplace && (
        <div className="flex items-center gap-2">
          <Input
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            placeholder="Replace with..."
            className="h-8 text-sm flex-1"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onReplace(searchTerm, replaceTerm, false)}
            disabled={!searchTerm || matchCount === 0}
          >
            Replace
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onReplace(searchTerm, replaceTerm, true)}
            disabled={!searchTerm || matchCount === 0}
          >
            All
          </Button>
        </div>
      )}
    </div>
  );
}
