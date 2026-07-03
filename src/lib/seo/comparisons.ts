import type { FAQItem } from "@/components/seo/FAQBlock";

export interface ComparisonSpec {
  slug: string;
  competitor: string;
  title: string;
  metaDescription: string;
  h1: string;
  answerSummary: string;
  verdict: string;
  tableRows: [string, string, string][]; // [feature, PendragonX, competitor]
  strengths: { pendragonx: string[]; competitor: string[] };
  faqs: FAQItem[];
}

const tableHeaders = ["Capability", "PendragonX", "%COMPETITOR%"];

export const comparisonTableHeaders = tableHeaders;

export const comparisons: ComparisonSpec[] = [
  {
    slug: "notion",
    competitor: "Notion",
    title: "PendragonX vs Notion (2026): Best AI Second Brain Alternative",
    metaDescription:
      "Side-by-side comparison of PendragonX and Notion for AI-native knowledge management. Auto-linking, private AI chat, pricing, imports, and knowledge graph — updated 2026.",
    h1: "PendragonX vs Notion: Which is the better AI second brain in 2026?",
    answerSummary:
      "PendragonX is the better choice for AI-native personal knowledge management, while Notion remains stronger for team wikis and structured databases. PendragonX includes auto-linking, a living knowledge graph, and private AI chat at $4.99/month; Notion charges $10/user/month extra for Notion AI on top of its workspace plans.",
    verdict:
      "Choose PendragonX if you want AI, auto-linking, and a knowledge graph out of the box. Choose Notion if you primarily need collaborative databases and templated team wikis.",
    tableRows: [
      ["Automatic idea linking", "Yes — AI links every card", "No — manual @mentions"],
      ["Living knowledge graph", "Built in", "Not available"],
      ["Private AI chat over your notes", "Included in Premium", "Extra $10/user/month (Notion AI)"],
      ["Autonomous AI agents", "Yes", "Limited (workflows only)"],
      ["End-to-end encryption", "Optional per item", "No"],
      ["Free tier", "Free forever (50 cards)", "Free with block limits"],
      ["Paid tier", "$4.99 / month", "$10–$20 / user / month + AI add-on"],
      ["Import from Obsidian / Roam", "One-click, dedupe", "Manual"],
      ["Offline mode", "Full PWA", "Read-only, limited"],
    ],
    strengths: {
      pendragonx: [
        "Automatic AI linking with no tagging or backlink syntax",
        "Private AI chat and agents included at $4.99/month",
        "Living knowledge graph, Canvas, Whiteboard, and Mind Map studios",
        "One-click Notion import with duplicate detection",
      ],
      competitor: [
        "Mature team wikis, permissions, and databases",
        "Larger template ecosystem for project management",
        "Native calendar/roadmap views for teams",
      ],
    },
    faqs: [
      {
        question: "Is PendragonX a Notion alternative?",
        answer:
          "Yes. PendragonX imports Notion exports in one click and replaces Notion for personal knowledge management, note linking, and AI chat over your own content. Notion is still stronger for shared team databases.",
      },
      {
        question: "How much does AI cost in PendragonX vs Notion?",
        answer:
          "PendragonX includes private AI chat, agents, and auto-linking in its $4.99/month Premium tier. Notion charges an extra $10 per user per month for Notion AI on top of the workspace plan.",
      },
      {
        question: "Can I move my Notion workspace to PendragonX?",
        answer:
          "Yes. Export your Notion workspace as Markdown or HTML and drag the ZIP into PendragonX. It preserves hierarchy, backlinks, and detects duplicates on import.",
      },
      {
        question: "Does PendragonX have databases like Notion?",
        answer:
          "PendragonX offers Spaces — a relational object system with custom fields and multiple views (table, board, gallery). It maps cleanly to Notion databases while adding automatic linking across records.",
      },
    ],
  },
  {
    slug: "obsidian",
    competitor: "Obsidian",
    title: "PendragonX vs Obsidian (2026): AI Knowledge Graph Without Plugins",
    metaDescription:
      "Obsidian requires plugins for AI, sync, and the graph. PendragonX ships them natively with auto-linking and private AI chat. Compare features, pricing, and imports.",
    h1: "PendragonX vs Obsidian: Which second brain wins in 2026?",
    answerSummary:
      "PendragonX is the better fit for writers who want AI built in; Obsidian is better for local-first Markdown purists. PendragonX ships a knowledge graph, private AI chat, agents, and sync natively at $4.99/month, while Obsidian needs paid Sync ($4), Publish ($8), and configured plugins to match.",
    verdict:
      "Choose PendragonX if you want AI, sync, and a knowledge graph without plugin configuration. Choose Obsidian if local Markdown files and full plugin control matter more than AI features.",
    tableRows: [
      ["Local-first Markdown", "Import/export supported", "Native storage"],
      ["Knowledge graph", "Living, AI-generated", "Static, manual links only"],
      ["AI chat over notes", "Built in", "Requires 3rd-party plugin + API key"],
      ["AI agents", "Built in", "Not supported"],
      ["Automatic linking", "Yes (embedding similarity)", "No — manual [[wikilinks]]"],
      ["Sync across devices", "Built in", "Obsidian Sync $4/mo"],
      ["Publish to web", "Included", "Obsidian Publish $8/mo"],
      ["Real-time collaboration", "Yes", "No"],
      ["Free tier", "Free forever", "Free for personal use"],
      ["Paid tier", "$4.99 / month all-in", "$4 Sync + $8 Publish + plugins"],
    ],
    strengths: {
      pendragonx: [
        "No plugin setup — AI, graph, sync, and collaboration work out of the box",
        "Automatic embedding-based linking replaces manual [[wikilinks]]",
        "Canvas, Whiteboard, and Mind Map studios built in",
        "One-click Obsidian vault import preserves your existing links",
      ],
      competitor: [
        "Local Markdown files you fully own",
        "Massive community plugin ecosystem",
        "Powerful CSS/theming for hardcore customizers",
      ],
    },
    faqs: [
      {
        question: "Can I import my Obsidian vault into PendragonX?",
        answer:
          "Yes. Drag your vault folder or ZIP into PendragonX. It preserves [[wikilinks]], resolves backlinks, converts callouts, and detects duplicates automatically.",
      },
      {
        question: "Does PendragonX work offline like Obsidian?",
        answer:
          "Yes. PendragonX is a Progressive Web App with a full offline cache. You can read, edit, and create content offline; changes sync automatically when you reconnect.",
      },
      {
        question: "Do I still need plugins in PendragonX?",
        answer:
          "No — the features Obsidian users typically install plugins for (AI chat, sync, graph, canvas, tasks, calendar, mind maps) are all built in and maintained by the PendragonX team.",
      },
      {
        question: "Is PendragonX cheaper than Obsidian with Sync and Publish?",
        answer:
          "Yes. Obsidian Sync ($4/mo) + Publish ($8/mo) totals $12/month before you add any AI. PendragonX Premium is $4.99/month and includes AI, sync, publish, and collaboration.",
      },
    ],
  },
  {
    slug: "roam-research",
    competitor: "Roam Research",
    title: "PendragonX vs Roam Research (2026): Cheaper, AI-Native Alternative",
    metaDescription:
      "Roam pioneered bi-directional linking but costs $15/mo and is text-only. PendragonX adds AI, a knowledge graph, visual studios, and imports at $4.99/mo.",
    h1: "PendragonX vs Roam Research: A cheaper, AI-native alternative in 2026",
    answerSummary:
      "PendragonX is the modern successor to Roam Research: it keeps bi-directional linking and daily notes but adds AI chat, a living knowledge graph, and visual studios at one-third the price ($4.99/month vs Roam's $15/month). PendragonX also imports Roam JSON exports in a single click.",
    verdict:
      "Choose PendragonX if you want Roam-style networked thought plus AI, visuals, and lower cost. Stay on Roam only if you rely on niche block-reference plugins.",
    tableRows: [
      ["Bi-directional linking", "Yes + automatic AI links", "Yes (manual)"],
      ["Daily notes", "Built in", "Built in"],
      ["Knowledge graph", "Living, AI-driven", "Static text graph"],
      ["Private AI chat", "Included", "Beta only"],
      ["Visual thinking (Canvas, Mind Map)", "Native", "Not available"],
      ["End-to-end encryption", "Optional per item", "No"],
      ["Import from Roam", "One-click JSON import", "N/A"],
      ["Free tier", "Free forever", "None"],
      ["Paid tier", "$4.99 / month", "$15 / month"],
    ],
    strengths: {
      pendragonx: [
        "One-third the price of Roam Research",
        "AI-driven auto-linking on top of classic bi-directional links",
        "Living knowledge graph plus Canvas and Mind Map studios",
        "Free forever tier with 50 cards",
      ],
      competitor: [
        "Block-level references and queries",
        "Deep outliner-first workflow",
        "Established community of researchers",
      ],
    },
    faqs: [
      {
        question: "Can I import my Roam graph into PendragonX?",
        answer:
          "Yes. Export your Roam graph as JSON and drag it into PendragonX. Bi-directional links, block references, and daily notes are preserved during import.",
      },
      {
        question: "Does PendragonX support daily notes like Roam?",
        answer:
          "Yes. Daily notes are built in, integrated with the calendar, and automatically linked to any card, task, or event you reference that day.",
      },
      {
        question: "Is PendragonX really $10/month cheaper than Roam?",
        answer:
          "Yes. PendragonX Premium is $4.99/month or $29.99/year; Roam Research is $15/month with no free tier.",
      },
    ],
  },
  {
    slug: "onenote",
    competitor: "OneNote",
    title: "PendragonX vs OneNote (2026): AI Knowledge Graph vs Digital Notebook",
    metaDescription:
      "OneNote is a free digital notebook with no AI or graph. PendragonX turns your notes into a living knowledge graph with private AI chat. Compare features and imports.",
    h1: "PendragonX vs OneNote: Modern AI second brain vs digital notebook",
    answerSummary:
      "PendragonX is the modern alternative to OneNote for anyone who wants AI, automatic linking, and a knowledge graph. OneNote is a free digital notebook with sections and pages but no AI chat, no graph, and no automatic connections between ideas. PendragonX Premium is $4.99/month.",
    verdict:
      "Choose PendragonX if you want an AI-native second brain. Stay on OneNote only if you need free Microsoft-ecosystem note-taking and don't need AI or linking.",
    tableRows: [
      ["Automatic idea linking", "Yes", "No"],
      ["Knowledge graph", "Yes", "No"],
      ["AI chat over notes", "Included", "Copilot (extra Microsoft 365 add-on)"],
      ["AI agents", "Yes", "No"],
      ["Real-time collaboration", "Yes", "Yes (Microsoft account)"],
      ["Import from OneNote", "Markdown / DOCX import", "N/A"],
      ["Free tier", "Free forever", "Free"],
      ["Paid tier", "$4.99 / month", "Bundled with Microsoft 365"],
    ],
    strengths: {
      pendragonx: [
        "Automatic linking and knowledge graph OneNote simply doesn't have",
        "Private AI chat and agents included in Premium",
        "Canvas and Mind Map studios for visual thinking",
      ],
      competitor: [
        "Free forever with a Microsoft account",
        "Deep Microsoft 365 integration",
        "Familiar notebook metaphor for education/office users",
      ],
    },
    faqs: [
      {
        question: "Can I move from OneNote to PendragonX?",
        answer:
          "Yes. Export your OneNote sections as Markdown or DOCX and drag them into PendragonX; hierarchy is preserved and duplicates are flagged.",
      },
      {
        question: "Does PendragonX replace Microsoft Copilot?",
        answer:
          "For your personal notes, yes. PendragonX provides private AI chat, agents, and content generation grounded only in your knowledge — without a Microsoft 365 subscription.",
      },
    ],
  },
  {
    slug: "evernote",
    competitor: "Evernote",
    title: "PendragonX vs Evernote (2026): The Modern AI Successor",
    metaDescription:
      "Evernote is a legacy web clipper with limited AI and no knowledge graph. PendragonX is the AI-native second brain with auto-linking, imports .enex, and costs less.",
    h1: "PendragonX vs Evernote: The modern AI successor in 2026",
    answerSummary:
      "PendragonX is the modern successor to Evernote, replacing static notebooks with a living AI-linked knowledge graph. Evernote's Personal plan is $14.99/month with limited AI; PendragonX Premium is $4.99/month with full private AI chat, agents, and one-click .enex import.",
    verdict:
      "Choose PendragonX if you want your notes to actually think with you. Evernote makes sense only if you already have years of clipped web content and don't want to migrate.",
    tableRows: [
      ["Automatic idea linking", "Yes", "No"],
      ["Knowledge graph", "Yes", "No"],
      ["Private AI chat", "Included", "Limited AI in Professional"],
      ["Web clipper", "Chrome Toolbox extension", "Native clipper"],
      ["Import from Evernote (.enex)", "One-click, splits notebooks", "N/A"],
      ["Free tier", "Free forever, 50 cards", "Free, 50 notes/notebook cap"],
      ["Paid tier", "$4.99 / month", "$14.99 / month (Personal)"],
    ],
    strengths: {
      pendragonx: [
        "One-click .enex import that splits notebooks into individual notes",
        "Auto-linking and living knowledge graph Evernote lacks",
        "Private AI chat and agents included",
        "Roughly one-third the cost of Evernote Personal",
      ],
      competitor: [
        "Mature web clipper with document scanning",
        "Task management with reminders",
        "20+ years of accumulated user content lock-in",
      ],
    },
    faqs: [
      {
        question: "Can I import my Evernote notebooks into PendragonX?",
        answer:
          "Yes. Export your Evernote data as .enex and drop it into PendragonX. Each notebook is split into individual, atomic notes that get automatically linked and categorized.",
      },
      {
        question: "Does PendragonX have a web clipper like Evernote?",
        answer:
          "Yes. The PendragonX Toolbox Chrome extension clips pages, highlights, and screenshots directly into your knowledge base — with automatic Dewey categorization.",
      },
      {
        question: "Why switch from Evernote to PendragonX in 2026?",
        answer:
          "Evernote has raised prices while adding limited AI. PendragonX gives you a full AI second brain — auto-linking, knowledge graph, private chat, agents — at one-third the price.",
      },
    ],
  },
];
