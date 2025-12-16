import { useEffect, useRef } from 'react';
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
}

export function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { variant } = useThemeVariant();
  const { resolvedTheme } = useTheme();
  const animationRef = useRef<number>();
  const starsRef = useRef<Star[]>([]);

  const isMidnight = variant === 'midnight' && resolvedTheme === 'dark';
  const isAurora = variant === 'aurora' && resolvedTheme === 'dark';

  useEffect(() => {
    if (!isMidnight && !isAurora) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const initStars = () => {
      const starCount = isMidnight ? 150 : 80;
      starsRef.current = [];
      
      for (let i = 0; i < starCount; i++) {
        starsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.8 + 0.2,
          speed: Math.random() * 0.15 + 0.05,
          twinkleSpeed: Math.random() * 0.02 + 0.01,
          twinkleOffset: Math.random() * Math.PI * 2,
        });
      }
    };

    let time = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.016;

      // Draw stars
      starsRef.current.forEach((star) => {
        const twinkle = Math.sin(time * star.twinkleSpeed * 60 + star.twinkleOffset) * 0.3 + 0.7;
        const currentOpacity = star.opacity * twinkle;

        // Star glow
        const gradient = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, star.size * 4
        );

        if (isMidnight) {
          // Cosmic purple/cyan stars
          const hue = Math.random() > 0.7 ? 190 : 250;
          gradient.addColorStop(0, `hsla(${hue}, 100%, 90%, ${currentOpacity})`);
          gradient.addColorStop(0.3, `hsla(${hue}, 80%, 70%, ${currentOpacity * 0.5})`);
          gradient.addColorStop(1, 'transparent');
        } else {
          // Aurora stars - more cyan/green tinted
          const hue = Math.random() > 0.5 ? 160 : 180;
          gradient.addColorStop(0, `hsla(${hue}, 90%, 85%, ${currentOpacity})`);
          gradient.addColorStop(0.3, `hsla(${hue}, 70%, 60%, ${currentOpacity * 0.4})`);
          gradient.addColorStop(1, 'transparent');
        }

        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(star.x, star.y, star.size * 4, 0, Math.PI * 2);
        ctx.fill();

        // Star core
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 255, ${currentOpacity})`;
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        // Slowly drift upward
        star.y -= star.speed;
        if (star.y < -10) {
          star.y = canvas.height + 10;
          star.x = Math.random() * canvas.width;
        }
      });

      // Draw aurora waves for Aurora theme
      if (isAurora) {
        drawAurora(ctx, canvas.width, canvas.height, time);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    const drawAurora = (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
      // Aurora wave 1 - Green
      ctx.beginPath();
      ctx.moveTo(0, height * 0.3);
      
      for (let x = 0; x <= width; x += 10) {
        const y = height * 0.3 + 
          Math.sin(x * 0.003 + time * 0.5) * 40 +
          Math.sin(x * 0.007 + time * 0.3) * 20;
        ctx.lineTo(x, y);
      }
      
      ctx.lineTo(width, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      
      const gradient1 = ctx.createLinearGradient(0, 0, 0, height * 0.4);
      gradient1.addColorStop(0, 'hsla(160, 100%, 50%, 0)');
      gradient1.addColorStop(0.5, 'hsla(160, 100%, 50%, 0.08)');
      gradient1.addColorStop(1, 'hsla(160, 100%, 50%, 0)');
      ctx.fillStyle = gradient1;
      ctx.fill();

      // Aurora wave 2 - Cyan/Blue
      ctx.beginPath();
      ctx.moveTo(0, height * 0.35);
      
      for (let x = 0; x <= width; x += 10) {
        const y = height * 0.35 + 
          Math.sin(x * 0.004 + time * 0.4 + 1) * 50 +
          Math.sin(x * 0.008 + time * 0.25) * 25;
        ctx.lineTo(x, y);
      }
      
      ctx.lineTo(width, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      
      const gradient2 = ctx.createLinearGradient(0, 0, 0, height * 0.45);
      gradient2.addColorStop(0, 'hsla(190, 100%, 50%, 0)');
      gradient2.addColorStop(0.5, 'hsla(190, 100%, 50%, 0.06)');
      gradient2.addColorStop(1, 'hsla(190, 100%, 50%, 0)');
      ctx.fillStyle = gradient2;
      ctx.fill();

      // Aurora wave 3 - Purple
      ctx.beginPath();
      ctx.moveTo(0, height * 0.25);
      
      for (let x = 0; x <= width; x += 10) {
        const y = height * 0.25 + 
          Math.sin(x * 0.0025 + time * 0.35 + 2) * 35 +
          Math.sin(x * 0.006 + time * 0.2) * 15;
        ctx.lineTo(x, y);
      }
      
      ctx.lineTo(width, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      
      const gradient3 = ctx.createLinearGradient(0, 0, 0, height * 0.35);
      gradient3.addColorStop(0, 'hsla(280, 80%, 50%, 0)');
      gradient3.addColorStop(0.5, 'hsla(280, 80%, 50%, 0.05)');
      gradient3.addColorStop(1, 'hsla(280, 80%, 50%, 0)');
      ctx.fillStyle = gradient3;
      ctx.fill();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isMidnight, isAurora]);

  if (!isMidnight && !isAurora) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.8 }}
    />
  );
}
