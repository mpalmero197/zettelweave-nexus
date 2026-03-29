import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import type { PluginProps } from '../types';

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function generatePalette(hex: string) {
  const [h, s, l] = hexToHsl(hex);
  return {
    complementary: [hex, hslToHex((h + 180) % 360, s, l)],
    analogous: [hslToHex((h - 30 + 360) % 360, s, l), hex, hslToHex((h + 30) % 360, s, l)],
    triadic: [hex, hslToHex((h + 120) % 360, s, l), hslToHex((h + 240) % 360, s, l)],
    'split-comp': [hex, hslToHex((h + 150) % 360, s, l), hslToHex((h + 210) % 360, s, l)],
  };
}

export function ColorPalettePlugin({ onClose }: PluginProps) {
  const [color, setColor] = useState('#6366f1');
  const palettes = useMemo(() => generatePalette(color), [color]);

  const copy = (hex: string) => { navigator.clipboard.writeText(hex); toast.success(`Copied ${hex}`); };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input type="color" value={color} onChange={e => setColor(e.target.value)}
          className="w-12 h-10 rounded cursor-pointer border-0" />
        <Input value={color} onChange={e => setColor(e.target.value)} className="font-mono w-28" />
        <Badge variant="secondary">{hexToHsl(color).join(', ')}</Badge>
      </div>

      {Object.entries(palettes).map(([name, colors]) => (
        <div key={name} className="space-y-1.5">
          <div className="text-xs font-medium capitalize text-muted-foreground">{name}</div>
          <div className="flex gap-2">
            {colors.map((c, i) => (
              <button key={i} onClick={() => copy(c)}
                className="flex-1 h-12 rounded-lg border border-border relative group"
                style={{ backgroundColor: c }}>
                <span className="absolute inset-x-0 bottom-0 text-[9px] font-mono bg-background/80 rounded-b-lg py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {c}
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
