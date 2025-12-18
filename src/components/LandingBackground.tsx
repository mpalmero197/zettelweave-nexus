import { useTheme } from 'next-themes';
import { useThemeVariant } from '@/hooks/useThemeVariant';
import { useEffect, useRef, useState, useCallback } from 'react';

interface ThemeColors {
  primary: { h: number; s: number; l: number };
  secondary: { h: number; s: number; l: number };
  accent: { h: number; s: number; l: number };
}

const getThemeColors = (variant: string | undefined, isDark: boolean): ThemeColors => {
  const baseColors: Record<string, ThemeColors> = {
    light: {
      primary: { h: 220, s: 70, l: 55 },
      secondary: { h: 280, s: 50, l: 60 },
      accent: { h: 200, s: 60, l: 50 },
    },
    dark: {
      primary: { h: 250, s: 80, l: 65 },
      secondary: { h: 280, s: 70, l: 60 },
      accent: { h: 200, s: 80, l: 55 },
    },
    ocean: {
      primary: { h: 200, s: 85, l: isDark ? 55 : 45 },
      secondary: { h: 180, s: 75, l: isDark ? 50 : 40 },
      accent: { h: 220, s: 80, l: isDark ? 60 : 50 },
    },
    forest: {
      primary: { h: 140, s: 65, l: isDark ? 50 : 40 },
      secondary: { h: 100, s: 55, l: isDark ? 45 : 35 },
      accent: { h: 80, s: 60, l: isDark ? 55 : 45 },
    },
    sunset: {
      primary: { h: 25, s: 90, l: isDark ? 55 : 50 },
      secondary: { h: 350, s: 85, l: isDark ? 50 : 45 },
      accent: { h: 45, s: 90, l: isDark ? 60 : 55 },
    },
    lavender: {
      primary: { h: 280, s: 70, l: isDark ? 60 : 55 },
      secondary: { h: 320, s: 65, l: isDark ? 55 : 50 },
      accent: { h: 260, s: 65, l: isDark ? 65 : 60 },
    },
    midnight: {
      primary: { h: 250, s: 85, l: 65 },
      secondary: { h: 190, s: 90, l: 55 },
      accent: { h: 280, s: 75, l: 70 },
    },
    aurora: {
      primary: { h: 160, s: 85, l: 55 },
      secondary: { h: 190, s: 85, l: 55 },
      accent: { h: 280, s: 75, l: 65 },
    },
  };

  const themeKey = variant || (isDark ? 'dark' : 'light');
  return baseColors[themeKey] || baseColors[isDark ? 'dark' : 'light'];
};

