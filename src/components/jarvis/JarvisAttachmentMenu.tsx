import { useRef, useState } from "react";
import { Plus, Image as ImageIcon, FileText, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type JarvisAttachment = { url: string; mime: string; name: string; size?: number };

interface Props {
  onAttach: (a: JarvisAttachment) => void;
  disabled?: boolean;
  compact?: boolean;
}

const BUCKET = "card-media";

export function JarvisAttachmentMenu({ onAttach, disabled, compact }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!user) { toast.error("Sign in to attach files."); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("Files must be under 20 MB."); return; }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `jarvis/${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 60 * 60 * 24 * 30); // 30 days
      if (signErr || !signed) throw signErr || new Error("Could not sign URL");
      onAttach({ url: signed.signedUrl, mime: file.type || "application/octet-stream", name: file.name, size: file.size });
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    Array.from(list).slice(0, 10).forEach((f) => { void upload(f); });
  };

  return (
    <>
      <input ref={imageRef} type="file" accept="image/*" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
      <input ref={fileRef} type="file" multiple hidden onChange={(e) => handleFiles(e.target.files)} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handleFiles(e.target.files)} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={disabled || busy}
            className={compact ? "h-9 w-9 shrink-0" : "shrink-0"}
            aria-label="Attach"
            title="Attach"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="start" side="top">
          <button onClick={() => imageRef.current?.click()} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
            <ImageIcon className="h-4 w-4" /> Image
          </button>
          <button onClick={() => fileRef.current?.click()} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
            <FileText className="h-4 w-4" /> File (PDF, doc…)
          </button>
          <button onClick={() => cameraRef.current?.click()} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
            <Camera className="h-4 w-4" /> Camera
          </button>
        </PopoverContent>
      </Popover>
    </>
  );
}
