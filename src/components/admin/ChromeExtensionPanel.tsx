import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Chrome, Download, Loader2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminSectionHeader } from './AdminSectionHeader';
import { ChromeExtensionPreview } from './ChromeExtensionPreview';

export function ChromeExtensionPanel() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/chrome-extension/manifest.json?t=${Date.now()}`)
      .then((r) => r.json())
      .then((m) => setVersion(m?.version || null))
      .catch(() => setVersion(null));
  }, []);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const res = await fetch(`/bakuscribe-chrome-extension.zip?t=${Date.now()}`);
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'bakuscribe-chrome-extension.zip';
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('Extension downloaded', {
        description: 'Unzip and load via chrome://extensions (Developer Mode).',
        duration: 8000,
      });
    } catch (e) {
      console.error(e);
      toast.error('Failed to download extension');
    } finally {
      setIsDownloading(false);
    }
  };

  const steps = [
    'Download and unzip the package below',
    'Open chrome://extensions in Chrome (or any Chromium browser)',
    'Enable Developer Mode using the toggle in the top-right',
    'Click "Load unpacked" and select the unzipped folder',
    'Pin the Baku Scribe Toolbox to your toolbar and sign in',
  ];

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        icon={Chrome}
        title="Chrome Extension"
        description={version ? `Preview build v${version} · Package and distribute the Baku Scribe Toolbox` : 'Package and distribute the Baku Scribe Toolbox extension'}
        actions={
          <Button onClick={handleDownload} disabled={isDownloading} className="gap-2">
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isDownloading ? 'Packaging…' : 'Download Extension'}
          </Button>
        }
      />

      <ChromeExtensionPreview />

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle>Installation</CardTitle>
          <CardDescription>Manual install instructions for unpacked extensions</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary mt-0.5 flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm">{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle>What's Included</CardTitle>
          <CardDescription>Full toolbox capabilities mirror the web app</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {[
              'ALICE assistant with full content tools',
              'Cards, Notes, Calendar, and Focus tabs',
              'Page capture: Text, Full Page, Card, and PDF',
              'Auto-sync, offline cache, and session persistence',
              'Admin badge hidden from non-admin users',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-6 space-y-2">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            <strong>Distribution:</strong> The download is publicly accessible at{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">/bakuscribe-chrome-extension.zip</code>.
            For Chrome Web Store publication, upload the same ZIP via the{' '}
            <a
              href="https://chrome.google.com/webstore/devconsole"
              target="_blank"
              rel="noreferrer"
              className="underline inline-flex items-center gap-1"
            >
              Developer Console <ExternalLink className="h-3 w-3" />
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
