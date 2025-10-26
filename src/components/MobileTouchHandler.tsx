import { useEffect, ReactNode } from 'react';

interface MobileTouchHandlerProps {
  children: ReactNode;
}

export function MobileTouchHandler({ children }: MobileTouchHandlerProps) {
  useEffect(() => {
    // Optimize touch responsiveness
    let touchStartX = 0;
    let touchStartY = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      // Prevent pull-to-refresh on mobile
      const touchY = e.touches[0].clientY;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      if (scrollTop === 0 && touchY > touchStartY) {
        e.preventDefault();
      }
    };
    
    // Add passive event listeners for better scroll performance
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    
    // Optimize for iOS momentum scrolling - type cast to any for webkit property
    (document.body.style as any).webkitOverflowScrolling = 'touch';
    
    // Prevent double-tap zoom
    let lastTouchEnd = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };
    
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Set CSS custom properties for mobile
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
      document.documentElement.style.setProperty('--dvh', `${window.innerHeight}px`);
    };
    
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);
  
  return <>{children}</>;
}
