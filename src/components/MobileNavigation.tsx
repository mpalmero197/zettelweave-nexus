import { Home, FileText, Brain, Calendar, Settings, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: FileText, label: 'Notes', path: '/notes' },
  { icon: Brain, label: 'Cards', path: '/cards' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function MobileNavigation() {
  const isMobile = useIsMobile();
  
  if (!isMobile) return null;
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border shadow-2xl mobile-safe-area">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 touch-manipulation',
                'min-w-[60px] min-h-[56px]',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground active:scale-95'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  className={cn(
                    'h-6 w-6 transition-transform',
                    isActive && 'scale-110'
                  )} 
                />
                <span className="text-[10px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
