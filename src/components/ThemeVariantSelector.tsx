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
    description: 'Vibrant purple & pink',
    primary: '271 76% 53%',
    secondary: '346 60% 49%',
    background: '0 0% 100%',
    foreground: '0 0% 10%'
  },
  {
    value: 'ocean',
    label: 'Ocean Breeze',
    description: 'Calming blues & teals',
    primary: '200 70% 48%',
    secondary: '180 60% 45%',
    background: '0 0% 100%',
    foreground: '0 0% 10%'
  },
  {
    value: 'forest',
    label: 'Forest Path',
    description: 'Natural greens & earth',
    primary: '130 50% 45%',
    secondary: '85 45% 40%',
    background: '0 0% 100%',
    foreground: '0 0% 10%'
  },
  {
    value: 'sunset',
    label: 'Sunset Glow',
    description: 'Warm oranges & reds',
    primary: '15 85% 55%',
    secondary: '40 70% 50%',
    background: '0 0% 100%',
    foreground: '0 0% 10%'
  },
  {
    value: 'lavender',
    label: 'Lavender Fields',
    description: 'Soft purples & blues',
    primary: '270 50% 60%',
    secondary: '240 60% 65%',
    background: '0 0% 100%',
    foreground: '0 0% 10%'
  }
];

export function ThemeVariantSelector() {
  const { variant, setVariant } = useThemeVariant();
  
  const handleThemeChange = (newVariant: ThemeVariant) => {
    console.log('Theme option clicked:', newVariant);
    setVariant(newVariant);
  };

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
            onClick={() => handleThemeChange(option.value)}
            onSelect={(e) => {
              e.preventDefault();
              handleThemeChange(option.value);
            }}
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