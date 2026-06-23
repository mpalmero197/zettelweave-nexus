import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  isWakeWordSupported,
  getWakeEnabled,
  setWakeEnabled,
  getWakePhrases,
  setWakePhrases,
  useAliceWakeWord,
} from "@/hooks/useAliceWakeWord";

export function AliceWakeWordSettings() {
  const { toast } = useToast();
  const supported = isWakeWordSupported();
  const { listening, error, lastHeard } = useAliceWakeWord();
  const [enabled, setEnabled] = useState<boolean>(getWakeEnabled());
  const [phrasesText, setPhrasesText] = useState<string>(getWakePhrases().join(", "));

  useEffect(() => {
    const sync = () => setEnabled(getWakeEnabled());
    window.addEventListener("alice-wake-pref-change", sync);
    return () => window.removeEventListener("alice-wake-pref-change", sync);
  }, []);

  const handleToggle = async (checked: boolean) => {
    if (checked && supported) {
      // Prime mic permission so the recognizer can start immediately.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch {
        toast({
          title: "Microphone access required",
          description: "Allow microphone access to use 'Hey ALICE'.",
          variant: "destructive",
        });
        return;
      }
    }
    setEnabled(checked);
    setWakeEnabled(checked);
    toast({
      title: checked ? "Wake word on" : "Wake word off",
      description: checked
        ? 'Say "Hey ALICE" while PendragonX is open to summon her.'
        : "ALICE will no longer listen for the wake phrase.",
    });
  };

  const savePhrases = () => {
    const list = phrasesText
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (list.length === 0) {
      toast({ title: "Add at least one phrase", variant: "destructive" });
      return;
    }
    setWakePhrases(list);
    toast({ title: "Wake phrases saved", description: list.join(" · ") });
  };

  return (
    <Card className="p-6 mt-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1 flex-1 mr-4">
          <h4 className="font-medium">"Hey ALICE" Wake Word</h4>
          <p className="text-sm text-muted-foreground">
            {supported
              ? "Summon ALICE hands-free while PendragonX is open in this browser."
              : "Voice recognition isn't available in this browser. Try Chrome, Edge, or Brave."}
          </p>
        </div>
        <Switch
          checked={enabled && supported}
          disabled={!supported}
          onCheckedChange={handleToggle}
        />
      </div>

      {supported && enabled && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                listening ? "bg-primary animate-pulse" : "bg-muted-foreground/40"
              }`}
            />
            <span className="text-muted-foreground">
              {listening ? "Listening…" : "Paused"}
              {lastHeard && <span className="ml-2 opacity-60">heard: "{lastHeard.slice(-60)}"</span>}
            </span>
          </div>

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Wake phrases (comma-separated)</label>
            <div className="flex gap-2">
              <Input
                value={phrasesText}
                onChange={(e) => setPhrasesText(e.target.value)}
                placeholder="hey alice, okay alice"
              />
              <Button variant="secondary" onClick={savePhrases}>Save</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              ALICE opens the moment any of these phrases is heard. Anything spoken after the
              phrase is sent as her first prompt.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Privacy: audio is processed locally by your browser and never uploaded unless you
            speak a follow-up command after the wake phrase.
          </p>
        </div>
      )}
    </Card>
  );
}
