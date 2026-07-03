import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Monitor, Smartphone, RefreshCw, ExternalLink, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Mode = 'desktop' | 'mobile';

const PREVIEW_SRC = '/chrome-extension/popup.html';

export function ChromeExtensionPreview() {
  const [mode, setMode] = useState<Mode>('desktop');
  const [nonce, setNonce] = useState(() => Date.now());
  const src = `${PREVIEW_SRC}?n=${nonce}`;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/chrome-extension/manifest.json?n=${nonce}`)
      .then((r) => r.json())
      .then((m) => setVersion(m?.version || null))
      .catch(() => setVersion(null));
  }, [nonce]);

  const dims = mode === 'desktop'
    ? { w: 400, h: 600, label: '400 × 600 — Chrome popup' }
    : { w: 360, h: 720, label: '360 × 720 — Mobile (Kiwi / Edge mobile)' };

  // Outer frame width (popup chrome adds ~2px; phone shell adds 24px padding)
  const frameOuterW = mode === 'desktop' ? dims.w + 2 : dims.w + 24;

  // Auto-scale to fit available width on small screens
  useLayoutEffect(() => {
    const update = () => {
      const avail = stageRef.current?.clientWidth ?? frameOuterW;
      // leave a tiny margin
      const next = Math.min(1, (avail - 16) / frameOuterW);
      setScale(next > 0 ? next : 1);
    };
    update();
    const ro = new ResizeObserver(update);
    if (stageRef.current) ro.observe(stageRef.current);
    window.addEventListener('resize', update);
    return () => { ro.disconnect(); window.removeEventListener('resize', update); };
  }, [frameOuterW]);

  // Push current Supabase session into iframe so the popup is auto-signed-in.
  // The iframe shim stores it in sessionStorage only, so signing out in the
  // preview cannot affect the parent app's auth.
  useEffect(() => {
    const sendSession = async () => {
      const { data } = await supabase.auth.getSession();
      const s = data.session;
      const payload = s ? {
        access_token: s.access_token,
        refresh_token: s.refresh_token,
        expires_at: s.expires_at,
        email: s.user?.email,
      } : null;
      iframeRef.current?.contentWindow?.postMessage(
        { __pxpreview: 'session', session: payload },
        '*'
      );
    };
    const onMsg = (e: MessageEvent) => {
      if (e.data?.__pxpreview === 'ready') sendSession();
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [nonce, mode]);

  return (
    <Card className="border-primary/10">
      <CardHeader className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 flex-wrap">
              Live Preview
              {version && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  v{version}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Auto-signed-in with your current account. The preview is isolated — signing out here will <strong>not</strong> sign you out of Baku Scribe.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Preview session is sandboxed in sessionStorage — separate from your real account.
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={stageRef}
          className="bg-muted/40 rounded-lg p-3 sm:p-6 border overflow-hidden"
        >
          {/* Scale wrapper — keeps frames pixel-perfect but fits any viewport */}
          <div
            style={{
              width: frameOuterW * scale,
              height: (mode === 'desktop' ? dims.h + 38 : dims.h + 80) * scale,
              margin: '0 auto',
              position: 'relative',
            }}
          >
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                position: 'absolute',
                top: 0,
                left: 0,
              }}
            >
              {mode === 'desktop' ? (
                <ChromeWindowFrame width={dims.w} height={dims.h}>
                  <iframe
                    ref={iframeRef}
                    key={`d-${nonce}`}
                    src={src}
                    title="Extension preview (desktop)"
                    style={{ width: dims.w, height: dims.h, border: 0, background: 'white', display: 'block' }}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                </ChromeWindowFrame>
              ) : (
                <PhoneFrame width={dims.w} height={dims.h}>
                  <iframe
                    ref={iframeRef}
                    key={`m-${nonce}`}
                    src={src}
                    title="Extension preview (mobile)"
                    style={{ width: dims.w, height: dims.h, border: 0, background: 'white', display: 'block' }}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                </PhoneFrame>
              )}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          {dims.label}{scale < 1 ? ` · scaled to ${Math.round(scale * 100)}%` : ''}
        </p>
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
      <div className="flex items-center gap-2 px-3 py-2 bg-[hsl(220_13%_18%)] text-white/90 text-xs border-b border-black/20">
        <img src="/icon-192.png" alt="" className="h-4 w-4 rounded-sm" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
        <span className="font-medium truncate flex-1">Baku Scribe Toolbox</span>
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
    <div className="rounded-[2.5rem] bg-neutral-900 p-3 shadow-2xl" style={{ width: width + 24 }}>
      <div className="flex justify-center mb-2">
        <div className="h-5 w-24 rounded-b-2xl bg-neutral-900" />
      </div>
      <div className="rounded-[1.75rem] overflow-hidden bg-background border border-neutral-800">
        <div className="flex items-center gap-2 px-3 py-2 bg-neutral-800 text-white/80 text-[11px]">
          <div className="flex-1 truncate rounded-full bg-neutral-700 px-3 py-1">
            bakuscribe.com — Toolbox
          </div>
        </div>
        <div style={{ width, height }}>{children}</div>
      </div>
    </div>
  );
}
