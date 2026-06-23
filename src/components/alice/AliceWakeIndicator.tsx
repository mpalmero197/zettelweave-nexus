import { useAliceWakeWord } from "@/hooks/useAliceWakeWord";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Subtle "listening" pill that floats above the JarvisFAB while the wake-word
 * recognizer is active. Renders nothing when disabled or unsupported.
 */
export function AliceWakeIndicator() {
  const { enabled, listening, supported } = useAliceWakeWord();
  if (!supported || !enabled) return null;

  return (
    <div
      className={cn(
        "fixed z-40 bottom-40 right-4 md:bottom-20 md:right-6",
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full",
        "bg-background/80 backdrop-blur border border-border shadow-sm",
        "text-[11px] text-muted-foreground select-none",
      )}
      aria-live="polite"
      title={listening ? 'Listening for "Hey ALICE"' : "Wake word paused"}
    >
      <span className="relative inline-flex h-2 w-2">
        <span
          className={cn(
            "absolute inset-0 rounded-full",
            listening ? "bg-primary animate-ping opacity-60" : "bg-muted-foreground/40",
          )}
        />
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            listening ? "bg-primary" : "bg-muted-foreground/60",
          )}
        />
      </span>
      <Mic className="h-3 w-3" />
      <span>Hey ALICE</span>
    </div>
  );
}
