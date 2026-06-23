import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, X, Maximize2, Minus, ChevronUp } from "lucide-react";
import { JarvisChat } from "./JarvisChat";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/** Global floating Jarvis launcher — present on every authenticated page. */
export function JarvisFAB() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Lock page scroll while the mobile sheet is open & expanded so the user
  // can interact with the chat without the page scrolling underneath.
  useEffect(() => {
    if (isMobile && open && !minimized) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isMobile, open, minimized]);

  // Auto-minimize on mobile after ALICE completes a navigation or client
  // action so the user can see the destination she took them to.
  useEffect(() => {
    if (!isMobile || !open) return;
    const collapse = () => setMinimized(true);
    const actionTypes = [
      "alice-navigate",
      "alice:open_card", "alice:open_note", "alice:open_document",
      "alice:open_task", "alice:open_event", "alice:open",
    ];
    actionTypes.forEach((t) => window.addEventListener(t, collapse));
    return () => actionTypes.forEach((t) => window.removeEventListener(t, collapse));
  }, [isMobile, open]);

  // Wake-word — "Hey ALICE" opens the panel and focuses the input. If the
  // user spoke a follow-up command after the wake phrase, prefill it.
  useEffect(() => {
    const onWake = (e: Event) => {
      const command = (e as CustomEvent).detail?.command as string | null;
      setOpen(true);
      setMinimized(false);
      requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent("alice-focus-input", { detail: { command } }));
      });
    };
    window.addEventListener("alice-wake", onWake);
    return () => window.removeEventListener("alice-wake", onWake);
  }, []);

  const expand = () => {
    setMinimized(false);
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent("alice-focus-input"));
    });
  };

  return (
    <>
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          data-onboarding="alice-fab"
          className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40 h-12 w-12 md:h-12 md:w-12 rounded-full shadow-lg p-0"
          aria-label="Open ALICE"
        >
          <Sparkles className="h-5 w-5" />
        </Button>
      )}
      {open && (
        <>
          {/* Mobile backdrop — taps to minimize the sheet, doesn't close so
              the user can swipe back up via the handle. */}
          {isMobile && !minimized && (
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] animate-in fade-in"
              onClick={() => setMinimized(true)}
              aria-hidden
            />
          )}
          <div
            className={cn(
              "fixed z-50 bg-background border border-border shadow-2xl overflow-hidden flex flex-col",
              "transition-[height,border-radius] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[height]",
              // Mobile: full-width bottom sheet.
              "inset-x-0 bottom-0 rounded-t-2xl rounded-b-none border-b-0",
              minimized ? "h-12" : "h-[88dvh]",
              // Desktop: floating panel anchored bottom-right.
              "md:inset-x-auto md:bottom-6 md:right-6 md:left-auto md:rounded-2xl md:border-b",
              "md:w-[min(420px,calc(100vw-3rem))] md:h-[min(620px,calc(100vh-8rem))] md:max-h-none",
              minimized && "md:h-11",
            )}
            role="dialog"
            aria-label="ALICE"
            onClick={(e) => {
              // Tap anywhere on the minimized bar to expand & focus.
              if (minimized) {
                e.stopPropagation();
                expand();
              }
            }}
          >
            {/* Drag handle (mobile only) — visual affordance for "swipe me" */}
            {isMobile && !minimized && (
              <div
                className="flex justify-center pt-2 pb-1 cursor-pointer"
                onClick={() => setMinimized(true)}
                aria-hidden
              >
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>
            )}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40 md:py-1.5 md:px-2.5">
              <button
                type="button"
                onClick={() => (minimized ? expand() : setMinimized(true))}
                className="flex items-center gap-2 min-w-0 flex-1 text-left h-9 md:h-auto"
                aria-label={minimized ? "Expand ALICE" : "Minimize ALICE"}
              >
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium truncate">ALICE</span>
              </button>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 md:h-7 md:w-7 p-0"
                  onClick={(e) => { e.stopPropagation(); minimized ? expand() : setMinimized(true); }}
                  aria-label={minimized ? "Expand" : "Minimize"}
                >
                  {minimized ? <ChevronUp className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 md:h-7 md:w-7 p-0"
                  onClick={() => { setOpen(false); navigate("/alice"); }}
                  aria-label="Open full view"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 md:h-7 md:w-7 p-0"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                >
                  <X className="h-5 w-5 md:h-4 md:w-4" />
                </Button>
              </div>
            </div>
            {!minimized && (
              <div className="flex-1 min-h-0">
                <JarvisChat compact />
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
