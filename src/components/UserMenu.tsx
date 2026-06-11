import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Settings, CreditCard, Download, Shield, LogOut, Inbox, KeyRound, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UserMenuProps {
  isAdmin: boolean;
  onSignOut: () => void;
}

export function UserMenu({ isAdmin, onSignOut }: UserMenuProps) {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hidden md:flex">
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuItem onClick={() => navigate("/shared")} className="gap-2 cursor-pointer">
          <Inbox className="h-4 w-4" />
          Shared with Me
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/vault")} className="gap-2 cursor-pointer">
          <KeyRound className="h-4 w-4" />
          Secure Vault
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/scholar")} className="gap-2 cursor-pointer">
          <GraduationCap className="h-4 w-4" />
          Scholar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/settings")} className="gap-2 cursor-pointer">
          <Settings className="h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/subscription")} className="gap-2 cursor-pointer">
          <CreditCard className="h-4 w-4" />
          Subscription
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/install")} className="gap-2 cursor-pointer">
          <Download className="h-4 w-4" />
          Install App
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-2 cursor-pointer">
              <Shield className="h-4 w-4" />
              Admin Panel
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} className="gap-2 cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
