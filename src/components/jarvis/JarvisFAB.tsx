import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, X, Maximize2, Minus, ChevronUp } from "lucide-react";
import { JarvisChat } from "./JarvisChat";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Global floating Jarvis launcher — present on every authenticated page. */
export function JarvisFAB() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          data-onboarding="alice-fab"
          className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40 h-11 w-11 md:h-12 md:w-12 rounded-full shadow-lg p-0"
          aria-label="Open ALICE"
        >
          <Sparkles className="h-5 w-5" />
        </Button>
      )}
      {open && (
        <div className={cn(
          "fixed z-50 bg-background border border-border shadow-2xl overflow-hidden flex flex-col",
          // Mobile: compact panel anchored to bottom-right above the FAB area, ~half-height so user can still see content
          "bottom-20 right-2 left-auto rounded-lg w-[min(360px,calc(100vw-1rem))]",
          minimized ? "h-11" : "h-[45vh] max-h-[420px]",
          // Desktop: original size
          "md:bottom-6 md:right-6 md:w-[min(420px,calc(100vw-3rem))] md:h-[min(620px,calc(100vh-8rem))] md:max-h-none",
        )}>
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border bg-muted/40">
            <button
              type="button"
              onClick={() => setMinimized((m) => !m)}
              className="flex items-center gap-2 min-w-0 flex-1 text-left"
              aria-label={minimized ? "Expand ALICE" : "Minimize ALICE"}
            >
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium truncate">ALICE</span>
            </button>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost" size="sm" className="h-7 w-7 p-0"
                onClick={() => setMinimized((m) => !m)}
                aria-label={minimized ? "Expand" : "Minimize"}
              >
                {minimized ? <ChevronUp className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost" size="sm" className="h-7 w-7 p-0"
                onClick={() => { setOpen(false); navigate("/alice"); }}
                aria-label="Open full view"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="sm" className="h-7 w-7 p-0"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {!minimized && (
            <div className="flex-1 min-h-0">
              <JarvisChat compact />
            </div>
          )}
        </div>
      )}
    </>
  );
}
