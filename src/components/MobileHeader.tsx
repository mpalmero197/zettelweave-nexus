import { Menu, Search, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export function MobileHeader() {
  const isMobile = useIsMobile();
  
  if (!isMobile) return null;
  
  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-xl border-b border-border shadow-lg">
      <div className="flex items-center justify-between px-4 py-3 mobile-safe-area">
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-xl min-h-[44px] min-w-[44px] touch-manipulation"
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-sm overflow-y-auto">
            <div className="py-6">
              <div className="text-lg font-semibold mb-4">Menu</div>
              {/* Mobile menu content */}
            </div>
          </SheetContent>
        </Sheet>
        
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            PendragonX
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-xl min-h-[44px] min-w-[44px] touch-manipulation"
          >
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-xl min-h-[44px] min-w-[44px] touch-manipulation relative"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full" />
            <span className="sr-only">Notifications</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
