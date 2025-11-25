/**
 * WCAG Color Contrast Checker
 * Ensures accessibility compliance for color combinations
 */

export interface ContrastResult {
  ratio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
  wcagAALarge: boolean;
  wcagAAALarge: boolean;
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
}

/**
 * Calculate relative luminance
 */
function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function calculateContrastRatio(
  color1: { h: number; s: number; l: number },
  color2: { h: number; s: number; l: number }
): number {
  const [r1, g1, b1] = hslToRgb(color1.h, color1.s, color1.l);
  const [r2, g2, b2] = hslToRgb(color2.h, color2.s, color2.l);

  const lum1 = getLuminance(r1, g1, b1);
  const lum2 = getLuminance(r2, g2, b2);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast meets WCAG standards
 */
export function checkContrast(
  foreground: { h: number; s: number; l: number },
  background: { h: number; s: number; l: number }
): ContrastResult {
  const ratio = calculateContrastRatio(foreground, background);

  return {
    ratio: Math.round(ratio * 100) / 100,
    wcagAA: ratio >= 4.5,           // Normal text WCAG AA
    wcagAAA: ratio >= 7,             // Normal text WCAG AAA
    wcagAALarge: ratio >= 3,         // Large text WCAG AA
    wcagAAALarge: ratio >= 4.5       // Large text WCAG AAA
  };
}

/**
 * Parse HSL string to object
 */
export function parseHSL(hslString: string): { h: number; s: number; l: number } | null {
  // Match patterns like "271 76% 53%" or "hsl(271, 76%, 53%)"
  const match = hslString.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  
  if (!match) return null;

  return {
    h: parseInt(match[1]),
    s: parseInt(match[2]),
    l: parseInt(match[3])
  };
}

/**
 * Get contrast level description
 */
export function getContrastLevel(ratio: number): string {
  if (ratio >= 7) return 'AAA (Enhanced)';
  if (ratio >= 4.5) return 'AA (Minimum)';
  if (ratio >= 3) return 'AA Large Text';
  return 'Fail';
}

/**
 * Get recommendations for better contrast
 */
export function getContrastRecommendation(ratio: number): string {
  if (ratio >= 7) return 'Excellent contrast! Meets WCAG AAA standards.';
  if (ratio >= 4.5) return 'Good contrast. Meets WCAG AA standards.';
  if (ratio >= 3) return 'Only suitable for large text (18pt+).';
  return 'Poor contrast. Consider adjusting colors for better readability.';
}