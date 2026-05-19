import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Monitor, Smartphone, RefreshCw, ExternalLink } from 'lucide-react';

type Mode = 'desktop' | 'mobile';

const PREVIEW_SRC = '/chrome-extension/popup.html';

export function ChromeExtensionPreview() {
  const [mode, setMode] = useState<Mode>('desktop');
  const [nonce, setNonce] = useState(0);
  const src = `${PREVIEW_SRC}?n=${nonce}`;

  // Chrome popup max is ~800x600; default 400x600. Mobile (Kiwi) renders full width.
  const dims = mode === 'desktop'
    ? { w: 400, h: 600, label: '400 × 600 — Chrome popup' }
    : { w: 360, h: 720, label: '360 × 720 — Mobile (Kiwi / Edge mobile)' };

  return (
    <Card className="border-primary/10">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>
            Mock-up of the Toolbox as it renders inside a Chromium browser. Edits to{' '}
            <code className="text-xs">public/chrome-extension/popup.html</code> reflect here on refresh.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="inline-flex rounded-md border bg-muted p-0.5">
            <Button
              size="sm"
              variant={mode === 'desktop' ? 'default' : 'ghost'}
              className="h-7 gap-1.5 px-2"
              onClick={() => setMode('desktop')}
            >
              <Monitor className="h-3.5 w-3.5" /> Desktop
            </Button>
            <Button
              size="sm"
              variant={mode === 'mobile' ? 'default' : 'ghost'}
              className="h-7 gap-1.5 px-2"
              onClick={() => setMode('mobile')}
            >
              <Smartphone className="h-3.5 w-3.5" /> Mobile
            </Button>
          </div>
          <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => setNonce(n => n + 1)}>
            <RefreshCw className="h-3.5 w-3.5" /> Reload
          </Button>
          <Button size="sm" variant="outline" className="h-7 gap-1.5" asChild>
            <a href={src} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </a>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center bg-muted/40 rounded-lg p-6 border">
          {mode === 'desktop' ? (
            <ChromeWindowFrame width={dims.w} height={dims.h}>
              <iframe
                key={`d-${nonce}`}
                src={src}
                title="Extension preview (desktop)"
                style={{ width: dims.w, height: dims.h, border: 0, background: 'white' }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </ChromeWindowFrame>
          ) : (
            <PhoneFrame width={dims.w} height={dims.h}>
              <iframe
                key={`m-${nonce}`}
                src={src}
                title="Extension preview (mobile)"
                style={{ width: dims.w, height: dims.h, border: 0, background: 'white' }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            </PhoneFrame>
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">{dims.label}</p>
      </CardContent>
    </Card>
  );
}

function ChromeWindowFrame({ width, height, children }: { width: number; height: number; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg overflow-hidden shadow-2xl border border-border bg-background"
      style={{ width: width + 2 }}
    >
      {/* Chrome popup chrome — title bar mimicking what Chrome adds */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[hsl(220_13%_18%)] text-white/90 text-xs border-b border-black/20">
        <img src="/icon-192.png" alt="" className="h-4 w-4 rounded-sm" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
        <span className="font-medium truncate flex-1">PendragonX Toolbox</span>
        <div className="flex gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/30" />
        </div>
      </div>
      <div style={{ width, height }}>{children}</div>
    </div>
  );
}

function PhoneFrame({ width, height, children }: { width: number; height: number; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[2.5rem] bg-neutral-900 p-3 shadow-2xl"
      style={{ width: width + 24 }}
    >
      {/* Notch */}
      <div className="flex justify-center mb-2">
        <div className="h-5 w-24 rounded-b-2xl bg-neutral-900" />
      </div>
      <div className="rounded-[1.75rem] overflow-hidden bg-background border border-neutral-800">
        {/* Mobile Chrome address bar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-neutral-800 text-white/80 text-[11px]">
          <div className="flex-1 truncate rounded-full bg-neutral-700 px-3 py-1">
            pendragonx.com — Toolbox
          </div>
        </div>
        <div style={{ width, height }}>{children}</div>
      </div>
    </div>
  );
}
