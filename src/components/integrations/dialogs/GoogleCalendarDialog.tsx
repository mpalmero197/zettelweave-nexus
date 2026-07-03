import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Calendar } from "lucide-react";

interface GoogleCalendarDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}

export function GoogleCalendarDialog({ open, onOpenChange, onConnected }: GoogleCalendarDialogProps) {
  const [calendarId, setCalendarId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter your Google API key");
      return;
    }
    setConnecting(true);
    try {
      const cid = calendarId.trim() || "primary";
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cid)}/events?maxResults=1&key=${apiKey}`
      );
      if (!res.ok) throw new Error("Invalid credentials");
      localStorage.setItem("pendragon:gcal-api-key", apiKey);
      localStorage.setItem("pendragon:gcal-calendar-id", cid);
      toast.success("Google Calendar connected!");
      onConnected();
      onOpenChange(false);
    } catch {
      toast.error("Could not connect. Check your API key and calendar permissions.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">📅 Connect Google Calendar</DialogTitle>
          <DialogDescription>
            Sync events between Baku Scribe and Google Calendar using a public API key.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gcal-api-key">Google API Key</Label>
            <Input
              id="gcal-api-key"
              type="password"
              placeholder="AIza..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gcal-id">Calendar ID (optional)</Label>
            <Input
              id="gcal-id"
              placeholder="primary"
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Get an API key from <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline text-primary">Google Cloud Console</a>. Enable the Calendar API first.
            </p>
          </div>
          <Button className="w-full" disabled={!apiKey || connecting} onClick={handleConnect}>
            <Calendar className="h-4 w-4 mr-2" />
            {connecting ? "Connecting…" : "Connect Calendar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