export function LandingBackground() {
  const { resolvedTheme } = useTheme();
  const { variant } = useThemeVariant();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const colorsRef = useRef<ThemeColors>(getThemeColors(undefined, true));
  const variantRef = useRef<string | undefined>(variant);
  const isDarkRef = useRef<boolean>(true);

  const isDark = resolvedTheme === 'dark';
  
  // Update refs when theme changes
  useEffect(() => {
    colorsRef.current = getThemeColors(variant, isDark);
    variantRef.current = variant;
    isDarkRef.current = isDark;
  }, [variant, isDark]);

  // Check for reduced motion preferences
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const checkReducedMotion = () => {
      const hasClass = document.documentElement.classList.contains('no-theme-animations') ||
        document.documentElement.classList.contains('simplified-transitions');
      setPrefersReducedMotion(hasClass);
    };
    
    checkReducedMotion();
    
    // Observe class changes
    const observer = new MutationObserver(checkReducedMotion);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    interface Orb {
      x: number;
      y: number;
      radius: number;
      vx: number;
      vy: number;
      colorIndex: number;
      phase: number;
    }

    interface Particle {
      x: number;
      y: number;
      size: number;
      speed: number;
      opacity: number;
    }

    const orbs: Orb[] = [];
    const particles: Particle[] = [];

    // Create floating orbs
    for (let i = 0; i < 5; i++) {
      orbs.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 200 + Math.random() * 300,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        colorIndex: i % 3,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // Create particles
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 1,
        speed: Math.random() * 0.5 + 0.2,
        opacity: Math.random() * 0.5 + 0.3,
      });
    }

    let time = 0;

    const animate = () => {
      time += 0.008;
      
      const colors = colorsRef.current;
      const currentVariant = variantRef.current;
      const currentIsDark = isDarkRef.current;
      const orbColors = [colors.primary, colors.secondary, colors.accent];
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw orbs with soft glow
      orbs.forEach((orb, index) => {
        const color = orbColors[orb.colorIndex];
        
        orb.x += orb.vx + Math.sin(time + orb.phase) * 0.5;
        orb.y += orb.vy + Math.cos(time + orb.phase) * 0.5;

        // Wrap around edges
        if (orb.x < -orb.radius) orb.x = width + orb.radius;
        if (orb.x > width + orb.radius) orb.x = -orb.radius;
        if (orb.y < -orb.radius) orb.y = height + orb.radius;
        if (orb.y > height + orb.radius) orb.y = -orb.radius;

        const pulseFactor = 1 + Math.sin(time * 2 + orb.phase) * 0.1;
        const currentRadius = orb.radius * pulseFactor;

        const gradient = ctx.createRadialGradient(
          orb.x, orb.y, 0,
          orb.x, orb.y, currentRadius
        );

        // Higher opacity for light mode since background is brighter
        const opacity = currentIsDark ? 0.2 : 0.35;
        const lightness = currentIsDark ? color.l : Math.max(color.l - 15, 30);
        gradient.addColorStop(0, `hsla(${color.h}, ${color.s}%, ${lightness}%, ${opacity})`);
        gradient.addColorStop(0.4, `hsla(${color.h}, ${color.s}%, ${lightness}%, ${opacity * 0.5})`);
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(orb.x, orb.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw subtle mesh/grid lines for some themes
      if (currentVariant === 'midnight' || currentVariant === 'aurora') {
        ctx.strokeStyle = `hsla(${colors.accent.h}, ${colors.accent.s}%, ${colors.accent.l}%, 0.03)`;
        ctx.lineWidth = 1;

        for (let y = 0; y < height; y += 80) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          for (let x = 0; x <= width; x += 20) {
            const offsetY = Math.sin(x * 0.01 + time + y * 0.01) * 15;
            ctx.lineTo(x, y + offsetY);
          }
          ctx.stroke();
        }
      }

      // Draw floating particles
      particles.forEach(particle => {
        const twinkle = Math.sin(time * 3 + particle.x) * 0.3 + 0.7;
        // Higher visibility for light mode
        const alpha = particle.opacity * twinkle * (currentIsDark ? 0.6 : 0.8);

        ctx.beginPath();
        ctx.fillStyle = `hsla(${colors.primary.h}, ${colors.primary.s}%, ${currentIsDark ? 80 : 40}%, ${alpha})`;
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        particle.y -= particle.speed;
        particle.x += Math.sin(time + particle.y * 0.01) * 0.3;

        if (particle.y < -10) {
          particle.y = height + 10;
          particle.x = Math.random() * width;
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [prefersReducedMotion]);

  const themeColors = getThemeColors(variant, isDark);

  // Static fallback for reduced motion
  if (prefersReducedMotion) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{
            background: isDark 
              ? `radial-gradient(ellipse at 30% 20%, hsla(${themeColors.primary.h}, ${themeColors.primary.s}%, ${themeColors.primary.l}%, 0.15), transparent 50%),
                 radial-gradient(ellipse at 70% 80%, hsla(${themeColors.secondary.h}, ${themeColors.secondary.s}%, ${themeColors.secondary.l}%, 0.1), transparent 50%)`
              : `radial-gradient(ellipse at 30% 20%, hsla(${themeColors.primary.h}, ${themeColors.primary.s}%, ${themeColors.primary.l}%, 0.1), transparent 50%),
                 radial-gradient(ellipse at 70% 80%, hsla(${themeColors.secondary.h}, ${themeColors.secondary.s}%, ${themeColors.secondary.l}%, 0.08), transparent 50%)`,
          }}
        />
      </div>
    );
  }

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
      />
      
      {/* CSS gradient overlays */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div 
          className={`absolute -top-1/4 left-1/2 -translate-x-1/2 w-[150%] h-[60%] rounded-full blur-[120px] ${isDark ? 'opacity-30' : 'opacity-50'}`}
          style={{
            background: `radial-gradient(ellipse at center, hsla(${themeColors.primary.h}, ${themeColors.primary.s}%, ${isDark ? themeColors.primary.l : themeColors.primary.l - 10}%, ${isDark ? 0.3 : 0.5}), transparent 70%)`,
          }}
        />
        
        <div 
          className={`absolute -bottom-1/4 left-1/4 w-[80%] h-[50%] rounded-full blur-[100px] ${isDark ? 'opacity-20' : 'opacity-40'}`}
          style={{
            background: `radial-gradient(ellipse at center, hsla(${themeColors.secondary.h}, ${themeColors.secondary.s}%, ${isDark ? themeColors.secondary.l : themeColors.secondary.l - 10}%, ${isDark ? 0.4 : 0.6}), transparent 70%)`,
          }}
        />
      </div>
    </>
  );
}