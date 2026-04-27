import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Listens globally for typing inside elements marked with [data-writing-suggest].
 * When the user pauses after writing enough content, asks the AI for the topic
 * and shows a sidebar-style sonner notification offering to research it online.
 *
 * Excludes Sticky Notes & Scratch Pad by simply not tagging those surfaces.
 */
export function useWritingContextDetector() {
  const lastPromptedTopicRef = useRef<string | null>(null);
  const lastPromptedAtRef = useRef<number>(0);
  const debounceRef = useRef<number | null>(null);
  const inflightRef = useRef<boolean>(false);
  const dismissedTopicsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const SURFACE_SELECTOR = "[data-writing-suggest]";
    const MIN_CHARS = 220;
    const PAUSE_MS = 4500;
    const COOLDOWN_MS = 90_000; // don't re-prompt the same surface for 90s

    const getText = (el: HTMLElement): string => {
      if (
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLInputElement
      ) {
        return el.value || "";
      }
      // contentEditable / rich editors
      return el.innerText || el.textContent || "";
    };

    const triggerCheck = (surface: HTMLElement) => {
      if (inflightRef.current) return;
      const text = getText(surface).trim();
      if (text.length < MIN_CHARS) return;
      if (Date.now() - lastPromptedAtRef.current < COOLDOWN_MS) return;

      inflightRef.current = true;
      supabase.functions
        .invoke("detect-writing-topic", { body: { text } })
        .then(({ data, error }) => {
          inflightRef.current = false;
          if (error || !data?.topic) return;
          const topic: string = data.topic.trim();
          if (!topic || topic.toLowerCase() === "null") return;
          if (dismissedTopicsRef.current.has(topic.toLowerCase())) return;
          if (
            lastPromptedTopicRef.current &&
            lastPromptedTopicRef.current.toLowerCase() === topic.toLowerCase()
          ) {
            return;
          }

          lastPromptedTopicRef.current = topic;
          lastPromptedAtRef.current = Date.now();

          const id = toast(`I see you're writing about ${topic}`, {
            description:
              "Want me to find more information online to support your draft?",
            duration: 14_000,
            action: {
              label: "Yes, research it",
              onClick: () => {
                window.dispatchEvent(
                  new CustomEvent("open-knowledge-chat-with-query", {
                    detail: {
                      query: `Find detailed information about: ${topic}`,
                      source: "writing-context",
                    },
                  })
                );
                window.dispatchEvent(
                  new CustomEvent("app-tab-change", {
                    detail: "knowledge-chat",
                  })
                );
                toast.dismiss(id);
              },
            },
            cancel: {
              label: "Not now",
              onClick: () => {
                dismissedTopicsRef.current.add(topic.toLowerCase());
              },
            },
          });
        })
        .catch(() => {
          inflightRef.current = false;
        });
    };

    const onInput = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const surface = target.closest(SURFACE_SELECTOR) as HTMLElement | null;
      if (!surface) return;

      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        triggerCheck(surface);
      }, PAUSE_MS);
    };

    document.addEventListener("input", onInput, true);
    return () => {
      document.removeEventListener("input", onInput, true);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);
}
