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
    <header className="h-11 border-b border-border bg-background sticky top-0 z-50" role="banner">
      <div className="h-full px-2 md:px-4 flex items-center justify-between gap-2">
        {/* Left: Menu + Logo */}
        <div className="flex items-center gap-1.5">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0">
              <MinimalSidebar
                activeTab={activeTab}
                onTabChange={onTabChange}
                onSignOut={onSignOut}
                onAccountSettings={onAccountSettings}
                isAdmin={isAdmin}
              />
            </SheetContent>
          </Sheet>

          <div className="hidden md:flex items-center gap-1.5">
            <img src={pendragonLogo} alt="PendragonX" className="h-5 w-5 object-contain" />
            <span className="text-sm font-semibold text-foreground">PendragonX</span>
            <div 
              className={`h-1.5 w-1.5 rounded-full ml-0.5 ${isOnline ? 'bg-foreground/40' : 'bg-muted-foreground/20'}`}
              aria-label={isOnline ? 'Online' : 'Offline'}
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-0.5">
          {onSearchClick && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onSearchClick} aria-label="Search">
              <Search className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hidden md:flex" asChild>
            <Link to="/agents" aria-label="Agents">
              <Bot className="h-3.5 w-3.5" />
            </Link>
          </Button>
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
