import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type JarvisPart =
  | { type: "text"; text: string }
  | { type: "tool"; name: string; args: any; result: any };

export type JarvisMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  parts: JarvisPart[];
  created_at: string;
};

export type JarvisThread = {
  id: string;
  title: string;
  updated_at: string;
};

export function useJarvis(initialThreadId?: string | null) {
  const { user } = useAuth();
  const [threads, setThreads] = useState<JarvisThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId ?? null);
  const [messages, setMessages] = useState<JarvisMessage[]>([]);
  const [sending, setSending] = useState(false);

  // Load threads
  const loadThreads = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("jarvis_threads")
      .select("id,title,updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);
    setThreads(data || []);
  }, [user]);

  // Load messages for active thread
  const loadMessages = useCallback(async (threadId: string) => {
    const { data } = await supabase
      .from("jarvis_messages")
      .select("id,role,parts,created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    setMessages((data as any) || []);
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);
  useEffect(() => {
    if (activeThreadId) loadMessages(activeThreadId);
    else setMessages([]);
  }, [activeThreadId, loadMessages]);

  const newThread = useCallback(() => {
    setActiveThreadId(null);
    setMessages([]);
  }, []);

  const selectThread = useCallback((id: string) => setActiveThreadId(id), []);

  const deleteThread = useCallback(async (id: string) => {
    await supabase.from("jarvis_threads").delete().eq("id", id);
    if (activeThreadId === id) newThread();
    loadThreads();
  }, [activeThreadId, loadThreads, newThread]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;
    setSending(true);
    // Optimistic user message
    const optimistic: JarvisMessage = {
      id: `tmp-${Date.now()}`, role: "user",
      parts: [{ type: "text", text }], created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);

    try {
      const { data, error } = await supabase.functions.invoke("jarvis-chat", {
        body: { message: text, threadId: activeThreadId },
      });
      if (error) throw error;
      const newThreadId = data.threadId as string;
      if (!activeThreadId) setActiveThreadId(newThreadId);
      // Append assistant message
      setMessages((m) => [...m, {
        id: `tmp-asst-${Date.now()}`, role: "assistant",
        parts: data.parts || [], created_at: new Date().toISOString(),
      }]);
      loadThreads();
    } catch (e: any) {
      toast.error(e?.message || "Jarvis is offline");
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }, [activeThreadId, sending, loadThreads]);

  return { threads, activeThreadId, messages, sending, sendMessage, newThread, selectThread, deleteThread };
}
