import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Undo2, Loader2, X } from "lucide-react";
import { useAliceActionLog } from "@/hooks/useAliceActionLog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Floating banner that surfaces the most recent ALICE action and offers a
 * one-tap undo. Sends a structured directive back to the jarvis-chat
 * edge function asking ALICE to perform the recorded inverse instruction.
 */
export function AliceUndoBanner() {
  const { lastUndoable, markUndone } = useAliceActionLog();
  const [busy, setBusy] = useState(false);

  if (!lastUndoable) return null;

  const handleUndo = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("jarvis-chat", {
        body: {
          message: `Undo the last action. ${lastUndoable.inverseInstruction}`,
          threadId: null,
          undo: true,
          undoPayload: lastUndoable.payload || {},
        },
      });
      if (error) throw error;
      markUndone(lastUndoable.id);
      toast.success("Undone — ALICE reversed the last action.");
    } catch (e: any) {
      toast.error(e?.message || "Could not undo. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 right-4 z-40 max-w-sm rounded-lg border border-border bg-card shadow-lg flex items-center gap-3 px-3 py-2.5"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
        <Undo2 className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">Last ALICE action</p>
        <p className="text-sm font-medium truncate">{lastUndoable.label}</p>
      </div>
      <Button size="sm" variant="outline" onClick={handleUndo} disabled={busy}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Undo"}
      </Button>
      <button
        type="button"
        onClick={() => markUndone(lastUndoable.id)}
        className="text-muted-foreground hover:text-foreground p-1"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
