import { useEffect, useRef, useCallback } from 'react';
import { useThemeVariant } from '@/hooks/useThemeVariant';
import { useTheme } from 'next-themes';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  hue: number;
}

export function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { variant } = useThemeVariant();
  const { resolvedTheme } = useTheme();
  const animationRef = useRef<number>();
  const starsRef = useRef<Star[]>([]);
  const lastFrameTimeRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  const isMidnight = variant === 'midnight' && resolvedTheme === 'dark';
  const isAurora = variant === 'aurora' && resolvedTheme === 'dark';

  const initStars = useCallback((width: number, height: number) => {
    // Reduced star count for performance
    const starCount = isMidnight ? 50 : 30;
    starsRef.current = [];
    
    for (let i = 0; i < starCount; i++) {
      starsRef.current.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.6 + 0.2,
        speed: Math.random() * 0.1 + 0.02,
        twinkleSpeed: Math.random() * 0.01 + 0.005,
        twinkleOffset: Math.random() * Math.PI * 2,
        hue: isMidnight ? (Math.random() > 0.7 ? 190 : 250) : (Math.random() > 0.5 ? 160 : 180),
      });
    }
  }, [isMidnight]);

  useEffect(() => {
    if (!isMidnight && !isAurora) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Use device pixel ratio but cap it for performance
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resizeCanvas = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      initStars(width, height);
    };

    // Throttled animation - target 30fps instead of 60fps
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastFrameTimeRef.current;
      
      if (deltaTime >= frameInterval) {
        lastFrameTimeRef.current = currentTime - (deltaTime % frameInterval);
        timeRef.current += 0.033; // ~30fps time step
        
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        ctx.clearRect(0, 0, width, height);

        // Draw stars with simple circles (no gradients)
        starsRef.current.forEach((star) => {
          const twinkle = Math.sin(timeRef.current * star.twinkleSpeed * 30 + star.twinkleOffset) * 0.3 + 0.7;
          const currentOpacity = star.opacity * twinkle;

          // Simple glow effect with a larger translucent circle
          ctx.beginPath();
          ctx.fillStyle = `hsla(${star.hue}, 80%, 70%, ${currentOpacity * 0.3})`;
          ctx.arc(star.x, star.y, star.size * 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Star core
          ctx.beginPath();
          ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();

          // Slowly drift upward
          star.y -= star.speed;
          if (star.y < -10) {
            star.y = height + 10;
            star.x = Math.random() * width;
          }
        });

        // Draw simplified aurora waves for Aurora theme
        if (isAurora) {
          drawAurora(ctx, width, height, timeRef.current);
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    const drawAurora = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
      // Simplified aurora with larger step size
      const step = 30;
      
      // Aurora wave 1 - Green
      ctx.beginPath();
      ctx.moveTo(0, height * 0.3);
      
      for (let x = 0; x <= width; x += step) {
        const y = height * 0.3 + 
          Math.sin(x * 0.003 + time * 0.3) * 40;
        ctx.lineTo(x, y);
      }
      
      ctx.lineTo(width, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fillStyle = 'hsla(160, 100%, 50%, 0.06)';
      ctx.fill();

      // Aurora wave 2 - Cyan
      ctx.beginPath();
      ctx.moveTo(0, height * 0.35);
      
      for (let x = 0; x <= width; x += step) {
        const y = height * 0.35 + 
          Math.sin(x * 0.004 + time * 0.25 + 1) * 50;
        ctx.lineTo(x, y);
      }
      
      ctx.lineTo(width, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fillStyle = 'hsla(190, 100%, 50%, 0.04)';
      ctx.fill();
    };

    resizeCanvas();
    
    // Debounced resize handler
    let resizeTimeout: number;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(resizeCanvas, 200);
    };
    
    window.addEventListener('resize', handleResize);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isMidnight, isAurora, initStars]);

  if (!isMidnight && !isAurora) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.7 }}
    />
  );
}
