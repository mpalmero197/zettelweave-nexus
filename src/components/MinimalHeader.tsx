import { useState, useEffect } from "react";
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
import bakuScribeLogoAsset from '@/assets/baku-scribe-logo.png.asset.json';
const pendragonLogo = bakuScribeLogoAsset.url;
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
  const { isOnline: hookOnline } = useOfflineMode();
  const [browserOnline, setBrowserOnline] = useState(navigator.onLine);
  const { theme, setTheme } = useTheme();
  const isOnline = hookOnline && browserOnline;

  useEffect(() => {
    const on = () => setBrowserOnline(true);
    const off = () => setBrowserOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  
  return (
    <header className="h-10 border-b border-border bg-background sticky top-0 z-50" role="banner">
      <div className="h-full px-2 md:px-3 flex items-center justify-between gap-2">
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
            <img src={pendragonLogo} alt="Baku Scribe" className="h-5 w-5 object-contain" />
            <span className="text-sm font-semibold text-foreground">Baku Scribe</span>
            <div className="relative ml-0.5">
              <div 
                className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-amber-500'}`}
                aria-label={isOnline ? 'Online' : 'Offline'}
              />
              {isOnline && (
                <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping opacity-40" />
              )}
            </div>
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
