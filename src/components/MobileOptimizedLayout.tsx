import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileOptimizedLayoutProps {
  children: ReactNode;
  className?: string;
}

export function MobileOptimizedLayout({ children, className }: MobileOptimizedLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen bg-gradient-to-br from-background via-background to-background/95",
      "touch-manipulation select-none",
      "supports-[height:100dvh]:min-h-[100dvh]",
      className
    )}>
      <div className="container mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-4">
        {children}
      </div>
    </div>
  );
}