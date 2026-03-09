import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getThemesByCategory } from '@/utils/documentThemes';
import { Palette } from 'lucide-react';

interface DocumentThemeSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function DocumentThemeSelector({ value, onChange }: DocumentThemeSelectorProps) {
  const themesByCategory = getThemesByCategory();

  return (
    <div className="flex items-center gap-2">
      <Palette className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[180px] h-8 text-xs bg-card border-border">
          <SelectValue placeholder="Select Theme" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(themesByCategory).map(([category, themes]) => (
            <SelectGroup key={category}>
              <SelectLabel className="text-xs text-muted-foreground uppercase">{category}</SelectLabel>
              {themes.map((theme) => (
                <SelectItem key={theme.id} value={theme.id} className="text-xs cursor-pointer ml-2">
                  <span className="font-medium">{theme.name}</span>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
