// Pre-built macro abilities — the single source of truth for the Routine Builder.
// Each ability defines a label, the fields the UI should render, and a `toStep`
// function that converts the form values into the normalized step JSON that the
// extension runner (and MacroCoach fallback) already understands.

export type AbilityFieldType = "text" | "textarea" | "number" | "url" | "selector" | "json";

export interface AbilityField {
  name: string;
  label: string;
  type: AbilityFieldType;
  placeholder?: string;
  optional?: boolean;
  help?: string;
}

export interface Ability {
  id: string;
  label: string;
  icon: string;
  description: string;
  fields: AbilityField[];
  toStep: (values: Record<string, string>) => Record<string, unknown>;
}

export const ABILITIES: Ability[] = [
  {
    id: "open_url",
    label: "Open a website",
    icon: "🌐",
    description: "Navigate the active tab to a URL.",
    fields: [{ name: "url", label: "URL", type: "url", placeholder: "https://example.com" }],
    toStep: (v) => ({ action: "navigate", url: v.url }),
  },
  {
    id: "login_vault",
    label: "Log in with vault credential",
    icon: "🔐",
    description: "Auto-fill username + password from your secure vault for the current host.",
    fields: [
      { name: "user_selector", label: "Username field selector", type: "selector", placeholder: "input[name='email']" },
      { name: "pass_selector", label: "Password field selector", type: "selector", placeholder: "input[type='password']" },
      { name: "item", label: "Vault item title (optional)", type: "text", placeholder: "Leave blank to auto-match host", optional: true },
    ],
    toStep: (v) => ({
      action: "login_vault",
      user_selector: v.user_selector,
      pass_selector: v.pass_selector,
      value: v.item
        ? { username: `{{vault:"${v.item}".username}}`, password: `{{vault:"${v.item}".password}}` }
        : { username: "{{vault.username}}", password: "{{vault.password}}" },
    }),
  },
  {
    id: "fill",
    label: "Fill a form field",
    icon: "✏️",
    description: "Type a value into an input. Supports {{vault.*}} and {{var.*}} tokens.",
    fields: [
      { name: "selector", label: "Selector", type: "selector", placeholder: "input[name='q']" },
      { name: "value", label: "Value", type: "text", placeholder: "Hello world or {{var.topic}}" },
    ],
    toStep: (v) => ({ action: "fill", selector: v.selector, value: v.value }),
  },
  {
    id: "click",
    label: "Click an element",
    icon: "🖱️",
    description: "Click a button, link, or any selector.",
    fields: [
      { name: "selector", label: "Selector or text", type: "selector", placeholder: "button[type='submit']" },
    ],
    toStep: (v) => ({ action: "click", selector: v.selector }),
  },
  {
    id: "wait",
    label: "Wait",
    icon: "⏱️",
    description: "Pause for N milliseconds before the next step.",
    fields: [{ name: "ms", label: "Milliseconds", type: "number", placeholder: "1500" }],
    toStep: (v) => ({ action: "wait", ms: Number(v.ms || 1000) }),
  },
  {
    id: "wait_for",
    label: "Wait for element",
    icon: "⏳",
    description: "Wait until a selector appears on the page.",
    fields: [{ name: "selector", label: "Selector", type: "selector", placeholder: ".dashboard" }],
    toStep: (v) => ({ action: "wait_for", selector: v.selector }),
  },
  {
    id: "ask",
    label: "Ask the user",
    icon: "❓",
    description: "Pause and show a question. The answer is stored in {{var.NAME}}.",
    fields: [
      { name: "prompt", label: "Question", type: "text", placeholder: "Which Google account?" },
      { name: "options", label: "Options (comma-separated, optional)", type: "text", optional: true, placeholder: "Personal, Work" },
      { name: "var", label: "Variable name", type: "text", placeholder: "account" },
    ],
    toStep: (v) => ({
      action: "ask",
      prompt: v.prompt,
      options: v.options ? v.options.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
      var: v.var || "answer",
    }),
  },
  {
    id: "pause",
    label: "Pause for manual input",
    icon: "⏸️",
    description: "Stop and let the user complete a step (e.g. solve a CAPTCHA).",
    fields: [
      { name: "prompt", label: "What should the user do?", type: "text", placeholder: "Solve the CAPTCHA, then continue." },
      { name: "selector", label: "Highlight selector (optional)", type: "selector", optional: true },
    ],
    toStep: (v) => ({ action: "pause", prompt: v.prompt, selector: v.selector || undefined }),
  },
  {
    id: "hover",
    label: "Hover an element",
    icon: "🖐️",
    description: "Trigger hover/mouseover on a selector (reveals dropdowns).",
    fields: [{ name: "selector", label: "Selector", type: "selector" }],
    toStep: (v) => ({ action: "hover", selector: v.selector }),
  },
  {
    id: "select_option",
    label: "Pick a dropdown option",
    icon: "🎛️",
    description: "Choose a value in a <select> element.",
    fields: [
      { name: "selector", label: "Select element", type: "selector", placeholder: "select[name='country']" },
      { name: "value", label: "Option value", type: "text" },
    ],
    toStep: (v) => ({ action: "select_option", selector: v.selector, value: v.value }),
  },
  {
    id: "press_key",
    label: "Press a key",
    icon: "⌨️",
    description: "Dispatch a key (Enter, Escape, Tab…) on a target.",
    fields: [
      { name: "selector", label: "Target selector (optional)", type: "selector", optional: true },
      { name: "value", label: "Key", type: "text", placeholder: "Enter" },
    ],
    toStep: (v) => ({ action: "press_key", selector: v.selector || "body", value: v.value || "Enter" }),
  },
  {
    id: "extract_text",
    label: "Save text into a variable",
    icon: "📋",
    description: "Read innerText from a selector into {{var.NAME}}.",
    fields: [
      { name: "selector", label: "Selector", type: "selector" },
      { name: "var", label: "Variable name", type: "text", placeholder: "topic" },
    ],
    toStep: (v) => ({ action: "extract_text", selector: v.selector, var: v.var || "value" }),
  },
  {
    id: "set_var",
    label: "Set a variable",
    icon: "🏷️",
    description: "Assign a literal value to {{var.NAME}} for later steps.",
    fields: [
      { name: "var", label: "Variable name", type: "text", placeholder: "topic" },
      { name: "value", label: "Value", type: "text" },
    ],
    toStep: (v) => ({ action: "set_var", var: v.var, value: v.value }),
  },
  {
    id: "copy_to_clipboard",
    label: "Copy to clipboard",
    icon: "📎",
    description: "Copy literal text or the content of a selector to the OS clipboard.",
    fields: [
      { name: "selector", label: "Selector (optional)", type: "selector", optional: true },
      { name: "value", label: "Literal text (if no selector)", type: "text", optional: true },
    ],
    toStep: (v) => ({ action: "copy_to_clipboard", selector: v.selector || undefined, value: v.value || undefined }),
  },
  {
    id: "notify",
    label: "Show a notification",
    icon: "🔔",
    description: "Surface a desktop notification while the macro runs.",
    fields: [
      { name: "title", label: "Title", type: "text", placeholder: "Done!" },
      { name: "message", label: "Message", type: "text" },
    ],
    toStep: (v) => ({ action: "notify", title: v.title, message: v.message }),
  },
  {
    id: "navigate_back",
    label: "Go back",
    icon: "↩️",
    description: "Navigate to the previous page in history.",
    fields: [],
    toStep: () => ({ action: "navigate_back" }),
  },
  {
    id: "reload",
    label: "Reload page",
    icon: "🔄",
    description: "Refresh the active tab.",
    fields: [],
    toStep: () => ({ action: "reload" }),
  },
  {
    id: "scroll_window",
    label: "Scroll window",
    icon: "🔽",
    description: "Scroll the whole page to top or bottom.",
    fields: [{ name: "target", label: "top or bottom", type: "text", placeholder: "bottom" }],
    toStep: (v) => ({ action: "scroll_window", target: v.target || "bottom" }),
  },
  {
    id: "extract_to_card",
    label: "Save page text to a Zettel card",
    icon: "🗂️",
    description: "Extract text from a selector and create a new Zettel card.",
    fields: [
      { name: "selector", label: "Selector to extract", type: "selector", placeholder: "article" },
      { name: "title", label: "Card title", type: "text", placeholder: "Extracted from {{page.title}}" },
    ],
    toStep: (v) => ({ action: "extract_to_card", selector: v.selector, title: v.title }),
  },
  {
    id: "summarize_page",
    label: "Summarize the page",
    icon: "📝",
    description: "Send the current page to ALICE for a summary, saved to a notebook.",
    fields: [
      { name: "notebook", label: "Notebook name (optional)", type: "text", optional: true, placeholder: "Research" },
    ],
    toStep: (v) => ({ action: "summarize_page", notebook: v.notebook || undefined }),
  },
  {
    id: "alice_chat",
    label: "Send a prompt to ALICE",
    icon: "✨",
    description: "Open ALICE chat and send a prompt (can reference {{var.*}}).",
    fields: [{ name: "prompt", label: "Prompt", type: "textarea", placeholder: "Draft an email about {{var.topic}}" }],
    toStep: (v) => ({ action: "alice_chat", prompt: v.prompt }),
  },
  {
    id: "run_macro",
    label: "Run another macro",
    icon: "🔗",
    description: "Chain into another saved macro by id.",
    fields: [{ name: "macro_id", label: "Macro ID", type: "text" }],
    toStep: (v) => ({ action: "run_macro", macro_id: v.macro_id }),
  },
  {
    id: "alice_plan",
    label: "Let ALICE plan the rest",
    icon: "🧠",
    description: "Hand off to ALICE to research and execute the remaining steps.",
    fields: [{ name: "goal", label: "Goal", type: "textarea", placeholder: "Complete the checkout" }],
    toStep: (v) => ({ action: "alice_plan", goal: v.goal }),
  },
  {
    id: "custom",
    label: "Custom step (advanced)",
    icon: "⚙️",
    description: "Raw step JSON for power users.",
    fields: [{ name: "json", label: "Step JSON", type: "json", placeholder: '{"action":"click","selector":"#go"}' }],
    toStep: (v) => {
      try { return JSON.parse(v.json); } catch { return { action: "noop", note: "Invalid JSON" }; }
    },
  },
];

export const ABILITY_BY_ID: Record<string, Ability> = Object.fromEntries(
  ABILITIES.map((a) => [a.id, a]),
);
