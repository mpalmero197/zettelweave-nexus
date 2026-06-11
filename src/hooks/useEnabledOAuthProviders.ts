import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the set of OAuth provider IDs that an admin has configured and enabled.
 * Cached for the session so Integration cards render instantly.
 */
export function useEnabledOAuthProviders() {
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("oauth-providers-status");
      if (!error && Array.isArray(data?.enabled)) {
        setEnabled(new Set(data.enabled));
      }
    } catch {
      /* network errors leave enabled empty — UI falls back to file-import */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { enabled, loading, reload: load };
}
