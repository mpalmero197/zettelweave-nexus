import { useEffect, ReactNode } from 'react';

interface MobileTouchHandlerProps {
  children: ReactNode;
}

export function MobileTouchHandler({ children }: MobileTouchHandlerProps) {
  useEffect(() => {
    // Set CSS custom properties for mobile viewport
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      document.documentElement.style.setProperty('--dvh', `${window.innerHeight}px`);
    };
    
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
    
    // Optimize for iOS momentum scrolling
    (document.body.style as any).webkitOverflowScrolling = 'touch';
    
    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);
  
  return <>{children}</>;
}
