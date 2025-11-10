import { useState } from 'react';
import { Download, Check, Smartphone, Tablet, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useNavigate } from 'react-router-dom';

const Install = () => {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const navigate = useNavigate();
  const [installing, setInstalling] = useState(false);

  const handleInstall = async () => {
    setInstalling(true);
    const accepted = await promptInstall();
    setInstalling(false);
    
    if (accepted) {
      setTimeout(() => navigate('/'), 1000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 mb-4">
            <Download className="w-10 h-10 text-primary-foreground" />
          </div>
          
          <h1 className="text-4xl font-bold">Install PendragonX</h1>
          <p className="text-muted-foreground text-lg">
            Get the full app experience with offline access and faster performance
          </p>
        </div>

        {isInstalled ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-6 text-center">
            <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h3 className="text-xl font-semibold mb-2">Already Installed</h3>
            <p className="text-muted-foreground mb-4">
              PendragonX is already installed on your device
            </p>
            <Button onClick={() => navigate('/')}>
              Go to App
            </Button>
          </div>
        ) : isInstallable ? (
          <div className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                <Smartphone className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Works Offline</h3>
                  <p className="text-sm text-muted-foreground">
                    Access your knowledge base even without internet connection
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                <Tablet className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Native Experience</h3>
                  <p className="text-sm text-muted-foreground">
                    Feels like a native app on your phone or tablet
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                <Monitor className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-1">Quick Access</h3>
                  <p className="text-sm text-muted-foreground">
                    Launch directly from your home screen
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleInstall}
              disabled={installing}
              size="lg"
              className="w-full h-14 text-lg"
            >
              {installing ? 'Installing...' : 'Install Now'}
            </Button>

            <Button 
              onClick={() => navigate('/')}
              variant="ghost"
              className="w-full"
            >
              Continue in browser
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-6 text-center">
              <h3 className="font-semibold mb-3">Manual Installation</h3>
              <div className="text-sm text-muted-foreground space-y-2 text-left">
                <p className="font-medium">On iPhone/iPad:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Tap the Share button (square with arrow)</li>
                  <li>Scroll and tap "Add to Home Screen"</li>
                  <li>Tap "Add" to install</li>
                </ol>
                
                <p className="font-medium mt-4">On Android:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Tap the menu (three dots)</li>
                  <li>Tap "Install app" or "Add to Home screen"</li>
                  <li>Tap "Install" to confirm</li>
                </ol>
              </div>
            </div>

            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              Go to App
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Install;
