import { Menu, Search, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import bakuScribeLogoAsset from '@/assets/baku-scribe-logo.png.asset.json';
const pendragonLogo = bakuScribeLogoAsset.url;

export function MobileHeader() {
  const isMobile = useIsMobile();
  const { isOnline } = useOfflineMode();
  
  // Only render on mobile
  if (!isMobile) return null;
  
  return (
    <header className="md:hidden sticky top-0 z-40 w-full bg-background/95 backdrop-blur-xl border-b border-border shadow-lg">
      <div className="flex items-center justify-between px-3 py-2 mobile-safe-area">
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-xl min-h-[44px] min-w-[44px] touch-manipulation"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto">
            <div className="py-6">
              <div className="text-lg font-semibold mb-4">Menu</div>
              {/* Mobile menu content */}
            </div>
          </SheetContent>
        </Sheet>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <img src={pendragonLogo} alt="Baku Scribe" className="h-7 w-7 object-contain" />
                <h1 className="text-xl font-bold text-primary">
                  Baku Scribe
                </h1>
                <div 
                  className={`h-2 w-2 rounded-full ${
                    isOnline ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                  aria-label={isOnline ? 'Online' : 'Offline'}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isOnline ? 'Online' : 'Offline'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-xl min-h-[44px] min-w-[44px] touch-manipulation"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-xl min-h-[44px] min-w-[44px] touch-manipulation relative"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full" />
          </Button>
        </div>
      </div>
    </header>
  );
}
