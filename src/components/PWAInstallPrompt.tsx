import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useIsMobile } from '@/hooks/use-mobile';

export const PWAInstallPrompt = () => {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const isMobile = useIsMobile();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      localStorage.setItem('pwa-install-dismissed', 'true');
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!isInstallable || isInstalled || dismissed || !isMobile) {
    return null;
  }

  return (
    <Card className="fixed bottom-20 left-4 right-4 z-50 p-4 shadow-2xl border-2 border-primary/20 bg-background/95 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
          <Download className="w-6 h-6 text-primary-foreground" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm mb-1">Install PendragonX</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Install our app for a better experience with offline access
          </p>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleInstall}
              size="sm"
              className="flex-1"
            >
              Install
            </Button>
            <Button 
              onClick={handleDismiss}
              size="sm"
              variant="ghost"
            >
              Not now
            </Button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 h-6 w-6"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};
