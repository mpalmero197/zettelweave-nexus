import { useTheme } from 'next-themes';
import { useThemeVariant } from '@/hooks/useThemeVariant';
import { useEffect, useRef, useState } from 'react';

interface HSLColor {
  h: number;
  s: number;
  l: number;
}

// Parse HSL from CSS variable value like "271 76% 53%"
const parseHSL = (cssValue: string): HSLColor => {
  const parts = cssValue.trim().split(/\s+/);
  if (parts.length >= 3) {
    return {
      h: parseFloat(parts[0]) || 0,
      s: parseFloat(parts[1]) || 50,
      l: parseFloat(parts[2]) || 50,
    };
  }
  return { h: 250, s: 70, l: 55 }; // fallback purple
};

// Get colors from CSS variables
const getColorsFromCSS = (): { primary: HSLColor; secondary: HSLColor; accent: HSLColor } => {
  if (typeof window === 'undefined') {
    return {
      primary: { h: 271, s: 76, l: 53 },
      secondary: { h: 346, s: 60, l: 49 },
      accent: { h: 271, s: 50, l: 85 },
    };
  }
  
  const styles = getComputedStyle(document.documentElement);
  
  const primary = styles.getPropertyValue('--primary').trim();
  const secondary = styles.getPropertyValue('--secondary').trim();
  const accent = styles.getPropertyValue('--accent').trim();
  
  return {
    primary: parseHSL(primary),
    secondary: parseHSL(secondary),
    accent: parseHSL(accent),
  };
};

export function LandingBackground() {
  const { resolvedTheme } = useTheme();
  const { variant } = useThemeVariant();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const colorsRef = useRef(getColorsFromCSS());
  const isDarkRef = useRef<boolean>(true);

  const isDark = resolvedTheme === 'dark';
  
  // Update colors when theme changes
  useEffect(() => {
    // Small delay to let CSS variables update
    const timer = setTimeout(() => {
      colorsRef.current = getColorsFromCSS();
      isDarkRef.current = isDark;
    }, 50);
    return () => clearTimeout(timer);
  }, [variant, isDark, resolvedTheme]);

  // Check for reduced motion preferences
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  useEffect(() => {
    const checkReducedMotion = () => {
      const hasClass = document.documentElement.classList.contains('no-theme-animations') ||
        document.documentElement.classList.contains('simplified-transitions');
      setPrefersReducedMotion(hasClass);
    };
    
    checkReducedMotion();
    
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
      
      // Read current colors from ref (updated when theme changes)
      const colors = colorsRef.current;
      const currentIsDark = isDarkRef.current;
      const orbColors = [colors.primary, colors.secondary, colors.accent];
      
      ctx.clearRect(0, 0, width, height);

      // Draw orbs with soft glow
      orbs.forEach((orb, index) => {
        const color = orbColors[orb.colorIndex];
        
        orb.x += orb.vx + Math.sin(time + orb.phase) * 0.5;
        orb.y += orb.vy + Math.cos(time + orb.phase) * 0.5;

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

        const opacity = currentIsDark ? 0.2 : 0.35;
        const lightness = currentIsDark ? color.l : Math.max(color.l - 10, 35);
        gradient.addColorStop(0, `hsla(${color.h}, ${color.s}%, ${lightness}%, ${opacity})`);
        gradient.addColorStop(0.4, `hsla(${color.h}, ${color.s}%, ${lightness}%, ${opacity * 0.5})`);
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(orb.x, orb.y, currentRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw floating particles
      particles.forEach(particle => {
        const twinkle = Math.sin(time * 3 + particle.x) * 0.3 + 0.7;
        const alpha = particle.opacity * twinkle * (currentIsDark ? 0.6 : 0.8);
        const particleLightness = currentIsDark ? 80 : 45;

        ctx.beginPath();
        ctx.fillStyle = `hsla(${colors.primary.h}, ${colors.primary.s}%, ${particleLightness}%, ${alpha})`;
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

  // Static fallback for reduced motion - uses CSS variables directly
  if (prefersReducedMotion) {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{
            background: isDark 
              ? `radial-gradient(ellipse at 30% 20%, hsl(var(--primary) / 0.15), transparent 50%),
                 radial-gradient(ellipse at 70% 80%, hsl(var(--secondary) / 0.1), transparent 50%)`
              : `radial-gradient(ellipse at 30% 20%, hsl(var(--primary) / 0.25), transparent 50%),
                 radial-gradient(ellipse at 70% 80%, hsl(var(--secondary) / 0.2), transparent 50%)`,
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
      
      {/* CSS gradient overlays using CSS variables */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div 
          className={`absolute -top-1/4 left-1/2 -translate-x-1/2 w-[150%] h-[60%] rounded-full blur-[120px] ${isDark ? 'opacity-30' : 'opacity-50'}`}
          style={{
            background: `radial-gradient(ellipse at center, hsl(var(--primary) / ${isDark ? 0.3 : 0.5}), transparent 70%)`,
          }}
        />
        
        <div 
          className={`absolute -bottom-1/4 left-1/4 w-[80%] h-[50%] rounded-full blur-[100px] ${isDark ? 'opacity-20' : 'opacity-40'}`}
          style={{
            background: `radial-gradient(ellipse at center, hsl(var(--secondary) / ${isDark ? 0.4 : 0.6}), transparent 70%)`,
          }}
        />
      </div>
    </>
  );
}