import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useThemeVariant, ThemeVariant } from "@/hooks/useThemeVariant";
import { Palette, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeLivePreview } from "@/components/ThemeLivePreview";

interface ThemeOption {
  value: ThemeVariant;
  label: string;
  description: string;
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
}

const themeOptions: ThemeOption[] = [
  {
    value: 'default',
    label: 'Purple Dream',
    description: 'Vibrant purple & magenta',
    primary: '271 76% 53%',
    secondary: '346 60% 49%',
    background: '0 0% 100%',
    foreground: '0 0% 10%'
  },
  {
    value: 'ocean',
    label: 'Ocean Depths',
    description: 'Deep sea blues & teals',
    primary: '195 85% 42%',
    secondary: '175 70% 38%',
    background: '200 25% 98%',
    foreground: '200 50% 10%'
  },
  {
    value: 'forest',
    label: 'Forest Canopy',
    description: 'Deep greens & moss tones',
    primary: '145 65% 32%',
    secondary: '90 45% 35%',
    background: '120 15% 97%',
    foreground: '150 40% 12%'
  },
  {
    value: 'sunset',
    label: 'Golden Sunset',
    description: 'Warm oranges & coral pinks',
    primary: '18 90% 52%',
    secondary: '340 70% 55%',
    background: '35 30% 98%',
    foreground: '15 50% 12%'
  },
  {
    value: 'lavender',
    label: 'Lavender Dreams',
    description: 'Soft purples & violets',
    primary: '265 55% 58%',
    secondary: '285 45% 55%',
    background: '270 20% 98%',
    foreground: '260 40% 15%'
  },
  {
    value: 'midnight',
    label: 'Cosmic Midnight',
    description: 'Ethereal space & starlight',
    primary: '250 85% 65%',
    secondary: '190 100% 55%',
    background: '240 50% 4%',
    foreground: '220 30% 95%'
  }
];

export function ThemeVariantSelector() {
  const { variant, setVariant } = useThemeVariant();

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">Theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="center" 
        side="bottom"
        sideOffset={8}
        className="w-72 bg-popover backdrop-blur-xl border-border shadow-xl z-[100]"
      >
        <DropdownMenuLabel>Color Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themeOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => setVariant(option.value)}
            className="flex items-start gap-3 cursor-pointer p-3"
          >
            <ThemeLivePreview
              primary={option.primary}
              secondary={option.secondary}
              background={option.background}
              foreground={option.foreground}
              className="w-20 h-16 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium flex items-center gap-2">
                {option.label}
                {variant === option.value && (
                  <Check className="h-3 w-3 text-primary flex-shrink-0" />
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {option.description}
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}