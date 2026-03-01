import { useState } from 'react';
import { Home, FileText, StickyNote, Calendar, MoreHorizontal, Settings, FolderOpen, Trash2, BookOpen, Mic, Palette, Bot, Workflow, Pencil, Search, BarChart3, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface MobileNavigationProps {
  isAdmin?: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const PRIMARY_TABS = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'cards', label: 'Cards', icon: FileText },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
];

const MORE_SECTIONS = [
  { id: 'search', label: 'Search', icon: Search },
  { id: 'stickynotes', label: 'Sticky Notes', icon: Pencil },
  { id: 'scratchpad', label: 'Scratch Pad', icon: BookOpen },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'recorder', label: 'Recorder', icon: Mic },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'habits', label: 'Habits', icon: BarChart3 },
  { id: 'canvas', label: 'Canvas', icon: Palette },
  { id: 'catalyst', label: 'Catalyst', icon: Pencil },
  { id: 'collab', label: 'Collab', icon: Users },
  { id: 'recycle', label: 'Recycle Bin', icon: Trash2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function MobileNavigation({ isAdmin = false, activeTab = 'dashboard', onTabChange }: MobileNavigationProps) {
  const isMobile = useIsMobile();
  const [moreOpen, setMoreOpen] = useState(false);

  if (!isMobile) return null;

  const isMoreActive = MORE_SECTIONS.some(s => s.id === activeTab);

  const handleTab = (id: string) => {
    onTabChange?.(id);
  };

  const handleMoreItem = (id: string) => {
    setMoreOpen(false);
    onTabChange?.(id);
  };

  const adminSections = isAdmin
    ? [{ id: 'admin', label: 'Admin', icon: Bot }]
    : [];

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border shadow-[0_-2px_12px_rgba(0,0,0,0.08)] pb-safe"
        role="navigation"
        aria-label="Bottom navigation"
      >
        <div className="flex items-center justify-around px-1 py-1.5 max-w-screen-sm mx-auto">
          {PRIMARY_TABS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTab(item.id)}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-200 touch-manipulation',
                  'min-w-[56px] min-h-[48px] px-2 py-1.5',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  isActive
                    ? 'bg-primary text-primary-foreground scale-105'
                    : 'text-muted-foreground active:scale-95 active:bg-accent/50'
                )}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={cn('h-5 w-5', isActive && 'scale-110')} aria-hidden="true" />
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-200 touch-manipulation',
              'min-w-[56px] min-h-[48px] px-2 py-1.5',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              isMoreActive
                ? 'bg-primary text-primary-foreground scale-105'
                : 'text-muted-foreground active:scale-95 active:bg-accent/50'
            )}
            aria-label="More sections"
          >
            <MoreHorizontal className={cn('h-5 w-5', isMoreActive && 'scale-110')} aria-hidden="true" />
            <span className="text-[10px] font-medium leading-none">More</span>
          </button>
        </div>
      </nav>

      {/* More sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] pb-safe">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-base">All Sections</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 overflow-y-auto">
            {[...MORE_SECTIONS, ...adminSections].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleMoreItem(item.id)}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 transition-all touch-manipulation',
                    'min-h-[72px]',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-foreground hover:bg-accent active:scale-95'
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span className="text-[11px] font-medium leading-tight text-center">{item.label}</span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
