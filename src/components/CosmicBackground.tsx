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

type PerformanceLevel = 'high' | 'medium' | 'low' | 'minimal';

const PERFORMANCE_CONFIG = {
  high: { starCount: 50, targetFPS: 30, enableAurora: true, enableGlow: true },
  medium: { starCount: 30, targetFPS: 24, enableAurora: true, enableGlow: true },
  low: { starCount: 15, targetFPS: 20, enableAurora: false, enableGlow: false },
  minimal: { starCount: 8, targetFPS: 15, enableAurora: false, enableGlow: false },
};

export function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { variant } = useThemeVariant();
  const { resolvedTheme } = useTheme();
  const animationRef = useRef<number>();
  const starsRef = useRef<Star[]>([]);
  const timeRef = useRef<number>(0);
  
  // Performance monitoring refs
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(0);
  const performanceLevelRef = useRef<PerformanceLevel>('high');
  const consecutiveLowFramesRef = useRef<number>(0);
  const lastPerformanceCheckRef = useRef<number>(0);

  const isMidnight = variant === 'midnight' && resolvedTheme === 'dark';
  const isAurora = variant === 'aurora' && resolvedTheme === 'dark';

  const initStars = useCallback((width: number, height: number, count: number) => {
    starsRef.current = [];
    
    for (let i = 0; i < count; i++) {
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

  const checkPerformance = useCallback((currentTime: number) => {
    // Only check performance every 2 seconds
    if (currentTime - lastPerformanceCheckRef.current < 2000) return;
    lastPerformanceCheckRef.current = currentTime;
    
    const frameTimes = frameTimesRef.current;
    if (frameTimes.length < 10) return;
    
    // Calculate average FPS from recent frames
    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const currentFPS = 1000 / avgFrameTime;
    
    const currentLevel = performanceLevelRef.current;
    const config = PERFORMANCE_CONFIG[currentLevel];
    
    // If FPS is significantly below target, downgrade
    if (currentFPS < config.targetFPS * 0.7) {
      consecutiveLowFramesRef.current++;
      
      if (consecutiveLowFramesRef.current >= 2) {
        // Downgrade performance level
        if (currentLevel === 'high') {
          performanceLevelRef.current = 'medium';
        } else if (currentLevel === 'medium') {
          performanceLevelRef.current = 'low';
        } else if (currentLevel === 'low') {
          performanceLevelRef.current = 'minimal';
        }
        consecutiveLowFramesRef.current = 0;
      }
    } else if (currentFPS > config.targetFPS * 1.2 && consecutiveLowFramesRef.current === 0) {
      // Consider upgrading if performance is good (but be conservative)
      // Only upgrade if we've been stable for a while
    } else {
      consecutiveLowFramesRef.current = 0;
    }
    
    // Keep only recent frame times
    frameTimesRef.current = frameTimes.slice(-20);
  }, []);

  useEffect(() => {
    if (!isMidnight && !isAurora) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const resizeCanvas = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      
      const config = PERFORMANCE_CONFIG[performanceLevelRef.current];
      const starCount = isMidnight ? config.starCount : Math.floor(config.starCount * 0.6);
      initStars(width, height, starCount);
    };

    const animate = (currentTime: number) => {
      // Track frame time for performance monitoring
      if (lastFrameTimeRef.current > 0) {
        const frameTime = currentTime - lastFrameTimeRef.current;
        frameTimesRef.current.push(frameTime);
      }
      lastFrameTimeRef.current = currentTime;
      
      // Check and adjust performance
      checkPerformance(currentTime);
      
      const config = PERFORMANCE_CONFIG[performanceLevelRef.current];
      const frameInterval = 1000 / config.targetFPS;
      
      // Reinitialize stars if performance level changed star count
      if (starsRef.current.length !== (isMidnight ? config.starCount : Math.floor(config.starCount * 0.6))) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const starCount = isMidnight ? config.starCount : Math.floor(config.starCount * 0.6);
        initStars(width, height, starCount);
      }
      
      timeRef.current += 0.033;
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      ctx.clearRect(0, 0, width, height);

      // Draw stars
      starsRef.current.forEach((star) => {
        const twinkle = Math.sin(timeRef.current * star.twinkleSpeed * 30 + star.twinkleOffset) * 0.3 + 0.7;
        const currentOpacity = star.opacity * twinkle;

        // Only draw glow if enabled
        if (config.enableGlow) {
          ctx.beginPath();
          ctx.fillStyle = `hsla(${star.hue}, 80%, 70%, ${currentOpacity * 0.3})`;
          ctx.arc(star.x, star.y, star.size * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

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

      // Draw aurora only if enabled and is aurora theme
      if (isAurora && config.enableAurora) {
        drawAurora(ctx, width, height, timeRef.current);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    const drawAurora = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
      const step = 40;
      
      ctx.beginPath();
      ctx.moveTo(0, height * 0.3);
      
      for (let x = 0; x <= width; x += step) {
        const y = height * 0.3 + Math.sin(x * 0.003 + time * 0.3) * 40;
        ctx.lineTo(x, y);
      }
      
      ctx.lineTo(width, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fillStyle = 'hsla(160, 100%, 50%, 0.05)';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, height * 0.35);
      
      for (let x = 0; x <= width; x += step) {
        const y = height * 0.35 + Math.sin(x * 0.004 + time * 0.25 + 1) * 50;
        ctx.lineTo(x, y);
      }
      
      ctx.lineTo(width, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fillStyle = 'hsla(190, 100%, 50%, 0.04)';
      ctx.fill();
    };

    resizeCanvas();
    
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
  }, [isMidnight, isAurora, initStars, checkPerformance]);

  if (!isMidnight && !isAurora) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.7 }}
    />
  );
}
