import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileOptimizedLayoutProps {
  children: ReactNode;
  className?: string;
}

export function MobileOptimizedLayout({ children, className }: MobileOptimizedLayoutProps) {
  return (
    <div className={cn(
      "min-h-screen w-full bg-gradient-to-br from-background via-background to-background/95",
      "touch-manipulation",
      "supports-[height:100dvh]:min-h-[100dvh]",
      // Performance optimizations
      "will-change-auto",
      "transform-gpu",
      className
    )}>
      <div className="w-full min-h-screen pb-16">
        {children}
      </div>
    </div>
  );
}