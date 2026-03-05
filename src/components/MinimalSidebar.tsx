import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Home,
  FileText,
  BarChart3,
  BookOpen,
  FolderOpen,
  Palette,
  GitBranch,
  CalendarIcon,
  StickyNote,
  Target,
  Lightbulb,
  Users,
  Mic,
  Trash2,
  Shield,
  Settings,
  LogOut,
  FileEdit,
  CreditCard,
  Bot,
  Download,
  Bug,
  Lock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";

interface MinimalSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSignOut: () => void;
  onAccountSettings: () => void;
  isAdmin: boolean;
}

export function MinimalSidebar({
  activeTab,
  onTabChange,
  onSignOut,
  onAccountSettings,
  isAdmin,
}: MinimalSidebarProps) {
  const { hasPremium } = useSubscription();
  const NavButton = ({ tab, icon: Icon, label }: { tab: string; icon: any; label: string }) => (
    <Button
      variant={activeTab === tab ? "secondary" : "ghost"}
      onClick={() => onTabChange(tab)}
      className="w-full justify-start h-9 px-3 text-sm"
    >
      <Icon className="h-4 w-4 mr-3" />
      {label}
    </Button>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border/50">
        <h2 className="text-sm font-semibold text-muted-foreground">Navigation</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          <NavButton tab="dashboard" icon={Home} label="Dashboard" />
          
          <Separator className="my-2" />
          
          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Knowledge
          </div>
          <NavButton tab="cards" icon={FileText} label="Cards" />
          <NavButton tab="graph" icon={BarChart3} label="Graph" />
          <NavButton tab="notes" icon={BookOpen} label="Notes & Notebooks" />
          <NavButton tab="files" icon={FolderOpen} label="Files" />
          
          <Separator className="my-2" />
          
          <NavButton tab="canvas" icon={Palette} label="Canvas Studio" />
          
          <Separator className="my-2" />
          
          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Planner
          </div>
          <NavButton tab="calendar" icon={CalendarIcon} label="Calendar" />
          <NavButton tab="journal" icon={StickyNote} label="Journal" />
          <NavButton tab="habits" icon={Target} label="Habits" />
          <NavButton tab="scratchpad" icon={FileEdit} label="Scratchpad" />
          <NavButton tab="stickynotes" icon={StickyNote} label="Sticky Notes" />
          
          <Separator className="my-2" />
          
          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Collaborate
          </div>
          <NavButton tab="catalyst" icon={Lightbulb} label="Catalyst" />
          <NavButton tab="resume" icon={FileText} label="Resume AI" />
          <NavButton tab="collab" icon={Users} label="Collab" />
          
          <Separator className="my-2" />
          
          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
            Automation
          </div>
          {hasPremium ? (
            <Link to="/agents">
              <Button variant="ghost" className="w-full justify-start h-9 px-3 text-sm">
                <Bot className="h-4 w-4 mr-3" />
                Agents
              </Button>
            </Link>
          ) : (
            <Link to="/subscription">
              <Button variant="ghost" className="w-full justify-start h-9 px-3 text-sm text-muted-foreground">
                <Lock className="h-4 w-4 mr-3" />
                Agents
                <Badge variant="outline" className="ml-auto text-[9px] px-1 py-0">PRO</Badge>
              </Button>
            </Link>
          )}
          
          <Separator className="my-2" />
          
          <NavButton tab="recorder" icon={Mic} label="Recorder" />
          <NavButton tab="recycle" icon={Trash2} label="Recycle Bin" />
          
          <Separator className="my-2" />
          
          <NavButton tab="debugger" icon={Bug} label="Debugger Console" />
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border/50 space-y-1">
        <Link to="/install">
          <Button variant="ghost" className="w-full justify-start h-9 px-3 text-sm">
            <Download className="h-4 w-4 mr-3" />
            Install App
          </Button>
        </Link>
        {isAdmin && (
          <Link to="/admin">
            <Button variant="ghost" className="w-full justify-start h-9 px-3 text-sm">
              <Shield className="h-4 w-4 mr-3" />
              Admin
            </Button>
          </Link>
        )}
        <Link to="/subscription">
          <Button variant="ghost" className="w-full justify-start h-9 px-3 text-sm">
            <CreditCard className="h-4 w-4 mr-3" />
            Subscription
          </Button>
        </Link>
        <Button
          variant="ghost"
          onClick={onAccountSettings}
          className="w-full justify-start h-9 px-3 text-sm"
        >
          <Settings className="h-4 w-4 mr-3" />
          Settings
        </Button>
        <Button
          variant="ghost"
          onClick={onSignOut}
          className="w-full justify-start h-9 px-3 text-sm text-destructive hover:text-destructive"
        >
          <LogOut className="h-4 w-4 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
