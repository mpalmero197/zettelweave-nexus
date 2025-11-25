import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { checkContrast, parseHSL, getContrastLevel, getContrastRecommendation } from "@/utils/contrastChecker";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export function ContrastChecker() {
  const [results, setResults] = useState<Array<{
    name: string;
    ratio: number;
    level: string;
    passes: boolean;
  }>>([]);

  const checkThemeContrast = () => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);

    // Get color values
    const background = parseHSL(computedStyle.getPropertyValue('--background'));
    const foreground = parseHSL(computedStyle.getPropertyValue('--foreground'));
    const primary = parseHSL(computedStyle.getPropertyValue('--primary'));
    const primaryFg = parseHSL(computedStyle.getPropertyValue('--primary-foreground'));
    const card = parseHSL(computedStyle.getPropertyValue('--card'));
    const cardFg = parseHSL(computedStyle.getPropertyValue('--card-foreground'));
    const muted = parseHSL(computedStyle.getPropertyValue('--muted'));
    const mutedFg = parseHSL(computedStyle.getPropertyValue('--muted-foreground'));

    const checks = [];

    if (background && foreground) {
      const result = checkContrast(foreground, background);
      checks.push({
        name: 'Text on Background',
        ratio: result.ratio,
        level: getContrastLevel(result.ratio),
        passes: result.wcagAAA
      });
    }

    if (primary && primaryFg) {
      const result = checkContrast(primaryFg, primary);
      checks.push({
        name: 'Primary Button Text',
        ratio: result.ratio,
        level: getContrastLevel(result.ratio),
        passes: result.wcagAAA
      });
    }

    if (card && cardFg) {
      const result = checkContrast(cardFg, card);
      checks.push({
        name: 'Card Content',
        ratio: result.ratio,
        level: getContrastLevel(result.ratio),
        passes: result.wcagAAA
      });
    }

    if (muted && mutedFg) {
      const result = checkContrast(mutedFg, muted);
      checks.push({
        name: 'Muted Elements',
        ratio: result.ratio,
        level: getContrastLevel(result.ratio),
        passes: result.wcagAA
      });
    }

    setResults(checks);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          WCAG Contrast Checker
        </CardTitle>
        <CardDescription>
          Verify color contrast meets accessibility standards
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={checkThemeContrast} className="w-full">
          Check Current Theme
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border bg-card/50"
              >
                <div className="flex items-center gap-3">
                  {result.passes ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  ) : result.ratio >= 4.5 ? (
                    <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                  )}
                  <div>
                    <div className="font-medium">{result.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Ratio: {result.ratio}:1
                    </div>
                  </div>
                </div>
                <Badge
                  variant={result.passes ? "default" : result.ratio >= 4.5 ? "secondary" : "destructive"}
                >
                  {result.level}
                </Badge>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1 p-3 rounded-lg bg-muted/50">
          <p className="font-semibold">WCAG Standards:</p>
          <p>• AAA: 7:1 ratio (Enhanced contrast)</p>
          <p>• AA: 4.5:1 ratio (Minimum contrast)</p>
          <p>• AA Large: 3:1 ratio (18pt+ text)</p>
        </div>
      </CardContent>
    </Card>
  );
}