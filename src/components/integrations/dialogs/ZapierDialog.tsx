import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Zap } from "lucide-react";

interface ZapierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}

export function ZapierDialog({ open, onOpenChange, onConnected }: ZapierDialogProps) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    if (!webhookUrl.startsWith("https://hooks.zapier.com/")) {
      toast.error("Please enter a valid Zapier webhook URL");
      return;
    }
    setTesting(true);
    try {
      await fetch(webhookUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          source: "PendragonX",
          event: "test_connection",
        }),
      });
      localStorage.setItem("pendragon:zapier-webhook", webhookUrl);
      toast.success("Zapier connected! Check your Zap history to confirm.");
      onConnected();
      onOpenChange(false);
    } catch {
      toast.error("Failed to trigger webhook");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">🔗 Connect Zapier / Webhooks</DialogTitle>
          <DialogDescription>
            Enter your Zapier webhook URL to automate workflows. Create cards, notes, and more from any Zap.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="zapier-webhook">Webhook URL</Label>
            <Input
              id="zapier-webhook"
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Create a Zap with a "Webhooks by Zapier" trigger at <a href="https://zapier.com/app/zaps" target="_blank" rel="noopener noreferrer" className="underline text-primary">zapier.com</a>
            </p>
          </div>
          <Button className="w-full" disabled={!webhookUrl || testing} onClick={handleTest}>
            <Zap className="h-4 w-4 mr-2" />
            {testing ? "Sending…" : "Connect & Test"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
