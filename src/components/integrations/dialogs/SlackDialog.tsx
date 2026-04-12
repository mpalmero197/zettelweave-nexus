import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface SlackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}

export function SlackDialog({ open, onOpenChange, onConnected }: SlackDialogProps) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    if (!webhookUrl.startsWith("https://hooks.slack.com/")) {
      toast.error("Please enter a valid Slack webhook URL");
      return;
    }
    setTesting(true);
    try {
      await fetch(webhookUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "✅ PendragonX connected successfully!" }),
      });
      localStorage.setItem("pendragon:slack-webhook", webhookUrl);
      toast.success("Slack connected! A test message was sent.");
      onConnected();
      onOpenChange(false);
    } catch {
      toast.error("Failed to send test message");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">💬 Connect Slack</DialogTitle>
          <DialogDescription>
            Enter your Slack Incoming Webhook URL to send notes and cards to a channel.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slack-webhook">Webhook URL</Label>
            <Input
              id="slack-webhook"
              placeholder="https://hooks.slack.com/services/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Create one at <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" className="underline text-primary">api.slack.com</a>
            </p>
          </div>
          <Button className="w-full" disabled={!webhookUrl || testing} onClick={handleTest}>
            <Send className="h-4 w-4 mr-2" />
            {testing ? "Sending test…" : "Connect & Send Test"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
