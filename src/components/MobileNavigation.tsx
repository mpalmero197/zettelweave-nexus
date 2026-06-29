import { useState, useRef, useEffect } from 'react';
import {
  Home, FileText, StickyNote, Calendar, Settings,
  FolderOpen, Trash2, BookOpen, Mic, Palette, Bot, Pencil, Search,
  BarChart3, Users, Target, Lightbulb, Bug, CreditCard, Download,
  LogOut, X, LayoutGrid, Lock, GraduationCap, Sparkles, Box, FolderKanban, Focus, Puzzle, Crown, Wand2,
  
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { usePremiumAccess } from '@/hooks/usePremiumAccess';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { MobileFocusSheet } from './focus-sidebar/MobileFocusSheet';
import { useFocusState } from './focus-sidebar/useFocusState';

interface MobileNavigationProps {
  isAdmin?: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onSearchWithQuery?: (query: string) => void;
  onSignOut?: () => void;
  onAccountSettings?: () => void;
}

const PREMIUM_TABS = new Set([
  'graph', 'canvas', 'journal', 'recorder', 'collab',
  'learning', 'spaces', 'projects', 'knowledge-gaps', 'integrations',
]);

const SECTIONS = [
  { 
    label: 'Quick Access',
    items: [
      { id: 'dashboard', label: 'Home', icon: Home },
      { id: 'hub', label: 'Capture Hub', icon: FileText },
      { id: 'calendar', label: 'Calendar', icon: Calendar },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { id: 'spaces', label: 'Spaces', icon: Box },
      { id: 'graph', label: 'Graph', icon: BarChart3 },
      { id: 'files', label: 'Files', icon: FolderOpen },
      { id: 'learning', label: 'Learning', icon: GraduationCap },
      { id: 'knowledge-gaps', label: 'Gaps', icon: Lightbulb },
    ],
  },
  {
    label: 'Planner',
    items: [
      { id: 'journal', label: 'Journal', icon: StickyNote },
      { id: 'projects', label: 'Projects', icon: FolderKanban },
    ],
  },
  {
    label: 'Create & Collaborate',
    items: [
      { id: 'catalyst', label: 'Catalyst', icon: Lightbulb },
      { id: 'collab', label: 'Collab', icon: Users },
      { id: 'recorder', label: 'Recorder', icon: Mic },
      { id: 'canvas', label: 'Canvas', icon: Palette },
      { id: 'integrations', label: 'Connectors', icon: Puzzle },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'recycle', label: 'Recycle Bin', icon: Trash2 },
    ],
  },
];

