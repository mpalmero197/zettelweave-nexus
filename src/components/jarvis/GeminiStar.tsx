import { cn } from "@/lib/utils";

/**
 * ALICE Iridescent Orb (Gemini Neural Expressive).
 * A liquid-glass sphere with iridescent gradient, soft inner highlight,
 * and a breathing aurora halo. Replaces the prior 4-point star.
 *
 * Same export name + props as before so existing call-sites keep working.
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
          {/* Iridescent body — violet → blue → cyan → warm core */}
          <radialGradient id="orb-body" cx="35%" cy="32%" r="78%">
            <stop offset="0%"  stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="14%" stopColor="#FFE7C2" />
            <stop offset="34%" stopColor="#FF7AB6" />
            <stop offset="58%" stopColor="#7A6BFF" />
            <stop offset="82%" stopColor="#36C5F0" />
            <stop offset="100%" stopColor="#1E2A5C" />
          </radialGradient>
          {/* Specular highlight */}
          <radialGradient id="orb-highlight" cx="32%" cy="26%" r="22%">
            <stop offset="0%"  stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          {/* Rim light */}
          <radialGradient id="orb-rim" cx="70%" cy="78%" r="55%">
            <stop offset="60%" stopColor="#36C5F0" stopOpacity="0" />
            <stop offset="100%" stopColor="#A78BFF" stopOpacity="0.55" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="46" fill="url(#orb-body)" />
        <circle cx="50" cy="50" r="46" fill="url(#orb-rim)" />
        <ellipse cx="38" cy="34" rx="14" ry="9" fill="url(#orb-highlight)" />
      </svg>
    </span>
  );
}
