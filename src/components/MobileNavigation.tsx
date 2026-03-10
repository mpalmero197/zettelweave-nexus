import { useState } from 'react';
import {
  Home, FileText, StickyNote, Calendar, MoreHorizontal, Settings,
  FolderOpen, Trash2, BookOpen, Mic, Palette, Bot, Pencil, Search,
  BarChart3, Users, Target, Lightbulb, Bug, CreditCard, Download,
  LogOut, X, LayoutGrid, Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { Link } from 'react-router-dom';

interface MobileNavigationProps {
  isAdmin?: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onSignOut?: () => void;
  onAccountSettings?: () => void;
}

const SECTIONS = [
  {
    label: 'Quick Access',
    items: [
      { id: 'dashboard', label: 'Home', icon: Home },
      { id: 'cards', label: 'Cards', icon: FileText },
      { id: 'notes', label: 'Notes', icon: BookOpen },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
      { id: 'search', label: 'Search', icon: Search },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { id: 'graph', label: 'Graph', icon: BarChart3 },
      { id: 'files', label: 'Files', icon: FolderOpen },
      { id: 'canvas', label: 'Canvas', icon: Palette },
    ],
  },
  {
    label: 'Planner',
    items: [
      { id: 'journal', label: 'Journal', icon: StickyNote },
      { id: 'habits', label: 'Habits', icon: Target },
      { id: 'scratchpad', label: 'Scratchpad', icon: Pencil },
      { id: 'stickynotes', label: 'Sticky Notes', icon: StickyNote },
    ],
  },
  {
    label: 'Create & Collaborate',
    items: [
      { id: 'catalyst', label: 'Catalyst', icon: Lightbulb },
      { id: 'collab', label: 'Collab', icon: Users },
      { id: 'recorder', label: 'Recorder', icon: Mic },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'recycle', label: 'Recycle Bin', icon: Trash2 },
      { id: 'debugger', label: 'Debugger', icon: Bug },
    ],
  },
];

export function MobileNavigation({
  isAdmin = false,
  activeTab = 'dashboard',
  onTabChange,
  onSignOut,
  onAccountSettings,
}: MobileNavigationProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const { hasPremium } = useSubscription();

  if (!isMobile) return null;

  const handleNav = (id: string) => {
    setOpen(false);
    onTabChange?.(id);
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          'md:hidden fixed bottom-6 right-4 z-50 h-14 w-14 rounded-full',
          'flex items-center justify-center',
          'bg-primary text-primary-foreground shadow-lg',
          'transition-transform duration-200 active:scale-90',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          open && 'rotate-90'
        )}
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        {open ? <X className="h-6 w-6" /> : <LayoutGrid className="h-6 w-6" />}
      </button>

      {/* Full menu sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] pb-safe px-4 pt-5 overflow-y-auto">
          {/* Sections */}
          {SECTIONS.map((section) => (
            <div key={section.label} className="mb-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                {section.label}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 transition-all touch-manipulation min-h-[68px]',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50 text-foreground active:scale-95 active:bg-accent'
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Automation section — special handling for Agents */}
          <div className="mb-4">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
              Automation
            </p>
            <div className="grid grid-cols-4 gap-2">
              {hasPremium ? (
                <Link
                  to="/agents"
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 transition-all touch-manipulation min-h-[68px]',
                    activeTab === 'agents'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-foreground active:scale-95 active:bg-accent'
                  )}
                >
                  <Bot className="h-5 w-5" aria-hidden="true" />
                  <span className="text-[10px] font-medium leading-tight text-center">Agents</span>
                </Link>
              ) : (
                <Link
                  to="/subscription"
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 transition-all touch-manipulation min-h-[68px] bg-muted/50 text-muted-foreground active:scale-95"
                >
                  <Lock className="h-5 w-5" aria-hidden="true" />
                  <span className="text-[10px] font-medium leading-tight text-center">Agents</span>
                  <Badge variant="outline" className="text-[8px] px-1 py-0 leading-none">PRO</Badge>
                </Link>
              )}

              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 transition-all touch-manipulation min-h-[68px]',
                    activeTab === 'admin'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-foreground active:scale-95 active:bg-accent'
                  )}
                >
                  <Bot className="h-5 w-5" aria-hidden="true" />
                  <span className="text-[10px] font-medium leading-tight text-center">Admin</span>
                </Link>
              )}
            </div>
          </div>

          {/* Footer actions */}
          <div className="border-t border-border pt-3 mt-2">
            <div className="grid grid-cols-4 gap-2">
              <Link
                to="/install"
                onClick={() => setOpen(false)}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 min-h-[68px] bg-muted/50 text-foreground active:scale-95 active:bg-accent touch-manipulation"
              >
                <Download className="h-5 w-5" aria-hidden="true" />
                <span className="text-[10px] font-medium leading-tight text-center">Install</span>
              </Link>
              <Link
                to="/subscription"
                onClick={() => setOpen(false)}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 min-h-[68px] bg-muted/50 text-foreground active:scale-95 active:bg-accent touch-manipulation"
              >
                <CreditCard className="h-5 w-5" aria-hidden="true" />
                <span className="text-[10px] font-medium leading-tight text-center">Billing</span>
              </Link>
              <button
                onClick={() => { setOpen(false); onAccountSettings?.(); }}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 min-h-[68px] bg-muted/50 text-foreground active:scale-95 active:bg-accent touch-manipulation"
              >
                <Settings className="h-5 w-5" aria-hidden="true" />
                <span className="text-[10px] font-medium leading-tight text-center">Settings</span>
              </button>
              <button
                onClick={() => { setOpen(false); onSignOut?.(); }}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 min-h-[68px] bg-destructive/10 text-destructive active:scale-95 touch-manipulation"
              >
                <LogOut className="h-5 w-5" aria-hidden="true" />
                <span className="text-[10px] font-medium leading-tight text-center">Sign Out</span>
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
