import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getScreenContext } from "@/hooks/useScreenContext";

import type { AlicePlan } from "@/components/alice/AliceActionPlan";
import { parseCardBlocks, type AliceCard } from "@/components/jarvis/cards/RichCards";

export type JarvisPart =
  | { type: "text"; text: string }
  | { type: "tool"; name: string; args: any; result: any }
  | { type: "plan"; plan: AlicePlan }
  | { type: "card"; card: AliceCard };

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
  // Second pass: split any remaining text parts on [[ALICE_CARD]] blocks.
  const final: JarvisPart[] = [];
  for (const p of out) {
    if (p.type !== "text") { final.push(p); continue; }
    const chunks = parseCardBlocks(p.text);
    for (const c of chunks) {
      if (c.kind === "text") { if (c.text.trim()) final.push({ type: "text", text: c.text }); }
      else final.push({ type: "card", card: c.card });
    }
  }
  return final;
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
    const list = ((data as any) || []).map((m: any) => ({ ...m, parts: extractPlans(m.parts || []) }));
    setMessages(list);
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

  const sendMessage = useCallback(async (
    text: string,
    attachments?: { url: string; mime: string; name: string; size?: number }[],
  ) => {
    if ((!text.trim() && !(attachments && attachments.length)) || sending) return;
    setSending(true);
    // Build optimistic user message + inline preview cards for attachments
    const optimisticParts: JarvisPart[] = [];
    if (text.trim()) optimisticParts.push({ type: "text", text });
    for (const a of attachments || []) {
      if (a.mime.startsWith("image/")) {
        optimisticParts.push({ type: "card", card: { type: "image", url: a.url, caption: a.name } });
      } else {
        optimisticParts.push({ type: "card", card: { type: "file", url: a.url, name: a.name, mime: a.mime, size: a.size } });
      }
    }
    const optimistic: JarvisMessage = {
      id: `tmp-${Date.now()}`, role: "user",
      parts: optimisticParts, created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);

    try {
      let timeZone = "";
      let locale = "en-US";
      try {
        timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
        locale = navigator.language || "en-US";
      } catch { /* ignore */ }
      const screen = getScreenContext();
      const userCoords = await getUserCoords();
      const { data, error } = await supabase.functions.invoke("jarvis-chat", {
        body: { message: text, threadId: activeThreadId, timeZone, locale, screen, attachments: attachments || [], userCoords },
      });

      if (error) throw error;
      const newThreadId = data.threadId as string;
      if (!activeThreadId) setActiveThreadId(newThreadId);
      setMessages((m) => [...m, {
        id: `tmp-asst-${Date.now()}`, role: "assistant",
        parts: extractPlans(data.parts || []), created_at: new Date().toISOString(),
      }]);
      if (data?.navigate_to && typeof data.navigate_to === "string") {
        window.dispatchEvent(new CustomEvent("alice-navigate", { detail: data.navigate_to }));
      }
      if (Array.isArray(data?.client_actions)) {
        for (const action of data.client_actions) {
          if (action && typeof action === "object" && action.type) {
            window.dispatchEvent(new CustomEvent(`alice:${action.type}`, { detail: action.payload || {} }));
          }
        }
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
