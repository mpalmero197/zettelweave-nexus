import { useState } from "react";
import { Copy, Check, Volume2, StickyNote, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { speakAlice } from "@/lib/aliceTts";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  lastUserText: string;
  onRegenerate: () => void;
  compact?: boolean;
}

/** Inline action row shown under the last completed assistant message. */
export function AliceMessageActions({ text, lastUserText, onRegenerate, compact }: Props) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState<null | "card" | "note">(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const handleSpeak = () => {
    if (!text.trim()) return;
    speakAlice(text);
  };

  const titleFromText = (t: string) => {
    const first = t.split(/\n+/)[0].replace(/^[#>*\-\s]+/, "").trim();
    return (first.split(/[.?!]/)[0] || first).slice(0, 80) || "ALICE reply";
  };

  const handleSaveCard = async () => {
    if (!user) { toast.error("Sign in to save"); return; }
    setSaving("card");
    try {
      const { error } = await supabase.from("zettel_cards").insert({
        user_id: user.id,
        title: titleFromText(text),
        content: text,
        tags: ["alice"],
        category: "general",
        number: "000.0",
      });

      if (error) throw error;
      toast.success("Saved as card");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save card");
    } finally { setSaving(null); }
  };

  const handleSaveNote = async () => {
    if (!user) { toast.error("Sign in to save"); return; }
    setSaving("note");
    try {
      const { error } = await supabase.from("notes").insert({
        user_id: user.id,
        title: titleFromText(text),
        content: text,
        tags: ["alice"],
        is_favorite: false,
      });
      if (error) throw error;
      toast.success("Saved as note");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save note");
    } finally { setSaving(null); }
  };

  const btn = cn(
    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] opacity-60 hover:opacity-100 hover:bg-white/5 transition",
  );

  return (
    <div className={cn("flex flex-wrap items-center gap-0.5 pl-7 md:pl-9", compact && "pl-6")}>
      <button type="button" onClick={handleCopy} className={btn} aria-label="Copy">
        {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
        <span>{copied ? "Copied" : "Copy"}</span>
      </button>
      <button type="button" onClick={handleSpeak} className={btn} aria-label="Speak">
        <Volume2 className="h-3.5 w-3.5" /><span>Speak</span>
      </button>
      <button type="button" onClick={handleSaveCard} disabled={saving === "card"} className={btn} aria-label="Save as card">
        <StickyNote className="h-3.5 w-3.5" /><span>{saving === "card" ? "Saving…" : "Save card"}</span>
      </button>
      <button type="button" onClick={handleSaveNote} disabled={saving === "note"} className={btn} aria-label="Save as note">
        <FileText className="h-3.5 w-3.5" /><span>{saving === "note" ? "Saving…" : "Save note"}</span>
      </button>
      {lastUserText.trim().length > 0 && (
        <button type="button" onClick={onRegenerate} className={btn} aria-label="Regenerate">
          <RefreshCw className="h-3.5 w-3.5" /><span>Regenerate</span>
        </button>
      )}
    </div>
  );
}
