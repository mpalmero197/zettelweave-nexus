import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Square, Circle } from "lucide-react";

type Mode = "audio" | "video" | "screen";

export function AliceRecordingOverlay() {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [recording, setRecording] = useState<{ mode: Mode; title: string | null; startedAt: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const pendingRef = useRef<{ mode: Mode; title: string | null } | null>(null);

  useEffect(() => {
    const onStart = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const mode: Mode = ["audio", "video", "screen"].includes(detail.recording_type) ? detail.recording_type : "audio";
      pendingRef.current = { mode, title: detail.title || null };
      setCountdown(3);
    };
    window.addEventListener("alice:start_recording", onStart);
    return () => window.removeEventListener("alice:start_recording", onStart);
  }, []);

  // Countdown ticker
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      const pending = pendingRef.current;
      pendingRef.current = null;
      setCountdown(null);
      if (pending) void beginCapture(pending.mode, pending.title);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Elapsed timer while recording
  useEffect(() => {
    if (!recording) return;
    const i = setInterval(() => setElapsed(Math.floor((Date.now() - recording.startedAt) / 1000)), 500);
    return () => clearInterval(i);
  }, [recording]);

  const beginCapture = async (mode: Mode, title: string | null) => {
    try {
      let stream: MediaStream;
      if (mode === "screen") {
        // @ts-ignore - getDisplayMedia exists on modern browsers
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } else if (mode === "video") {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = mode === "audio"
        ? (MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "")
        : (MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "");
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      rec.ondataavailable = (ev) => { if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mode === "audio" ? "audio/webm" : "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const ts = new Date().toISOString().replace(/[:.]/g, "-");
        const ext = mode === "audio" ? "webm" : "webm";
        a.href = url;
        a.download = `${title || `alice-${mode}-recording`}-${ts}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        recorderRef.current = null;
        chunksRef.current = [];
        setRecording(null);
        toast.success("Recording saved to your downloads.");
      };
      // If user ends a screen share via the browser UI, stop too.
      stream.getVideoTracks().forEach((t) => { t.onended = () => stop(); });
      recorderRef.current = rec;
      rec.start(1000);
      setRecording({ mode, title, startedAt: Date.now() });
      setElapsed(0);
    } catch (err: any) {
      toast.error(err?.message || "Could not start recording");
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const stop = () => {
    try { recorderRef.current?.stop(); } catch { /* ignore */ }
  };

  if (countdown !== null) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/70 backdrop-blur-sm pointer-events-none">
        <div className="text-[10rem] font-bold text-primary tabular-nums leading-none drop-shadow-lg">
          {countdown === 0 ? "GO" : countdown}
        </div>
      </div>
    );
  }

  if (recording) {
    const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const ss = String(elapsed % 60).padStart(2, "0");
    return (
      <div className="fixed bottom-20 right-4 z-[9999] flex items-center gap-2 rounded-full border border-border bg-background/95 backdrop-blur px-3 py-1.5 shadow-lg">
        <Circle className="h-3 w-3 fill-destructive text-destructive animate-pulse" />
        <span className="text-xs font-medium uppercase tracking-wide">{recording.mode}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{mm}:{ss}</span>
        <Button size="sm" variant="destructive" className="h-7 px-2 ml-1" onClick={stop}>
          <Square className="h-3 w-3 mr-1" /> Stop
        </Button>
      </div>
    );
  }

  return null;
}
