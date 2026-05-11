/**
 * Tiny pub/sub used by every "create" flow in PendragonX (cards, notes,
 * sticky notes, scratchpads, etc.) to tell ALICE that the user just made
 * something. ALICE then quietly looks for time-bound or relational hints
 * in the content and may propose a follow-up (event, reminder, task,
 * contact callback) in a small bottom-right prompt.
 */
export type CreatedContent = {
  contentType: "zettel_card" | "note" | "sticky_note" | "scratchpad" | "task" | "other";
  id?: string;
  title: string;
  content?: string;
};

export function notifyContentCreated(payload: CreatedContent) {
  try {
    window.dispatchEvent(new CustomEvent("pendragon-content-created", { detail: payload }));
  } catch { /* SSR / no-window — safe to ignore */ }
}
