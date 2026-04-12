import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

interface TodoistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}

export function TodoistDialog({ open, onOpenChange, onConnected }: TodoistDialogProps) {
  const [apiToken, setApiToken] = useState("");
  const [testing, setTesting] = useState(false);

  const handleConnect = async () => {
    if (!apiToken.trim()) {
      toast.error("Please enter your API token");
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("https://api.todoist.com/rest/v2/projects", {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      if (!res.ok) throw new Error("Invalid token");
      localStorage.setItem("pendragon:todoist-token", apiToken);
      toast.success("Todoist connected successfully!");
      onConnected();
      onOpenChange(false);
    } catch {
      toast.error("Invalid API token. Please check and try again.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">✅ Connect Todoist</DialogTitle>
          <DialogDescription>
            Enter your Todoist API token to sync tasks between PendragonX and Todoist.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="todoist-token">API Token</Label>
            <Input
              id="todoist-token"
              type="password"
              placeholder="Your Todoist API token"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Find it at <a href="https://todoist.com/prefs/integrations" target="_blank" rel="noopener noreferrer" className="underline text-primary">Settings → Integrations → Developer</a>
            </p>
          </div>
          <Button className="w-full" disabled={!apiToken || testing} onClick={handleConnect}>
            <CheckCircle className="h-4 w-4 mr-2" />
            {testing ? "Verifying…" : "Connect Todoist"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
