import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FolderOpen } from "lucide-react";

interface GoogleDriveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnected: () => void;
}

export function GoogleDriveDialog({ open, onOpenChange, onConnected }: GoogleDriveDialogProps) {
  const [clientId, setClientId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);

  const handleConnect = () => {
    if (!clientId.trim() || !apiKey.trim()) {
      toast.error("Both Client ID and API Key are required");
      return;
    }
    setConnecting(true);
    try {
      localStorage.setItem("pendragon:gdrive-client-id", clientId);
      localStorage.setItem("pendragon:gdrive-api-key", apiKey);
      toast.success("Google Drive credentials saved! You can now import files.");
      onConnected();
      onOpenChange(false);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">📁 Connect Google Drive</DialogTitle>
          <DialogDescription>
            Attach and sync files from your Google Drive. Requires a Google Cloud project with the Drive API enabled.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gdrive-client-id">OAuth Client ID</Label>
            <Input
              id="gdrive-client-id"
              placeholder="xxxxx.apps.googleusercontent.com"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gdrive-api-key">API Key</Label>
            <Input
              id="gdrive-api-key"
              type="password"
              placeholder="AIza..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Get credentials from <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline text-primary">Google Cloud Console</a>
            </p>
          </div>
          <Button className="w-full" disabled={!clientId || !apiKey || connecting} onClick={handleConnect}>
            <FolderOpen className="h-4 w-4 mr-2" />
            {connecting ? "Saving…" : "Connect Google Drive"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