export function MobileNavigation({
  isAdmin = false,
  activeTab = 'dashboard',
  onTabChange,
  onSearchWithQuery,
  onSignOut,
  onAccountSettings,
}: MobileNavigationProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const { hasAccess: hasPremium } = usePremiumAccess();
  const { isRunning: focusRunning, seconds: focusSeconds, totalSeconds: focusTotalSeconds, mode: focusMode } = useFocusState();
  const [searchFocused, setSearchFocused] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusSheetOpen, setFocusSheetOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);

  // Track visual viewport to detect keyboard
  useEffect(() => {
    if (!open) return;

    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      const kbHeight = window.innerHeight - vv.height;
      setKeyboardOffset(kbHeight > 50 ? kbHeight : 0);
    };

    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, [open]);

  // Reset when sheet closes
  useEffect(() => {
    if (!open) {
      setSearchFocused(false);
      setKeyboardOffset(0);
    }
  }, [open]);

  const handleNav = (id: string) => {
    setOpen(false);
    onTabChange?.(id);
  };

  const handleSearchSubmit = () => {
    const q = searchQuery.trim();
    setOpen(false);
    if (q && onSearchWithQuery) {
      onSearchWithQuery(q);
      setSearchQuery('');
    } else {
      onTabChange?.('search');
    }
  };

  const isKeyboardUp = searchFocused && keyboardOffset > 50;

  // Move early return to after all hook declarations to avoid Rules of Hooks violations
  if (!isMobile) return null;

  return (
    <>
      {/* FAB — with focus progress ring */}
      <button
        onClick={() => setOpen(prev => !prev)}
        data-onboarding="mobile-nav-fab"
        className={cn(
          'md:hidden fixed bottom-6 right-4 z-50 h-14 w-14 rounded-2xl',
          'flex items-center justify-center',
          'bg-primary text-primary-foreground shadow-lg',
          'transition-all duration-200 active:scale-90',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          open && 'rotate-90 rounded-full'
        )}
        aria-label={open ? 'Close menu' : 'Open menu'}
      >
        {open ? <X className="h-6 w-6" /> : <LayoutGrid className="h-6 w-6" />}
        {/* Progress ring overlay */}
        {focusRunning && !open && (
          <svg
            className="absolute inset-0 w-14 h-14 -rotate-90 pointer-events-none"
            viewBox="0 0 56 56"
          >
            <circle
              cx="28" cy="28" r="25"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              opacity={0.15}
            />
            <circle
              cx="28" cy="28" r="25"
              fill="none"
              stroke={focusMode === 'work' ? 'hsl(var(--primary-foreground))' : 'hsl(142 71% 45%)'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 25}`}
              strokeDashoffset={`${2 * Math.PI * 25 * (1 - (focusTotalSeconds > 0 ? (focusTotalSeconds - focusSeconds) / focusTotalSeconds : 0))}`}
              className="transition-[stroke-dashoffset] duration-1000 ease-linear"
            />
          </svg>
        )}
      </button>

      {/* Full menu sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] px-4 pt-5 pb-0 flex flex-col bg-card border-border">
          {/* Scrollable nav content */}
          <div className="overflow-y-auto flex-1 pb-2">
            {SECTIONS.map((section) => (
              <div key={section.label} className="mb-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                  {section.label}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    const isPremiumItem = PREMIUM_TABS.has(item.id) && !hasPremium;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNav(item.id)}
                        className={cn(
                          'flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 transition-all touch-manipulation min-h-[68px] relative',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted/50 text-foreground active:scale-95 active:bg-accent'
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                        <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
                        {isPremiumItem && (
                          <Crown className="h-3 w-3 text-primary absolute top-1.5 right-1.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Automation section */}
            <div className="mb-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Automation
              </p>
              <div className="grid grid-cols-4 gap-2">
                {isAdmin && (
                  <>
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
                    <button
                      onClick={() => handleNav('debugger')}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 transition-all touch-manipulation min-h-[68px]',
                        activeTab === 'debugger'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50 text-foreground active:scale-95 active:bg-accent'
                      )}
                    >
                      <Bug className="h-5 w-5" aria-hidden="true" />
                      <span className="text-[10px] font-medium leading-tight text-center">Debugger</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Learn & Security */}
            <div className="mb-4">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                Learn & Security
              </p>
              <div className="grid grid-cols-4 gap-2">
                <Link
                  to="/scholar"
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 min-h-[68px] bg-muted/50 text-foreground active:scale-95 active:bg-accent touch-manipulation"
                >
                  <GraduationCap className="h-5 w-5" aria-hidden="true" />
                  <span className="text-[10px] font-medium leading-tight text-center">Scholar</span>
                </Link>
                <Link
                  to="/scholar/sandbox"
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 min-h-[68px] bg-muted/50 text-foreground active:scale-95 active:bg-accent touch-manipulation"
                >
                  <Box className="h-5 w-5" aria-hidden="true" />
                  <span className="text-[10px] font-medium leading-tight text-center">Sandbox</span>
                </Link>
                <Link
                  to="/scholar/alice"
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 min-h-[68px] bg-muted/50 text-foreground active:scale-95 active:bg-accent touch-manipulation"
                >
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                  <span className="text-[10px] font-medium leading-tight text-center">ALICE</span>
                </Link>
                <Link
                  to="/vault"
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 min-h-[68px] bg-muted/50 text-foreground active:scale-95 active:bg-accent touch-manipulation"
                >
                  <Lock className="h-5 w-5" aria-hidden="true" />
                  <span className="text-[10px] font-medium leading-tight text-center">Vault</span>
                </Link>
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
          </div>

          {/* Search bar — pinned at bottom of sheet, locks above keyboard when focused */}
          <div
            ref={searchBarRef}
            className={cn(
              'border-t border-border bg-background px-1 py-3 transition-all duration-200',
              isKeyboardUp && 'fixed left-0 right-0 z-[60] px-4 py-2 border-t border-border bg-background shadow-[0_-4px_12px_rgba(0,0,0,0.1)]'
            )}
            style={isKeyboardUp ? { bottom: `${keyboardOffset}px` } : undefined}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearchSubmit();
              }}
              className="relative"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="AI search cards, notes, web…"
                className="pl-9 pr-12 h-11 rounded-xl bg-muted/50 border-none text-sm"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => {
                  setTimeout(() => setSearchFocused(false), 150);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchSubmit();
                  }
                }}
              />
              {searchQuery.trim() && (
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"
                  aria-label="AI Search"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              )}
            </form>
          </div>
        </SheetContent>
      </Sheet>

      <MobileFocusSheet open={focusSheetOpen} onOpenChange={setFocusSheetOpen} />
    </>
  );
}