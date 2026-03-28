import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Globe, BookOpen, ScrollText, Pen } from 'lucide-react';

export type DocumentLayout = 'page' | 'web' | 'book' | 'reading' | 'manuscript';

interface LayoutOption {
  id: DocumentLayout;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  { id: 'page', label: 'Page', description: 'A4 / Letter page with margins', icon: <FileText className="h-3.5 w-3.5" /> },
  { id: 'web', label: 'Web', description: 'Full-width fluid layout', icon: <Globe className="h-3.5 w-3.5" /> },
  { id: 'book', label: 'Book', description: 'Two-page spread with gutter', icon: <BookOpen className="h-3.5 w-3.5" /> },
  { id: 'reading', label: 'Reading', description: 'Narrow serif column for proofing', icon: <ScrollText className="h-3.5 w-3.5" /> },
  { id: 'manuscript', label: 'Manuscript', description: 'Double-spaced Courier for submissions', icon: <Pen className="h-3.5 w-3.5" /> },
];

interface CatalystLayoutSelectorProps {
  value: DocumentLayout;
  onChange: (value: DocumentLayout) => void;
}

export function CatalystLayoutSelector({ value, onChange }: CatalystLayoutSelectorProps) {
  const current = LAYOUT_OPTIONS.find(o => o.id === value);

  return (
    <div className="flex items-center gap-2">
      {current?.icon}
      <Select value={value} onValueChange={(v) => onChange(v as DocumentLayout)}>
        <SelectTrigger className="h-7 w-[130px] text-[11px] bg-background border-border" aria-label="Document layout">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LAYOUT_OPTIONS.map(opt => (
            <SelectItem key={opt.id} value={opt.id} className="text-xs cursor-pointer">
              <div className="flex items-center gap-2">
                {opt.icon}
                <div>
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-muted-foreground ml-1.5">— {opt.description}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
