import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type DataSource = "live" | "sandbox";

type SandboxContextValue = {
  source: DataSource;
  setSource: (s: DataSource) => void;
  reseed: () => Promise<void>;
  reseeding: boolean;
};

const SandboxContext = createContext<SandboxContextValue>({
  source: "live",
  setSource: () => {},
  reseed: async () => {},
  reseeding: false,
});

export const useSandbox = () => useContext(SandboxContext);

export function SandboxProvider({ children, initialSource = "live" }: { children: ReactNode; initialSource?: DataSource }) {
  const [source, setSource] = useState<DataSource>(initialSource);
  const [reseeding, setReseeding] = useState(false);

  const reseed = async () => {
    setReseeding(true);
    try {
      await (supabase as any).rpc("seed_sandbox");
    } finally {
      setReseeding(false);
    }
  };

  // Seed once on first sandbox entry per session
  useEffect(() => {
    if (source === "sandbox") {
      const key = "scholar-sandbox-seeded";
      if (!sessionStorage.getItem(key)) {
        reseed().then(() => sessionStorage.setItem(key, "1"));
      }
    }
  }, [source]);

  return (
    <SandboxContext.Provider value={{ source, setSource, reseed, reseeding }}>
      {children}
    </SandboxContext.Provider>
  );
}
