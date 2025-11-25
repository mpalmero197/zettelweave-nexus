import { Button } from "@/components/ui/button";
import { Brain, Menu, Search, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MinimalSidebar } from "./MinimalSidebar";
import { CreateCardDialog } from "./CreateCardDialog";
import { FeatureRequestDialog } from "./FeatureRequestDialog";
import { ZettelCard, OrganizationMethod } from "@/types/zettel";
import pendragonLogo from '@/assets/pendragon-logo.png';
import { useOfflineMode } from "@/hooks/useOfflineMode";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MinimalHeaderProps {
  user: any;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  onAccountSettings: () => void;
  onCreateCard: (card: Omit<ZettelCard, 'id' | 'created' | 'modified'>) => void;
  existingCards: ZettelCard[];
  organizationMethod: OrganizationMethod;
  isAdmin: boolean;
  onSearchClick?: () => void;
}

export function MinimalHeader({
  user,
  activeTab,
  onTabChange,
  onSignOut,
  onAccountSettings,
  onCreateCard,
  existingCards,
  organizationMethod,
  isAdmin,
  onSearchClick,
}: MinimalHeaderProps) {
  const { isOnline } = useOfflineMode();
  const { theme, setTheme } = useTheme();
  
  return (
    <header className="h-12 border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="h-full px-2 md:px-3 flex items-center justify-between gap-2 md:gap-3">
        {/* Hamburger Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <MinimalSidebar
              activeTab={activeTab}
              onTabChange={onTabChange}
              onSignOut={onSignOut}
              onAccountSettings={onAccountSettings}
              isAdmin={isAdmin}
            />
          </SheetContent>
        </Sheet>

        {/* Logo with Status Dot - Hidden on small mobile, visible on larger screens */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                <img src={pendragonLogo} alt="PendragonX" className="h-6 w-6 object-contain" />
                <span className="text-sm font-semibold hidden md:inline">PendragonX</span>
                <div 
                  className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
                  aria-label={isOnline ? 'Online' : 'Offline'}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isOnline ? 'Online' : 'Offline'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Spacer for mobile to push buttons to the right */}
        <div className="flex-1 sm:hidden"></div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
          {onSearchClick && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={onSearchClick}
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>
          <FeatureRequestDialog />
          <CreateCardDialog 
            onCreateCard={onCreateCard}
            existingCards={existingCards}
            organizationMethod={organizationMethod}
          />
        </div>
      </div>
    </header>
  );
}
