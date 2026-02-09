import { Button } from "@/components/ui/button";
import { Bot, Menu, Search } from "lucide-react";
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
import { ThemeVariantSelector } from "./ThemeVariantSelector";
import { Link } from "react-router-dom";

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
    <header className="h-12 border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-50" role="banner">
      <div className="h-full px-2 md:px-3 flex items-center justify-between gap-2 md:gap-3">
        {/* Hamburger Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0 hover-scale">
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

        {/* Logo with Status Dot - Desktop Only */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="hidden md:flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                <img src={pendragonLogo} alt="PendragonX" className="h-6 w-6 object-contain hover-scale" />
                <span className="text-sm font-semibold text-foreground">PendragonX</span>
                <div 
                  className={`h-2 w-2 rounded-full transition-all ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-muted-foreground/40'}`}
                  aria-label={isOnline ? 'Online' : 'Offline'}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isOnline ? 'Online' : 'Offline'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Spacer to push actions to the right */}
        <div className="flex-1"></div>

        {/* Quick Actions */}
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          {onSearchClick && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 hover-scale"
              onClick={onSearchClick}
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 hover-scale hidden md:flex"
                  asChild
                >
                  <Link to="/agents" aria-label="Agents">
                    <Bot className="h-4 w-4" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>AI Agents</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <ThemeVariantSelector />
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
