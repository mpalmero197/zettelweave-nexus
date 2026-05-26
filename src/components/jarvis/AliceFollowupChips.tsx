import { useMemo } from "react";
import { Sparkles, ArrowRight } from "lucide-react";

/** Lightweight heuristic generator — picks 3 contextual follow-ups from the
 *  last assistant message + last user prompt. Zero AI cost. */
function deriveFollowups(lastAssistant: string, lastUser: string): string[] {
  const text = `${lastUser} ${lastAssistant}`.toLowerCase();

  const pool: Array<{ when: RegExp; chips: string[] }> = [
    { when: /weather|forecast|temperature|rain/, chips: [
      "What should I wear today?",
      "Show me the weekly forecast",
      "Will it rain this weekend?",
    ]},
    { when: /meeting|calendar|schedule|event|appointment/, chips: [
      "Block focus time after that",
      "What else is on my calendar today?",
      "Add a 15-minute prep reminder",
    ]},
    { when: /task|todo|to-do|reminder|priorit/, chips: [
      "Show all overdue tasks",
      "Break this into subtasks",
      "What's most important right now?",
    ]},
    { when: /note|card|zettel|notebook/, chips: [
      "Summarize this in 3 bullets",
      "Find related notes",
      "Turn this into a study guide",
    ]},
    { when: /search|find|look up|web/, chips: [
      "Go deeper on the top result",
      "Compare the top two sources",
      "Save the best one to my notes",
    ]},
    { when: /video|youtube|watch/, chips: [
      "Summarize the top video",
      "Find a shorter version",
      "Save this to my watch later",
    ]},
    { when: /write|draft|essay|article|paper/, chips: [
      "Make it more concise",
      "Add a stronger opening",
      "Rewrite in a friendlier tone",
    ]},
    { when: /code|function|bug|error|api/, chips: [
      "Explain this step by step",
      "Show me a simpler version",
      "Add error handling",
    ]},
    { when: /plan|strategy|roadmap|goal/, chips: [
      "Turn this into a checklist",
      "What's the very next step?",
      "Estimate how long each step takes",
    ]},
    { when: /summar|recap|tl;dr|overview/, chips: [
      "Give me the 3 key takeaways",
      "Make it even shorter",
      "Quiz me on this",
    ]},
  ];

  for (const p of pool) {
    if (p.when.test(text)) return p.chips;
  }

  // Generic fallback — always-useful follow-ups
  return [
    "Tell me more",
    "Summarize that in 3 bullets",
    "What should I do next?",
  ];
}

interface Props {
  lastAssistant: string;
  lastUser: string;
  onPick: (prompt: string) => void;
}

export function AliceFollowupChips({ lastAssistant, lastUser, onPick }: Props) {
  const chips = useMemo(
    () => deriveFollowups(lastAssistant, lastUser),
    [lastAssistant, lastUser],
  );

  if (chips.length === 0) return null;

  return (
    <div className="mt-2 ml-9 md:ml-10 flex flex-wrap gap-2">
      <span className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider opacity-60 mr-1 self-center">
        <Sparkles className="h-3 w-3" />
        Try
      </span>
      {chips.map((chip, i) => (
        <button
          key={chip}
          type="button"
          onClick={() => onPick(chip)}
          className="alice-followup-chip"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <span>{chip}</span>
          <ArrowRight className="h-3 w-3 opacity-60" />
        </button>
      ))}
    </div>
  );
}
