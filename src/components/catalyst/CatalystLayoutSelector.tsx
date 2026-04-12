import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Globe, BookOpen, ScrollText, Pen, Printer, Columns2, PanelTop } from 'lucide-react';

export type DocumentLayout = 'web' | 'single-page' | 'two-page' | 'reading' | 'manuscript' | 'print' | 'draft';

interface LayoutOption {
  id: DocumentLayout;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const LAYOUT_OPTIONS: LayoutOption[] = [
  { id: 'web', label: 'Web Layout', description: 'Full-width edge-to-edge writing', icon: <Globe className="h-3.5 w-3.5" /> },
  { id: 'single-page', label: 'Single Page', description: 'Letter/A4 page with margins', icon: <FileText className="h-3.5 w-3.5" /> },
  { id: 'two-page', label: 'Two Page', description: 'Side-by-side page spread', icon: <Columns2 className="h-3.5 w-3.5" /> },
  { id: 'reading', label: 'Reading', description: 'Narrow column for comfortable reading', icon: <ScrollText className="h-3.5 w-3.5" /> },
  { id: 'draft', label: 'Draft', description: 'Distraction-free, no page breaks', icon: <PanelTop className="h-3.5 w-3.5" /> },
  { id: 'manuscript', label: 'Manuscript', description: 'Double-spaced Courier for submissions', icon: <Pen className="h-3.5 w-3.5" /> },
  { id: 'print', label: 'Print Layout', description: 'WYSIWYG with page breaks and headers', icon: <Printer className="h-3.5 w-3.5" /> },
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
        <SelectTrigger className="h-7 w-[150px] text-[11px] bg-background border-border" aria-label="Document layout">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LAYOUT_OPTIONS.map(opt => (
            <SelectItem key={opt.id} value={opt.id} className="text-xs cursor-pointer">
              <div className="flex items-center gap-2">
                {opt.icon}
                <div>
                  <span className="font-medium">{opt.label}</span>
                  <span className="text-muted-foreground ml-1.5 hidden sm:inline">— {opt.description}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
