import { Button } from "@/components/ui/button";
import { Brain, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { MinimalSidebar } from "./MinimalSidebar";
import { CreateCardDialog } from "./CreateCardDialog";
import { ZettelCard, OrganizationMethod } from "@/types/zettel";

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

        {/* Logo */}
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">PendragonX</span>
        </div>

        {/* Quick Create */}
        <CreateCardDialog 
          onCreateCard={onCreateCard}
          existingCards={existingCards}
          organizationMethod={organizationMethod}
        />
      </div>
    </header>
  );
}
