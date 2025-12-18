import { useTheme } from 'next-themes';
import { useThemeVariant } from '@/hooks/useThemeVariant';
import { useEffect, useRef, useState } from 'react';

export function LandingBackground() {
  const { resolvedTheme } = useTheme();
  const { variant } = useThemeVariant();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });

  const isDark = resolvedTheme === 'dark';
  
  // Check for reduced motion preferences
  const prefersReducedMotion = typeof window !== 'undefined' && 
    (document.documentElement.classList.contains('no-theme-animations') ||
     document.documentElement.classList.contains('simplified-transitions'));

  // Get theme-specific colors
  const getThemeColors = () => {
    const baseColors = {
      light: {
        primary: { h: 220, s: 90, l: 55 },
        secondary: { h: 280, s: 70, l: 60 },
        accent: { h: 200, s: 80, l: 50 },
      },
      dark: {
        primary: { h: 220, s: 90, l: 60 },
        secondary: { h: 280, s: 70, l: 65 },
        accent: { h: 200, s: 80, l: 55 },
      },
      ocean: {
        primary: { h: 200, s: 85, l: isDark ? 55 : 45 },
        secondary: { h: 180, s: 70, l: isDark ? 50 : 40 },
        accent: { h: 220, s: 80, l: isDark ? 60 : 50 },
      },
      forest: {
        primary: { h: 140, s: 60, l: isDark ? 45 : 35 },
        secondary: { h: 100, s: 50, l: isDark ? 40 : 30 },
        accent: { h: 160, s: 55, l: isDark ? 50 : 40 },
      },
      sunset: {
        primary: { h: 25, s: 90, l: isDark ? 55 : 50 },
        secondary: { h: 350, s: 80, l: isDark ? 50 : 45 },
        accent: { h: 45, s: 85, l: isDark ? 60 : 55 },
      },
      lavender: {
        primary: { h: 280, s: 70, l: isDark ? 60 : 50 },
        secondary: { h: 320, s: 60, l: isDark ? 55 : 45 },
        accent: { h: 260, s: 65, l: isDark ? 65 : 55 },
      },
      midnight: {
        primary: { h: 250, s: 80, l: 60 },
        secondary: { h: 190, s: 90, l: 55 },
        accent: { h: 280, s: 70, l: 65 },
      },
      aurora: {
        primary: { h: 160, s: 80, l: 50 },
        secondary: { h: 190, s: 85, l: 55 },
        accent: { h: 280, s: 70, l: 60 },
      },
    };

    const themeKey = variant || (isDark ? 'dark' : 'light');
    return baseColors[themeKey as keyof typeof baseColors] || baseColors[isDark ? 'dark' : 'light'];
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    interface Orb {
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      color: { h: number; s: number; l: number };
      phase: number;
    }

    const orbs: Orb[] = [];
    const colors = getThemeColors();

    // Create floating orbs
    const createOrbs = () => {
      orbs.length = 0;
      const orbColors = [colors.primary, colors.secondary, colors.accent];
      
      for (let i = 0; i < 5; i++) {
        orbs.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: 200 + Math.random() * 300,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          color: orbColors[i % orbColors.length],
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    createOrbs();

    let time = 0;
    const animate = () => {
      time += 0.008;
      
      // Clear with fade effect for trails
      ctx.fillStyle = isDark 
        ? 'rgba(10, 10, 20, 0.03)' 
        : 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw orbs with soft glow
      orbs.forEach((orb, index) => {
        // Update position with slight mouse influence
        const mouseInfluenceX = (mousePosition.x - 0.5) * 30;
        const mouseInfluenceY = (mousePosition.y - 0.5) * 30;
        
        orb.x += orb.vx + Math.sin(time + orb.phase) * 0.5;
        orb.y += orb.vy + Math.cos(time + orb.phase) * 0.5;

        // Wrap around edges
        if (orb.x < -orb.radius) orb.x = canvas.width + orb.radius;
        if (orb.x > canvas.width + orb.radius) orb.x = -orb.radius;
        if (orb.y < -orb.radius) orb.y = canvas.height + orb.radius;
        if (orb.y > canvas.height + orb.radius) orb.y = -orb.radius;

        // Draw orb with gradient
        const displayX = orb.x + mouseInfluenceX * (index * 0.2 + 0.5);
        const displayY = orb.y + mouseInfluenceY * (index * 0.2 + 0.5);
        const pulseFactor = 1 + Math.sin(time * 2 + orb.phase) * 0.1;
        const currentRadius = orb.radius * pulseFactor;

        const gradient = ctx.createRadialGradient(
          displayX, displayY, 0,
          displayX, displayY, currentRadius
        );

        const opacity = isDark ? 0.15 : 0.12;
        gradient.addColorStop(0, `hsla(${orb.color.h}, ${orb.color.s}%, ${orb.color.l}%, ${opacity})`);
        gradient.addColorStop(0.5, `hsla(${orb.color.h}, ${orb.color.s}%, ${orb.color.l}%, ${opacity * 0.5})`);
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(displayX, displayY, currentRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw subtle mesh/grid lines for some themes
      if (variant === 'midnight' || variant === 'aurora') {
        drawMeshLines(ctx, canvas.width, canvas.height, time, colors);
      }

      // Draw floating particles
      drawParticles(ctx, canvas.width, canvas.height, time, colors, isDark);

      animationRef.current = requestAnimationFrame(animate);
    };

    const drawMeshLines = (
      ctx: CanvasRenderingContext2D, 
      width: number, 
      height: number, 
      time: number,
      colors: ReturnType<typeof getThemeColors>
    ) => {
      ctx.strokeStyle = `hsla(${colors.accent.h}, ${colors.accent.s}%, ${colors.accent.l}%, 0.03)`;
      ctx.lineWidth = 1;

      // Horizontal flowing lines
      for (let y = 0; y < height; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= width; x += 20) {
          const offsetY = Math.sin(x * 0.01 + time + y * 0.01) * 15;
          ctx.lineTo(x, y + offsetY);
        }
        ctx.stroke();
      }
    };

    const particles: Array<{ x: number; y: number; size: number; speed: number; opacity: number }> = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.5 + 0.2,
        opacity: Math.random() * 0.5 + 0.3,
      });
    }

    const drawParticles = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      time: number,
      colors: ReturnType<typeof getThemeColors>,
      isDark: boolean
    ) => {
      particles.forEach(particle => {
        const twinkle = Math.sin(time * 3 + particle.x) * 0.3 + 0.7;
        const alpha = particle.opacity * twinkle * (isDark ? 0.6 : 0.4);

        ctx.beginPath();
        ctx.fillStyle = `hsla(${colors.primary.h}, ${colors.primary.s}%, ${isDark ? 80 : 60}%, ${alpha})`;
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        // Move particle
        particle.y -= particle.speed;
        particle.x += Math.sin(time + particle.y * 0.01) * 0.3;

        if (particle.y < -10) {
          particle.y = height + 10;
          particle.x = Math.random() * width;
        }
      });
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [resolvedTheme, variant, isDark, prefersReducedMotion]);

  // Static fallback for reduced motion
  if (prefersReducedMotion) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Static gradient background */}
        <div 
          className="absolute inset-0"
          style={{
            background: isDark 
              ? `radial-gradient(ellipse at 30% 20%, hsl(var(--primary) / 0.15), transparent 50%),
                 radial-gradient(ellipse at 70% 80%, hsl(var(--secondary) / 0.1), transparent 50%)`
              : `radial-gradient(ellipse at 30% 20%, hsl(var(--primary) / 0.1), transparent 50%),
                 radial-gradient(ellipse at 70% 80%, hsl(var(--secondary) / 0.08), transparent 50%)`,
          }}
        />
        {/* Subtle vignette */}
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at center, transparent 40%, hsl(var(--background)) 100%)`,
          }}
        />
      </div>
    );
  }

  return (
    <>
      {/* Base canvas for animated elements */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
      />
      
      {/* CSS-based gradient overlays for depth */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Top glow */}
        <div 
          className="absolute -top-1/4 left-1/2 -translate-x-1/2 w-[150%] h-[60%] rounded-full blur-[120px] opacity-30"
          style={{
            background: `radial-gradient(ellipse at center, hsl(var(--primary) / 0.3), transparent 70%)`,
          }}
        />
        
        {/* Bottom accent */}
        <div 
          className="absolute -bottom-1/4 left-1/4 w-[80%] h-[50%] rounded-full blur-[100px] opacity-20"
          style={{
            background: `radial-gradient(ellipse at center, hsl(var(--secondary) / 0.4), transparent 70%)`,
          }}
        />

        {/* Subtle vignette */}
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at center, transparent 40%, hsl(var(--background)) 100%)`,
          }}
        />
      </div>

      {/* Noise texture overlay for depth */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </>
  );
}