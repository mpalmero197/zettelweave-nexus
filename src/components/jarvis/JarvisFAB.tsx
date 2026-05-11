import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, X, Maximize2 } from "lucide-react";
import { JarvisChat } from "./JarvisChat";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

/** Global floating Jarvis launcher — present on every authenticated page. */
export function JarvisFAB() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-6 md:bottom-6 z-40 h-12 w-12 rounded-full shadow-lg p-0"
          aria-label="Open ALICE"
        >
          <Sparkles className="h-5 w-5" />
        </Button>
      )}
      {open && (
        <div className={cn(
          "fixed z-50 bg-background border border-border shadow-2xl rounded-lg overflow-hidden flex flex-col",
          "bottom-24 right-6 md:bottom-6 w-[min(420px,calc(100vw-3rem))] h-[min(620px,calc(100vh-8rem))]",
        )}>
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">ALICE</span>
            </div>
            <div className="flex items-center gap-1">
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
          <div className="flex-1 min-h-0">
            <JarvisChat compact />
          </div>
        </div>
      )}
    </>
  );
}
