import { Button } from "@/components/ui/button";
import { Brain, Menu } from "lucide-react";
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
}: MinimalHeaderProps) {
  const { isOnline } = useOfflineMode();
  
  return (
    <header className="h-12 border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="h-full px-3 flex items-center justify-between gap-3">
        {/* Hamburger Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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

        {/* Logo with Status Dot */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <img src={pendragonLogo} alt="PendragonX" className="h-6 w-6 object-contain" />
                <span className="text-sm font-semibold">PendragonX</span>
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

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
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
