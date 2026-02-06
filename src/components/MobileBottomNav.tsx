import { Home, FileText, Calendar, Bot, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import pendragonLogo from '@/assets/pendragon-logo.png';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { useNavigate } from 'react-router-dom';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const { isOnline } = useOfflineMode();
  const navigate = useNavigate();
  
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home, ariaLabel: 'Navigate to dashboard' },
    { id: 'cards', label: 'Cards', icon: FileText, ariaLabel: 'Navigate to cards' },
    { id: 'agents', label: 'Agents', icon: Bot, ariaLabel: 'Navigate to agents', isRoute: true, route: '/agents' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, ariaLabel: 'Navigate to calendar' },
    { id: 'settings', label: 'Settings', icon: Settings, ariaLabel: 'Navigate to settings' },
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.isRoute && item.route) {
      navigate(item.route);
    } else {
      onTabChange(item.id);
    }
  };

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-background via-background/98 to-background/95 backdrop-blur-xl border-t border-border/40 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] pb-safe"
      role="navigation"
      aria-label="Bottom navigation"
    >
      {/* Logo and Status - Mobile Only */}
      <div className="flex items-center justify-center gap-2 py-2 border-b border-border/30">
        <img src={pendragonLogo} alt="PendragonX" className="h-5 w-5 object-contain" />
        <span className="text-xs font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
          PendragonX
        </span>
        <div 
          className={`h-1.5 w-1.5 rounded-full transition-all ${isOnline ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-muted-foreground/40'}`}
          aria-label={isOnline ? 'Online' : 'Offline'}
        />
      </div>
      
      <div className="flex items-center justify-around px-2 py-2 max-w-screen-sm mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-2xl',
                'transition-all duration-300 ease-out touch-manipulation',
                'min-w-[64px] min-h-[56px]',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground active:scale-95'
              )}
              aria-label={item.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon 
                className={cn(
                  'h-6 w-6 transition-all duration-300',
                  isActive && 'scale-110 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]'
                )} 
                aria-hidden="true"
              />
              <span className={cn(
                "text-[10px] font-medium leading-none transition-all duration-300",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
