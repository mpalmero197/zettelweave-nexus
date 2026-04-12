import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

const DISMISS_KEY = "pendragon-push-prompt-dismissed";

export function PushNotificationPrompt() {
  const { user } = useAuth();
  const { pushSupported, pushEnabled, enablePush, disablePush } = useNotifications();
  const [open, setOpen] = useState(false);
  const [confirmedOpen, setConfirmedOpen] = useState(false);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (!user || !pushSupported || pushEnabled) return;

    // Don't show if user already dismissed
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) return;

    // Small delay so the app loads first
    const timer = setTimeout(() => setOpen(true), 2000);
    return () => clearTimeout(timer);
  }, [user, pushSupported, pushEnabled]);

  const handleEnable = useCallback(async () => {
    setEnabling(true);
    const success = await enablePush();
    setEnabling(false);
    if (success) {
      setOpen(false);
      setConfirmedOpen(true);
    }
  }, [enablePush]);

  const handleDismiss = useCallback(() => {
    setOpen(false);
    localStorage.setItem(DISMISS_KEY, "true");
  }, []);

  const handleTurnOff = useCallback(async () => {
    await disablePush();
    setConfirmedOpen(false);
  }, [disablePush]);

  return (
    <>
      {/* Initial prompt */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Bell className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="text-lg">Stay in the loop</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Enable push notifications to get reminders about your notes, tasks, and personalized nudges — even when Pendragon is closed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button
              onClick={handleEnable}
              disabled={enabling}
              className="w-full rounded-xl h-11 font-medium"
            >
              {enabling ? "Enabling…" : "Enable notifications"}
            </Button>
            <Button
              variant="ghost"
              onClick={handleDismiss}
              className="w-full rounded-xl h-10 text-muted-foreground"
            >
              Not now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog after enabling */}
      <Dialog open={confirmedOpen} onOpenChange={setConfirmedOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10">
              <Bell className="h-7 w-7 text-green-500" />
            </div>
            <DialogTitle className="text-lg">Notifications enabled!</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              You'll now receive reminders and engagement nudges from Pendragon. You can manage this anytime in Settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button
              variant="outline"
              onClick={handleTurnOff}
              className="w-full rounded-xl h-10 gap-2"
            >
              <BellOff className="h-4 w-4" /> Turn off
            </Button>
            <Button
              variant="ghost"
              onClick={() => setConfirmedOpen(false)}
              className="w-full rounded-xl h-10 text-muted-foreground"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
