// LandingBackground - Simplified for minimal writer-focused design
// Returns a subtle, clean background gradient

import { useTheme } from 'next-themes';

export function LandingBackground() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Subtle gradient background */}
      <div 
        className="absolute inset-0"
        style={{
          background: isDark 
            ? 'radial-gradient(ellipse at 50% 0%, hsl(0 0% 12% / 0.5), transparent 70%)'
            : 'radial-gradient(ellipse at 50% 0%, hsl(0 0% 95% / 0.8), transparent 70%)',
        }}
      />
    </div>
  );
}
