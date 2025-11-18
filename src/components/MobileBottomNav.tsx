import { Home, FileText, Calendar, Folders, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home, ariaLabel: 'Navigate to dashboard' },
    { id: 'cards', label: 'Cards', icon: FileText, ariaLabel: 'Navigate to cards' },
    { id: 'calendar', label: 'Calendar', icon: Calendar, ariaLabel: 'Navigate to calendar' },
    { id: 'notebooks', label: 'Notebooks', icon: Folders, ariaLabel: 'Navigate to notebooks' },
    { id: 'settings', label: 'Settings', icon: Settings, ariaLabel: 'Navigate to settings' },
  ];

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border shadow-2xl pb-safe"
      role="navigation"
      aria-label="Bottom navigation"
    >
      <div className="flex items-center justify-around px-2 py-2 max-w-screen-sm mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl',
                'transition-all duration-200 ease-out touch-manipulation',
                'min-w-[64px] min-h-[56px]',
                'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground active:scale-95'
              )}
              aria-label={item.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon 
                className={cn(
                  'h-6 w-6 transition-transform',
                  isActive && 'scale-110'
                )} 
                aria-hidden="true"
              />
              <span className="text-[10px] font-medium leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
