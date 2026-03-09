import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DOCUMENT_THEMES } from '@/utils/documentThemes';
import { Palette } from 'lucide-react';

interface DocumentThemeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function DocumentThemeSelector({ value, onChange }: DocumentThemeSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Palette className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[160px] h-8 text-xs bg-card border-border">
          <SelectValue placeholder="Select Theme" />
        </SelectTrigger>
        <SelectContent>
          {DOCUMENT_THEMES.map((theme) => (
            <SelectItem key={theme.id} value={theme.id} className="text-xs cursor-pointer">
              <span className="font-medium">{theme.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
