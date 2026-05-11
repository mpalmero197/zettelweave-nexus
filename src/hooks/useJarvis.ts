import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

import type { AlicePlan } from "@/components/alice/AliceActionPlan";

export type JarvisPart =
  | { type: "text"; text: string }
  | { type: "tool"; name: string; args: any; result: any }
  | { type: "plan"; plan: AlicePlan };

/**
 * ALICE may embed a structured action plan in its assistant text using a
 * fenced block:
 *
 *   [[ALICE_PLAN]]
 *   { "id": "...", "goal": "...", "steps": [ ... ] }
 *   [[/ALICE_PLAN]]
 *
 * Extract any such blocks into proper plan parts so the UI can render
 * Approve/Modify/Cancel controls instead of dumping JSON to the user.
 */
function extractPlans(parts: JarvisPart[]): JarvisPart[] {
  const out: JarvisPart[] = [];
  const RX = /\[\[ALICE_PLAN\]\]([\s\S]*?)\[\[\/ALICE_PLAN\]\]/g;
  for (const p of parts) {
    if (p.type !== "text") { out.push(p); continue; }
    let last = 0;
    let m: RegExpExecArray | null;
    const text = p.text;
    while ((m = RX.exec(text)) !== null) {
      const before = text.slice(last, m.index).trim();
      if (before) out.push({ type: "text", text: before });
      try {
        const plan = JSON.parse(m[1]) as AlicePlan;
        if (!plan.id) plan.id = crypto.randomUUID();
        plan.steps = (plan.steps || []).map((s, i) => ({ ...s, id: s.id || `s${i}` }));
        out.push({ type: "plan", plan });
      } catch {
        out.push({ type: "text", text: m[0] });
      }
      last = m.index + m[0].length;
    }
    const tail = text.slice(last).trim();
    if (tail) out.push({ type: "text", text: tail });
    if (last === 0 && out[out.length - 1]?.type !== "text") out.push(p);
  }
  return out;
}

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
      let timeZone = "";
      let locale = "en-US";
      try {
        timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        locale = navigator.language || "en-US";
      } catch { /* ignore */ }
      const { data, error } = await supabase.functions.invoke("jarvis-chat", {
        body: { message: text, threadId: activeThreadId, timeZone, locale },
      });
      if (error) throw error;
      const newThreadId = data.threadId as string;
      if (!activeThreadId) setActiveThreadId(newThreadId);
      // Append assistant message
      setMessages((m) => [...m, {
        id: `tmp-asst-${Date.now()}`, role: "assistant",
        parts: data.parts || [], created_at: new Date().toISOString(),
      }]);
      // ALICE may request navigation as part of acting on the user's behalf
      if (data?.navigate_to && typeof data.navigate_to === "string") {
        window.dispatchEvent(new CustomEvent("alice-navigate", { detail: data.navigate_to }));
      }
      loadThreads();
    } catch (e: any) {
      toast.error(e?.message || "ALICE is offline");
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }, [activeThreadId, sending, loadThreads]);

  return { threads, activeThreadId, messages, sending, sendMessage, newThread, selectThread, deleteThread };
}
