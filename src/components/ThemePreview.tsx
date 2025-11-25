import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemePreviewProps {
  theme: {
    id: string;
    name: string;
    description: string;
  };
  isSelected: boolean;
  onSelect: () => void;
}

const themeStyles: Record<string, Record<string, string>> = {
  light: {
    '--preview-bg': '0 0% 100%',
    '--preview-fg': '0 0% 10%',
    '--preview-card': '0 0% 98%',
    '--preview-primary': '271 76% 53%',
    '--preview-accent': '346 60% 49%',
  },
  dark: {
    '--preview-bg': '237 28% 10%',
    '--preview-fg': '0 0% 88%',
    '--preview-card': '237 35% 12%',
    '--preview-primary': '271 80% 58%',
    '--preview-accent': '346 65% 52%',
  },
  midnight: {
    '--preview-bg': '0 0% 0%',
    '--preview-fg': '0 0% 98%',
    '--preview-card': '0 0% 5%',
    '--preview-primary': '271 80% 58%',
    '--preview-accent': '346 65% 52%',
  },
  ocean: {
    '--preview-bg': '210 45% 8%',
    '--preview-fg': '180 20% 95%',
    '--preview-card': '210 40% 12%',
    '--preview-primary': '195 100% 50%',
    '--preview-accent': '180 70% 45%',
  },
  forest: {
    '--preview-bg': '140 30% 8%',
    '--preview-fg': '120 15% 92%',
    '--preview-card': '140 25% 12%',
    '--preview-primary': '145 70% 45%',
    '--preview-accent': '85 50% 40%',
  },
  sunset: {
    '--preview-bg': '25 30% 10%',
    '--preview-fg': '35 20% 95%',
    '--preview-card': '25 35% 14%',
    '--preview-primary': '20 100% 60%',
    '--preview-accent': '40 100% 65%',
  },
  lavender: {
    '--preview-bg': '265 25% 10%',
    '--preview-fg': '270 15% 95%',
    '--preview-card': '265 30% 14%',
    '--preview-primary': '270 70% 60%',
    '--preview-accent': '290 80% 65%',
  },
  system: {
    '--preview-bg': '0 0% 100%',
    '--preview-fg': '0 0% 10%',
    '--preview-card': '0 0% 98%',
    '--preview-primary': '271 76% 53%',
    '--preview-accent': '346 60% 49%',
  },
};

export function ThemePreview({ theme, isSelected, onSelect }: ThemePreviewProps) {
  const styles = themeStyles[theme.id];

  return (
    <button
      onClick={onSelect}
      className={cn(
        "relative w-full p-0 text-left transition-all duration-300 group",
        "hover:scale-105 focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl",
        isSelected && "ring-2 ring-primary scale-105"
      )}
    >
      <Card 
        className={cn(
          "overflow-hidden border-2 transition-all duration-300",
          isSelected ? "border-primary shadow-glow" : "border-border/50 hover:border-primary/50",
          theme.id === 'ocean' && "ocean-preview-glow",
          theme.id === 'forest' && "forest-preview-glow"
        )}
      >
        {/* Theme Preview */}
        <div 
          className="relative h-32 p-4"
          style={styles}
        >
          {/* Background */}
          <div 
            className="absolute inset-0 transition-all duration-500"
            style={{ 
              backgroundColor: `hsl(var(--preview-bg))`,
            }}
          />
          
          {/* Animated effects for Ocean and Forest */}
          {theme.id === 'ocean' && (
            <>
              <div className="absolute inset-0 ocean-wave-1" />
              <div className="absolute inset-0 ocean-wave-2" />
              <div className="absolute top-1/4 right-1/4 w-2 h-2 rounded-full bg-primary/60 ocean-bioluminescence" />
              <div className="absolute bottom-1/3 left-1/3 w-2 h-2 rounded-full bg-accent/60 ocean-bioluminescence" style={{ animationDelay: '1s' }} />
            </>
          )}
          
          {theme.id === 'forest' && (
            <>
              <div className="absolute inset-0 forest-canopy" />
              <div className="absolute top-1/4 right-1/4 w-2 h-2 rounded-full bg-primary/40 forest-firefly" />
              <div className="absolute bottom-1/3 left-1/4 w-2 h-2 rounded-full bg-accent/40 forest-firefly" style={{ animationDelay: '1.5s' }} />
              <div className="absolute top-1/2 right-1/3 w-2 h-2 rounded-full bg-primary/30 forest-firefly" style={{ animationDelay: '0.7s' }} />
            </>
          )}
          
          {theme.id === 'sunset' && (
            <>
              <div className="absolute inset-0 sunset-gradient" />
              <div className="absolute top-1/4 right-1/2 w-3 h-3 rounded-full bg-primary/50 sunset-glow" />
            </>
          )}
          
          {theme.id === 'lavender' && (
            <>
              <div className="absolute inset-0 lavender-mist" />
              <div className="absolute top-1/3 left-1/4 w-2 h-2 rounded-full bg-primary/40 lavender-sparkle" />
              <div className="absolute bottom-1/4 right-1/3 w-2 h-2 rounded-full bg-accent/40 lavender-sparkle" style={{ animationDelay: '1.2s' }} />
            </>
          )}
          
          {theme.id === 'midnight' && (
            <>
              <div className="absolute inset-0 midnight-stars" />
              <div className="absolute top-1/4 right-1/3 w-1 h-1 rounded-full bg-primary/60 midnight-twinkle" />
              <div className="absolute bottom-1/3 left-1/4 w-1 h-1 rounded-full bg-primary/40 midnight-twinkle" style={{ animationDelay: '0.8s' }} />
            </>
          )}

          {/* Preview Content */}
          <div className="relative z-10 space-y-2">
            {/* Header bar */}
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-2 rounded-full transition-all duration-500"
                style={{ backgroundColor: `hsl(var(--preview-primary))` }}
              />
              <div 
                className="w-12 h-2 rounded-full transition-all duration-500"
                style={{ backgroundColor: `hsl(var(--preview-accent))` }}
              />
            </div>
            
            {/* Card preview */}
            <div 
              className="rounded-lg p-3 space-y-1.5 transition-all duration-500"
              style={{ 
                backgroundColor: `hsl(var(--preview-card))`,
              }}
            >
              <div 
                className="w-16 h-1.5 rounded transition-all duration-500"
                style={{ backgroundColor: `hsl(var(--preview-fg))` }}
              />
              <div 
                className="w-12 h-1.5 rounded opacity-60 transition-all duration-500"
                style={{ backgroundColor: `hsl(var(--preview-fg))` }}
              />
            </div>
            
            {/* Button preview */}
            <div 
              className="w-14 h-6 rounded-md flex items-center justify-center transition-all duration-500"
              style={{ backgroundColor: `hsl(var(--preview-primary))` }}
            />
          </div>
        </div>

        {/* Theme Info */}
        <div className="p-3 bg-card border-t">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground truncate">
                {theme.name}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {theme.description}
              </p>
            </div>
            {isSelected && (
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
          </div>
        </div>
      </Card>
    </button>
  );
}
