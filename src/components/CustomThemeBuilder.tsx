import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ThemeLivePreview } from "@/components/ThemeLivePreview";
import { checkContrast, parseHSL, getContrastLevel } from "@/utils/contrastChecker";
import { CheckCircle2, XCircle, AlertCircle, Save, Palette, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CustomTheme {
  id: string;
  name: string;
  primary: { h: number; s: number; l: number };
  secondary: { h: number; s: number; l: number };
  background: { h: number; s: number; l: number };
  foreground: { h: number; s: number; l: number };
}

const CUSTOM_THEMES_KEY = 'custom-themes';

export function CustomThemeBuilder() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [themeName, setThemeName] = useState("");
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  
  // Color states (H, S, L)
  const [primary, setPrimary] = useState({ h: 271, s: 76, l: 53 });
  const [secondary, setSecondary] = useState({ h: 346, s: 60, l: 49 });
  const [background, setBackground] = useState({ h: 0, s: 0, l: 100 });
  const [foreground, setForeground] = useState({ h: 0, s: 0, l: 10 });

  // Load custom themes from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(CUSTOM_THEMES_KEY);
    if (stored) {
      try {
        setCustomThemes(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load custom themes:', e);
      }
    }
  }, []);

  // Calculate contrast ratios
  const primaryBgContrast = checkContrast(foreground, primary);
  const secondaryBgContrast = checkContrast(foreground, secondary);
  const textBgContrast = checkContrast(foreground, background);

  const allContrastsPassed = 
    primaryBgContrast.wcagAA && 
    secondaryBgContrast.wcagAA && 
    textBgContrast.wcagAAA;

  const hslToString = (color: { h: number; s: number; l: number }) => {
    return `${color.h} ${color.s}% ${color.l}%`;
  };

  const handleSaveTheme = () => {
    if (!themeName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your theme",
        variant: "destructive"
      });
      return;
    }

    if (!allContrastsPassed) {
      toast({
        title: "Accessibility warning",
        description: "Your theme doesn't meet WCAG AA standards. Are you sure?",
        variant: "destructive"
      });
    }

    const newTheme: CustomTheme = {
      id: `custom-${Date.now()}`,
      name: themeName,
      primary,
      secondary,
      background,
      foreground
    };

    const updated = [...customThemes, newTheme];
    setCustomThemes(updated);
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(updated));

    toast({
      title: "Theme saved!",
      description: `"${themeName}" has been added to your custom themes.`
    });

    // Reset
    setThemeName("");
    setOpen(false);
  };

  const handleApplyTheme = (theme: CustomTheme) => {
    const root = document.documentElement;
    root.style.setProperty('--primary', hslToString(theme.primary));
    root.style.setProperty('--secondary', hslToString(theme.secondary));
    root.style.setProperty('--background', hslToString(theme.background));
    root.style.setProperty('--foreground', hslToString(theme.foreground));
    
    // Update gradients
    root.style.setProperty('--gradient-primary', 
      `linear-gradient(135deg, hsl(${hslToString(theme.primary)}), hsl(${hslToString(theme.secondary)}))`
    );

    toast({
      title: "Theme applied!",
      description: `Now using "${theme.name}"`
    });
  };

  const handleDeleteTheme = (id: string) => {
    const updated = customThemes.filter(t => t.id !== id);
    setCustomThemes(updated);
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(updated));
    
    toast({
      title: "Theme deleted",
      description: "Custom theme has been removed"
    });
  };

  const ColorControl = ({ 
    label, 
    color, 
    onChange 
  }: { 
    label: string; 
    color: { h: number; s: number; l: number }; 
    onChange: (color: { h: number; s: number; l: number }) => void;
  }) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <div 
          className="w-12 h-12 rounded-lg border-2 border-border shadow-sm"
          style={{ backgroundColor: `hsl(${color.h}, ${color.s}%, ${color.l}%)` }}
        />
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground w-12">Hue</Label>
          <Slider
            value={[color.h]}
            onValueChange={([h]) => onChange({ ...color, h })}
            min={0}
            max={360}
            step={1}
            className="flex-1"
          />
          <span className="text-xs font-mono w-12 text-right">{color.h}°</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground w-12">Sat</Label>
          <Slider
            value={[color.s]}
            onValueChange={([s]) => onChange({ ...color, s })}
            min={0}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-xs font-mono w-12 text-right">{color.s}%</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground w-12">Light</Label>
          <Slider
            value={[color.l]}
            onValueChange={([l]) => onChange({ ...color, l })}
            min={0}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-xs font-mono w-12 text-right">{color.l}%</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="w-full gap-2">
            <Palette className="h-4 w-4" />
            Create Custom Theme
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Custom Theme Builder</DialogTitle>
            <DialogDescription>
              Create your own color palette with real-time WCAG compliance checking
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Controls */}
            <div className="space-y-6">
              <div>
                <Label htmlFor="theme-name">Theme Name</Label>
                <Input
                  id="theme-name"
                  value={themeName}
                  onChange={(e) => setThemeName(e.target.value)}
                  placeholder="My Custom Theme"
                  className="mt-2"
                />
              </div>

              <Separator />

              <ColorControl label="Primary Color" color={primary} onChange={setPrimary} />
              <Separator />
              <ColorControl label="Secondary Color" color={secondary} onChange={setSecondary} />
              <Separator />
              <ColorControl label="Background" color={background} onChange={setBackground} />
              <Separator />
              <ColorControl label="Text Color" color={foreground} onChange={setForeground} />
            </div>

            {/* Preview & Compliance */}
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Live Preview</Label>
                <ThemeLivePreview
                  primary={hslToString(primary)}
                  secondary={hslToString(secondary)}
                  background={hslToString(background)}
                  foreground={hslToString(foreground)}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    {allContrastsPassed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    WCAG Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ContrastRow
                    label="Text on Background"
                    ratio={textBgContrast.ratio}
                    passed={textBgContrast.wcagAAA}
                    level={getContrastLevel(textBgContrast.ratio)}
                  />
                  <ContrastRow
                    label="Primary Button"
                    ratio={primaryBgContrast.ratio}
                    passed={primaryBgContrast.wcagAA}
                    level={getContrastLevel(primaryBgContrast.ratio)}
                  />
                  <ContrastRow
                    label="Secondary Button"
                    ratio={secondaryBgContrast.ratio}
                    passed={secondaryBgContrast.wcagAA}
                    level={getContrastLevel(secondaryBgContrast.ratio)}
                  />
                </CardContent>
              </Card>

              <Button 
                onClick={handleSaveTheme} 
                className="w-full gap-2"
                disabled={!themeName.trim()}
              >
                <Save className="h-4 w-4" />
                Save Theme
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Saved Custom Themes */}
      {customThemes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Your Custom Themes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {customThemes.map((theme) => (
              <div
                key={theme.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card/50 hover:bg-accent/50 transition-colors"
              >
                <ThemeLivePreview
                  primary={hslToString(theme.primary)}
                  secondary={hslToString(theme.secondary)}
                  background={hslToString(theme.background)}
                  foreground={hslToString(theme.foreground)}
                  className="w-24 h-20 flex-shrink-0"
                />
                <div className="flex-1">
                  <p className="font-medium text-sm">{theme.name}</p>
                  <p className="text-xs text-muted-foreground">Custom theme</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApplyTheme(theme)}
                  >
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteTheme(theme.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ContrastRow({ 
  label, 
  ratio, 
  passed, 
  level 
}: { 
  label: string; 
  ratio: number; 
  passed: boolean; 
  level: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs">{ratio}:1</span>
        {passed ? (
          <CheckCircle2 className="h-3 w-3 text-green-500" />
        ) : (
          <XCircle className="h-3 w-3 text-destructive" />
        )}
        <Badge variant={passed ? "default" : "destructive"} className="text-xs">
          {level}
        </Badge>
      </div>
    </div>
  );
}