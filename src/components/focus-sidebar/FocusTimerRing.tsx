import { useEffect, useRef } from 'react';

interface FocusTimerRingProps {
  seconds: number;
  totalSeconds: number;
  isRunning: boolean;
  mode: 'work' | 'short-break' | 'long-break';
}

export function FocusTimerRing({ seconds, totalSeconds, isRunning, mode }: FocusTimerRingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progress = totalSeconds > 0 ? (totalSeconds - seconds) / totalSeconds : 0;

  const accentColors = {
    work: { r: 56, g: 189, b: 248 },       // cyan
    'short-break': { r: 74, g: 222, b: 128 }, // green
    'long-break': { r: 168, g: 85, b: 247 },  // purple
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 140;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = 58;
    const lineWidth = 4;

    ctx.clearRect(0, 0, size, size);

    // Background ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // Progress ring
    const { r, g, b } = accentColors[mode];
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + progress * Math.PI * 2;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.strokeStyle = `rgb(${r},${g},${b})`;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Glow effect when running
    if (isRunning) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.strokeStyle = `rgba(${r},${g},${b},0.3)`;
      ctx.lineWidth = lineWidth + 4;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }, [seconds, totalSeconds, isRunning, mode]);

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const { r, g, b } = accentColors[mode];

  return (
    <div className="relative flex items-center justify-center">
      <canvas
        ref={canvasRef}
        className="w-[140px] h-[140px]"
        style={{ width: 140, height: 140 }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-3xl font-mono font-bold tracking-wider"
          style={{ color: `rgb(${r},${g},${b})` }}
        >
          {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
          {mode === 'work' ? 'Focus' : mode === 'short-break' ? 'Break' : 'Rest'}
        </span>
      </div>
    </div>
  );
}
