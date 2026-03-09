import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileOptimizedLayoutProps {
  children: ReactNode;
  className?: string;
}

export function MobileOptimizedLayout({ children, className }: MobileOptimizedLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen w-full bg-background",
      "touch-manipulation",
      "supports-[height:100dvh]:min-h-[100dvh]",
      className
    )}>
      {children}
    </div>
  );
}