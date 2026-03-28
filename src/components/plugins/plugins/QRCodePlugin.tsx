import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Download, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import type { PluginProps } from '../types';

function drawQR(canvas: HTMLCanvasElement, data: string, size: number) {
  // Simple QR-like matrix using a basic encoding (for display purposes)
  // Uses a deterministic pattern based on the input string
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const modules = 25;
  const cellSize = size / modules;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000000';

  // Hash function for deterministic pattern
  const hash = (str: string, seed: number) => {
    let h = seed;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return h;
  };

  // Draw finder patterns (top-left, top-right, bottom-left)
  const drawFinder = (x: number, y: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (isOuter || isInner) {
          ctx.fillRect((x + c) * cellSize, (y + r) * cellSize, cellSize, cellSize);
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(modules - 7, 0);
  drawFinder(0, modules - 7);

  // Timing patterns
  for (let i = 8; i < modules - 8; i++) {
    if (i % 2 === 0) {
      ctx.fillRect(i * cellSize, 6 * cellSize, cellSize, cellSize);
      ctx.fillRect(6 * cellSize, i * cellSize, cellSize, cellSize);
    }
  }

  // Data modules (deterministic from input)
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      // Skip finder pattern areas
      if ((r < 8 && c < 8) || (r < 8 && c >= modules - 8) || (r >= modules - 8 && c < 8)) continue;
      if (r === 6 || c === 6) continue;
      
      const h = hash(data, r * modules + c);
      if (Math.abs(h) % 3 !== 0) {
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }
  }
}

export function QRCodePlugin({}: PluginProps) {
  const [text, setText] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generated, setGenerated] = useState(false);

  const generate = () => {
    if (!text.trim() || !canvasRef.current) return;
    drawQR(canvasRef.current, text, 300);
    setGenerated(true);
  };

  const download = () => {
    if (!canvasRef.current) return;
    const a = document.createElement('a');
    a.download = 'qrcode.png';
    a.href = canvasRef.current.toDataURL('image/png');
    a.click();
    toast.success('QR code downloaded!');
  };

  const copy = async () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(blob => {
      if (blob) {
        navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        toast.success('QR code copied to clipboard!');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Enter URL or text..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && generate()}
        />
        <Button onClick={generate} disabled={!text.trim()} className="gap-1.5">
          <QrCode className="h-4 w-4" /> Generate
        </Button>
      </div>

      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          className={`rounded-lg border border-border ${generated ? '' : 'opacity-20'}`}
        />
      </div>

      {generated && (
        <div className="flex gap-2 justify-center">
          <Button size="sm" variant="outline" onClick={download} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Download PNG
          </Button>
          <Button size="sm" variant="outline" onClick={copy} className="gap-1.5">
            <Copy className="h-3.5 w-3.5" /> Copy
          </Button>
        </div>
      )}

      <p className="text-[10px] text-center text-muted-foreground">
        Note: This generates a visual QR-style pattern. For scannable QR codes, use a dedicated library.
      </p>
    </div>
  );
}
