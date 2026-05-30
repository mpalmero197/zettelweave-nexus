import { cn } from "@/lib/utils";

/**
 * Gemini Neural Expressive 4-point star.
 * Iridescent radial gradient with a soft glow halo. The star itself uses a
 * concave-diamond superellipse so the four points stay sharp while the
 * sides curve inward — the visual signature of Google's Gemini mark.
 *
 * Animations:
 *  - idle: slow gentle breathing + subtle hue drift
 *  - streaming: faster pulse and brighter halo
 */
export function GeminiStar({
  size = 56,
  className,
  state,
}: {
  size?: number;
  className?: string;
  state?: "idle" | "streaming";
}) {
  return (
    <span
      className={cn("gemini-star", className)}
      data-state={state ?? "idle"}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <defs>
          <radialGradient id="gemini-star-grad" cx="50%" cy="50%" r="60%">
            {/* Bright iridescent core → outer aurora ring */}
            <stop offset="0%" stopColor="#FFE7A8" />
            <stop offset="22%" stopColor="#FF9F6B" />
            <stop offset="48%" stopColor="#E94A8C" />
            <stop offset="72%" stopColor="#6B7BFF" />
            <stop offset="100%" stopColor="#36C5F0" />
          </radialGradient>
        </defs>
        {/* Concave-diamond path: 4 points pulled long, sides cubic-curved inward */}
        <path
          d="M50 2
             C 52 28, 72 48, 98 50
             C 72 52, 52 72, 50 98
             C 48 72, 28 52, 2 50
             C 28 48, 48 28, 50 2 Z"
          fill="url(#gemini-star-grad)"
        />
      </svg>
    </span>
  );
}
