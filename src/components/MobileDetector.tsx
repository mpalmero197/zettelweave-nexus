import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileDetectorProps {
  children: React.ReactNode;
}

export function MobileDetector({ children }: MobileDetectorProps) {
  const isMobile = useIsMobile();
  const [deviceInfo, setDeviceInfo] = useState({
    isMobile: false,
    isTablet: false,
    isDesktop: false,
    screenWidth: 0,
    screenHeight: 0,
    orientation: 'portrait' as 'portrait' | 'landscape'
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setDeviceInfo({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        screenWidth: width,
        screenHeight: height,
        orientation: width > height ? 'landscape' : 'portrait'
      });

      // Apply responsive viewport scaling
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        if (width < 768) {
          // Mobile: ensure no zooming and proper touch scaling
          viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
        } else {
          // Desktop/tablet: allow zooming
          viewport.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
        }
      }

      // Apply CSS custom properties for responsive design
      document.documentElement.style.setProperty('--screen-width', `${width}px`);
      document.documentElement.style.setProperty('--screen-height', `${height}px`);
      document.documentElement.style.setProperty('--is-mobile', deviceInfo.isMobile ? '1' : '0');
    };

    updateDeviceInfo();
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, [deviceInfo.isMobile]);

  // Apply device-specific classes to body
  useEffect(() => {
    const body = document.body;
    body.classList.toggle('mobile', deviceInfo.isMobile);
    body.classList.toggle('tablet', deviceInfo.isTablet);
    body.classList.toggle('desktop', deviceInfo.isDesktop);
    body.classList.toggle('landscape', deviceInfo.orientation === 'landscape');
    body.classList.toggle('portrait', deviceInfo.orientation === 'portrait');

    return () => {
      body.classList.remove('mobile', 'tablet', 'desktop', 'landscape', 'portrait');
    };
  }, [deviceInfo]);

  return <>{children}</>;
}