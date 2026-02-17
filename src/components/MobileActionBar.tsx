import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileActionBarProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

export function MobileActionBar({ title, subtitle, actions, className }: MobileActionBarProps) {
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <div
      className={cn(
        'sticky top-10 z-30 flex items-center justify-between gap-2',
        'h-12 px-3 bg-background/95 backdrop-blur-sm border-b border-border/60',
        className
      )}
    >
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-foreground truncate">{title}</h2>
        {subtitle && (
          <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-1 shrink-0">{actions}</div>
      )}
    </div>
  );
}
