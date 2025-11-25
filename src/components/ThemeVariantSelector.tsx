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

interface ThemeOption {
  value: ThemeVariant;
  label: string;
  description: string;
  preview: string;
}

const themeOptions: ThemeOption[] = [
  {
    value: 'default',
    label: 'Purple Dream',
    description: 'Vibrant purple & pink',
    preview: 'bg-gradient-to-r from-[hsl(271,76%,53%)] to-[hsl(346,60%,49%)]'
  },
  {
    value: 'ocean',
    label: 'Ocean Breeze',
    description: 'Calming blues & teals',
    preview: 'bg-gradient-to-r from-[hsl(200,70%,48%)] to-[hsl(180,60%,45%)]'
  },
  {
    value: 'forest',
    label: 'Forest Path',
    description: 'Natural greens & earth',
    preview: 'bg-gradient-to-r from-[hsl(130,50%,45%)] to-[hsl(85,45%,40%)]'
  },
  {
    value: 'sunset',
    label: 'Sunset Glow',
    description: 'Warm oranges & reds',
    preview: 'bg-gradient-to-r from-[hsl(15,85%,55%)] to-[hsl(40,70%,50%)]'
  },
  {
    value: 'lavender',
    label: 'Lavender Fields',
    description: 'Soft purples & blues',
    preview: 'bg-gradient-to-r from-[hsl(270,50%,60%)] to-[hsl(240,60%,65%)]'
  }
];

export function ThemeVariantSelector() {
  const { variant, setVariant } = useThemeVariant();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">Theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-popover/95 backdrop-blur-xl border-border/60">
        <DropdownMenuLabel>Color Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themeOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => setVariant(option.value)}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className={cn("w-8 h-8 rounded-md", option.preview)} />
            <div className="flex-1">
              <div className="font-medium">{option.label}</div>
              <div className="text-xs text-muted-foreground">{option.description}</div>
            </div>
            {variant === option.value && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}