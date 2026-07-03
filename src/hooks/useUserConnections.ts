import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface UserConnection {
  id: string;
  provider: string;
  provider_account_email: string | null;
  provider_account_name: string | null;
  scopes: string[] | null;
  expires_at: string | null;
  last_synced_at: string | null;
  created_at: string;
}

export function useUserConnections() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<UserConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setConnections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Only select non-secret columns. Tokens never reach the browser.
    const { data, error } = await supabase
      .from("user_connections")
      .select("id, provider, provider_account_email, provider_account_name, scopes, expires_at, last_synced_at, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to load connections:", error);
    } else {
      setConnections(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  /** Start an OAuth flow in a popup. Resolves when the user finishes (or closes the window). */
  const connect = useCallback(async (provider: string) => {
    if (!user) {
      toast.error("Please sign in first.");
      return;
    }
    setBusyProvider(provider);
    try {
      const { data, error } = await supabase.functions.invoke("oauth-start", {
        body: { provider, return_to: window.location.href },
      });
      if (error || !data?.url) {
        throw new Error(error?.message || data?.error || "Could not start OAuth flow");
      }

      const popup = window.open(
        data.url,
        "bakuscribe-oauth",
        "width=600,height=720,menubar=no,toolbar=no,location=no,status=no",
      );
      if (!popup) {
        toast.error("Popup blocked — please allow popups for Baku Scribe.");
        return;
      }

      await new Promise<void>((resolve) => {
        const onMessage = (e: MessageEvent) => {
          if (e.data?.type !== "bakuscribe:oauth") return;
          window.removeEventListener("message", onMessage);
          clearInterval(poll);
          if (e.data.status === "ok") {
            toast.success(`Connected to ${e.data.provider || provider}`);
          } else {
            toast.error(e.data.message || "Connection failed");
          }
          resolve();
        };
        window.addEventListener("message", onMessage);
        const poll = setInterval(() => {
          if (popup.closed) {
            clearInterval(poll);
            window.removeEventListener("message", onMessage);
            resolve();
          }
        }, 500);
      });

      await load();
    } catch (err: any) {
      toast.error(err?.message || "Could not start connection");
    } finally {
      setBusyProvider(null);
    }
  }, [user, load]);

  const disconnect = useCallback(async (provider: string) => {
    setBusyProvider(provider);
    try {
      const { data, error } = await supabase.functions.invoke("oauth-disconnect", {
        body: { provider },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      toast.success("Disconnected");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Could not disconnect");
    } finally {
      setBusyProvider(null);
    }
  }, [load]);

  return {
    connections,
    loading,
    busyProvider,
    isConnected: (provider: string) => connections.some((c) => c.provider === provider),
    getConnection: (provider: string) => connections.find((c) => c.provider === provider),
    connect,
    disconnect,
    reload: load,
  };
}
