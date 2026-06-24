import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, ExternalLink, Smartphone, Monitor, Apple, Sparkles, Copy, Check } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { toast } from "sonner";

/**
 * "Get ALICE as her own app" card.
 *
 * Surfaces three install paths to the standalone ALICE shell at /alice-app:
 *  - Install as a PWA (Android, desktop Chrome/Edge — uses native prompt)
 *  - Add to Home Screen instructions (iOS Safari — no programmatic API)
 *  - Direct link the user can pop open anytime
 *
 * The standalone app reuses the user's PendragonX session, so ALICE has
 * full RAG access to their cards/notes/calendar without the main app
 * ever needing to be opened.
 */
export function AliceStandaloneAppCard() {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [copied, setCopied] = useState(false);

  const aliceUrl = `${window.location.origin}/alice-app`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(aliceUrl);
      setCopied(true);
      toast.success("ALICE link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Get ALICE as her own app</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Talk and create with ALICE without ever opening PendragonX
              </CardDescription>
            </div>
          </div>
          {isInstalled && <Badge variant="secondary" className="text-[10px]">Installed</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          A focused ALICE-only shell that signs in with your PendragonX account
          and reads your entire knowledge base — cards, notes, calendar, tasks.
          Voice in/out, "Hey ALICE" wake word, and proactive notifications all
          work in the background once installed.
        </p>

        <div className="grid gap-2">
          {/* Primary install: native PWA prompt */}
          <Button
            onClick={async () => {
              // Visit /alice-app first so the install prompt registers
              // against the ALICE manifest, not the main PendragonX one.
              window.open("/alice-app", "_blank", "noopener");
              if (isInstallable) {
                await promptInstall();
              }
            }}
            className="w-full justify-start"
            variant="default"
          >
            <Download className="h-4 w-4 mr-2" />
            {isInstallable ? "Install ALICE app" : "Open ALICE in a new window"}
            <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-60" />
          </Button>

          <Button
            onClick={copyLink}
            variant="outline"
            className="w-full justify-start"
          >
            {copied ? (
              <Check className="h-4 w-4 mr-2 text-primary" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            <span className="truncate">{aliceUrl}</span>
          </Button>
        </div>

        {/* Platform-specific install hints */}
        <div className="grid gap-2 text-xs">
          {isIOS && (
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <div className="flex items-center gap-2 font-medium mb-1">
                <Apple className="h-3.5 w-3.5" /> iPhone / iPad
              </div>
              <ol className="list-decimal pl-4 space-y-0.5 text-muted-foreground">
                <li>Tap "Open ALICE" above</li>
                <li>Tap the Share button in Safari</li>
                <li>Choose <strong>Add to Home Screen</strong></li>
              </ol>
            </div>
          )}
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-2 font-medium mb-1">
              <Smartphone className="h-3.5 w-3.5" /> Android
            </div>
            <p className="text-muted-foreground">
              Open ALICE in Chrome, then tap the install banner or use the
              browser menu → <strong>Install app</strong>.
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-2 font-medium mb-1">
              <Monitor className="h-3.5 w-3.5" /> Desktop (Mac / Windows / Linux)
            </div>
            <p className="text-muted-foreground">
              In Chrome, Edge, or Brave, look for the install icon in the
              address bar while on the ALICE page, or use menu →{" "}
              <strong>Install ALICE</strong>. Launches in its own window with
              its own dock/taskbar icon.
            </p>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/80">
          Same login, same data — sign out of either app independently. Native
          iOS/Android and standalone desktop builds are coming next.
        </p>
      </CardContent>
    </Card>
  );
}
