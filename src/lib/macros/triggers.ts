// Trigger registry for the Routine Builder.

export type TriggerFieldType = "text" | "textarea" | "time" | "cron" | "hotkey";

export interface TriggerField {
  name: string;
  label: string;
  type: TriggerFieldType;
  placeholder?: string;
  help?: string;
  optional?: boolean;
}

export interface Trigger {
  id: string;
  label: string;
  icon: string;
  description: string;
  fields: TriggerField[];
  toTrigger: (values: Record<string, string>) => Record<string, unknown>;
}

export const TRIGGERS: Trigger[] = [
  {
    id: "manual",
    label: "Manual — run from menu",
    icon: "👆",
    description: "Only runs when you click Run.",
    fields: [],
    toTrigger: () => ({ type: "manual" }),
  },
  {
    id: "schedule",
    label: "On a schedule",
    icon: "⏰",
    description: "Runs automatically on a cron schedule (UTC).",
    fields: [
      { name: "cron", label: "Cron expression", type: "cron", placeholder: "0 8 * * 1-5", help: "Minute Hour Day Month Weekday" },
    ],
    toTrigger: (v) => ({ type: "schedule", cron: v.cron || "0 8 * * *" }),
  },
  {
    id: "site",
    label: "When I visit a site",
    icon: "🌐",
    description: "Fires when the active tab navigates to a matching host.",
    fields: [{ name: "host", label: "Host pattern", type: "text", placeholder: "mail.google.com" }],
    toTrigger: (v) => ({ type: "site", host: v.host }),
  },
  {
    id: "topic",
    label: "When ALICE detects a topic",
    icon: "🧭",
    description: "Fires when your writing or browsing matches one of the keywords.",
    fields: [{ name: "keywords", label: "Keywords (comma-separated)", type: "text", placeholder: "invoice, billing" }],
    toTrigger: (v) => ({
      type: "topic",
      keywords: (v.keywords || "").split(",").map((s) => s.trim()).filter(Boolean),
    }),
  },
  {
    id: "workflow",
    label: "When a workflow fires",
    icon: "🔄",
    description: "Linked to an existing ALICE workflow.",
    fields: [{ name: "workflow_id", label: "Workflow ID", type: "text" }],
    toTrigger: (v) => ({ type: "workflow", workflow_id: v.workflow_id }),
  },
  {
    id: "hotkey",
    label: "Hotkey",
    icon: "⌨️",
    description: "Trigger from a keyboard shortcut in the extension.",
    fields: [{ name: "hotkey", label: "Shortcut", type: "hotkey", placeholder: "Ctrl+Shift+M" }],
    toTrigger: (v) => ({ type: "hotkey", hotkey: v.hotkey }),
  },
  {
    id: "custom",
    label: "Custom (raw JSON)",
    icon: "⚙️",
    description: "Advanced — provide a JSON object.",
    fields: [{ name: "json", label: "Trigger JSON", type: "textarea" }],
    toTrigger: (v) => {
      try { return JSON.parse(v.json); } catch { return { type: "manual" }; }
    },
  },
];

export const TRIGGER_BY_ID: Record<string, Trigger> = Object.fromEntries(
  TRIGGERS.map((t) => [t.id, t]),
);

export const NOTIFICATION_OPTIONS = [
  { id: "none", label: "None" },
  { id: "toast", label: "Toast on completion" },
  { id: "push", label: "Push notification" },
  { id: "email", label: "Email" },
] as const;

export const RUN_MODES = [
  { id: "foreground", label: "Foreground — show overlay" },
  { id: "background", label: "Background — silent" },
] as const;
