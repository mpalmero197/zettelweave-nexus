import type { FAQItem } from "@/components/seo/FAQBlock";

export interface ComparisonSpec {
  slug: string;
  competitor: string;
  title: string;
  metaDescription: string;
  h1: string;
  answerSummary: string;
  verdict: string;
  tableRows: [string, string, string][]; // [feature, Baku Scribe, competitor]
  strengths: { bakuscribe: string[]; competitor: string[] };
  faqs: FAQItem[];
}

const tableHeaders = ["Capability", "Baku Scribe", "%COMPETITOR%"];

export const comparisonTableHeaders = tableHeaders;

export const comparisons: ComparisonSpec[] = [
  {
    slug: "notion",
    competitor: "Notion",
    title: "Baku Scribe vs Notion (2026): Best AI Second Brain Alternative",
    metaDescription:
      "Side-by-side comparison of Baku Scribe and Notion for AI-native knowledge management. Auto-linking, private AI chat, pricing, imports, and knowledge graph — updated 2026.",
    h1: "Baku Scribe vs Notion: Which is the better AI second brain in 2026?",
    answerSummary:
      "Baku Scribe is the better choice for AI-native personal knowledge management, while Notion remains stronger for team wikis and structured databases. Baku Scribe includes auto-linking, a living knowledge graph, and private AI chat at $4.99/month; Notion charges $10/user/month extra for Notion AI on top of its workspace plans.",
    verdict:
      "Choose Baku Scribe if you want AI, auto-linking, and a knowledge graph out of the box. Choose Notion if you primarily need collaborative databases and templated team wikis.",
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
      bakuscribe: [
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
        question: "Is Baku Scribe a Notion alternative?",
        answer:
          "Yes. Baku Scribe imports Notion exports in one click and replaces Notion for personal knowledge management, note linking, and AI chat over your own content. Notion is still stronger for shared team databases.",
      },
      {
        question: "How much does AI cost in Baku Scribe vs Notion?",
        answer:
          "Baku Scribe includes private AI chat, agents, and auto-linking in its $4.99/month Premium tier. Notion charges an extra $10 per user per month for Notion AI on top of the workspace plan.",
      },
      {
        question: "Can I move my Notion workspace to Baku Scribe?",
        answer:
          "Yes. Export your Notion workspace as Markdown or HTML and drag the ZIP into Baku Scribe. It preserves hierarchy, backlinks, and detects duplicates on import.",
      },
      {
        question: "Does Baku Scribe have databases like Notion?",
        answer:
          "Baku Scribe offers Spaces — a relational object system with custom fields and multiple views (table, board, gallery). It maps cleanly to Notion databases while adding automatic linking across records.",
      },
    ],
  },
  {
    slug: "obsidian",
    competitor: "Obsidian",
    title: "Baku Scribe vs Obsidian (2026): AI Knowledge Graph Without Plugins",
    metaDescription:
      "Obsidian requires plugins for AI, sync, and the graph. Baku Scribe ships them natively with auto-linking and private AI chat. Compare features, pricing, and imports.",
    h1: "Baku Scribe vs Obsidian: Which second brain wins in 2026?",
    answerSummary:
      "Baku Scribe is the better fit for writers who want AI built in; Obsidian is better for local-first Markdown purists. Baku Scribe ships a knowledge graph, private AI chat, agents, and sync natively at $4.99/month, while Obsidian needs paid Sync ($4), Publish ($8), and configured plugins to match.",
    verdict:
      "Choose Baku Scribe if you want AI, sync, and a knowledge graph without plugin configuration. Choose Obsidian if local Markdown files and full plugin control matter more than AI features.",
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
      bakuscribe: [
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
        question: "Can I import my Obsidian vault into Baku Scribe?",
        answer:
          "Yes. Drag your vault folder or ZIP into Baku Scribe. It preserves [[wikilinks]], resolves backlinks, converts callouts, and detects duplicates automatically.",
      },
      {
        question: "Does Baku Scribe work offline like Obsidian?",
        answer:
          "Yes. Baku Scribe is a Progressive Web App with a full offline cache. You can read, edit, and create content offline; changes sync automatically when you reconnect.",
      },
      {
        question: "Do I still need plugins in Baku Scribe?",
        answer:
          "No — the features Obsidian users typically install plugins for (AI chat, sync, graph, canvas, tasks, calendar, mind maps) are all built in and maintained by the Baku Scribe team.",
      },
      {
        question: "Is Baku Scribe cheaper than Obsidian with Sync and Publish?",
        answer:
          "Yes. Obsidian Sync ($4/mo) + Publish ($8/mo) totals $12/month before you add any AI. Baku Scribe Premium is $4.99/month and includes AI, sync, publish, and collaboration.",
      },
    ],
  },
  {
    slug: "roam-research",
    competitor: "Roam Research",
    title: "Baku Scribe vs Roam Research (2026): Cheaper, AI-Native Alternative",
    metaDescription:
      "Roam pioneered bi-directional linking but costs $15/mo and is text-only. Baku Scribe adds AI, a knowledge graph, visual studios, and imports at $4.99/mo.",
    h1: "Baku Scribe vs Roam Research: A cheaper, AI-native alternative in 2026",
    answerSummary:
      "Baku Scribe is the modern successor to Roam Research: it keeps bi-directional linking and daily notes but adds AI chat, a living knowledge graph, and visual studios at one-third the price ($4.99/month vs Roam's $15/month). Baku Scribe also imports Roam JSON exports in a single click.",
    verdict:
      "Choose Baku Scribe if you want Roam-style networked thought plus AI, visuals, and lower cost. Stay on Roam only if you rely on niche block-reference plugins.",
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
      bakuscribe: [
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
        question: "Can I import my Roam graph into Baku Scribe?",
        answer:
          "Yes. Export your Roam graph as JSON and drag it into Baku Scribe. Bi-directional links, block references, and daily notes are preserved during import.",
      },
      {
        question: "Does Baku Scribe support daily notes like Roam?",
        answer:
          "Yes. Daily notes are built in, integrated with the calendar, and automatically linked to any card, task, or event you reference that day.",
      },
      {
        question: "Is Baku Scribe really $10/month cheaper than Roam?",
        answer:
          "Yes. Baku Scribe Premium is $4.99/month or $29.99/year; Roam Research is $15/month with no free tier.",
      },
    ],
  },
  {
    slug: "onenote",
    competitor: "OneNote",
    title: "Baku Scribe vs OneNote (2026): AI Knowledge Graph vs Digital Notebook",
    metaDescription:
      "OneNote is a free digital notebook with no AI or graph. Baku Scribe turns your notes into a living knowledge graph with private AI chat. Compare features and imports.",
    h1: "Baku Scribe vs OneNote: Modern AI second brain vs digital notebook",
    answerSummary:
      "Baku Scribe is the modern alternative to OneNote for anyone who wants AI, automatic linking, and a knowledge graph. OneNote is a free digital notebook with sections and pages but no AI chat, no graph, and no automatic connections between ideas. Baku Scribe Premium is $4.99/month.",
    verdict:
      "Choose Baku Scribe if you want an AI-native second brain. Stay on OneNote only if you need free Microsoft-ecosystem note-taking and don't need AI or linking.",
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
      bakuscribe: [
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
        question: "Can I move from OneNote to Baku Scribe?",
        answer:
          "Yes. Export your OneNote sections as Markdown or DOCX and drag them into Baku Scribe; hierarchy is preserved and duplicates are flagged.",
      },
      {
        question: "Does Baku Scribe replace Microsoft Copilot?",
        answer:
          "For your personal notes, yes. Baku Scribe provides private AI chat, agents, and content generation grounded only in your knowledge — without a Microsoft 365 subscription.",
      },
    ],
  },
  {
    slug: "evernote",
    competitor: "Evernote",
    title: "Baku Scribe vs Evernote (2026): The Modern AI Successor",
    metaDescription:
      "Evernote is a legacy web clipper with limited AI and no knowledge graph. Baku Scribe is the AI-native second brain with auto-linking, imports .enex, and costs less.",
    h1: "Baku Scribe vs Evernote: The modern AI successor in 2026",
    answerSummary:
      "Baku Scribe is the modern successor to Evernote, replacing static notebooks with a living AI-linked knowledge graph. Evernote's Personal plan is $14.99/month with limited AI; Baku Scribe Premium is $4.99/month with full private AI chat, agents, and one-click .enex import.",
    verdict:
      "Choose Baku Scribe if you want your notes to actually think with you. Evernote makes sense only if you already have years of clipped web content and don't want to migrate.",
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
      bakuscribe: [
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
        question: "Can I import my Evernote notebooks into Baku Scribe?",
        answer:
          "Yes. Export your Evernote data as .enex and drop it into Baku Scribe. Each notebook is split into individual, atomic notes that get automatically linked and categorized.",
      },
      {
        question: "Does Baku Scribe have a web clipper like Evernote?",
        answer:
          "Yes. The Baku Scribe Toolbox Chrome extension clips pages, highlights, and screenshots directly into your knowledge base — with automatic Dewey categorization.",
      },
      {
        question: "Why switch from Evernote to Baku Scribe in 2026?",
        answer:
          "Evernote has raised prices while adding limited AI. Baku Scribe gives you a full AI second brain — auto-linking, knowledge graph, private chat, agents — at one-third the price.",
      },
    ],
  },
  {
    slug: "apple-notes",
    competitor: "Apple Notes",
    title: "Baku Scribe vs Apple Notes (2026): AI Second Brain Alternative",
    metaDescription:
      "Baku Scribe vs Apple Notes compared: automatic linking, knowledge graph, private AI chat, cross-platform access, and pricing. A full second brain instead of a notes app.",
    h1: "Baku Scribe vs Apple Notes: when do you outgrow Apple Notes?",
    answerSummary:
      "Apple Notes is excellent for quick capture inside the Apple ecosystem, but it stores notes as isolated documents with no linking, graph, or AI reasoning. Baku Scribe keeps capture just as fast while automatically connecting every note into a living knowledge graph you can chat with, on any platform including Windows, Android, and the web.",
    verdict:
      "Stay on Apple Notes for grocery lists and scanned receipts. Move to Baku Scribe once your notes need to talk to each other — research, writing projects, or a long-term second brain.",
    tableRows: [
      ["Automatic idea linking", "Yes — AI links every card", "No — isolated notes"],
      ["Living knowledge graph", "Built in", "Not available"],
      ["AI chat over your notes", "Included in Premium", "No"],
      ["Cross-platform", "Web, Windows, Android, iOS, PWA", "Apple devices only"],
      ["Backlinks and wikilinks", "Yes", "No"],
      ["Import from Notion / Obsidian", "One-click, dedupe", "No"],
      ["Free tier", "Free forever (50 cards)", "Free with iCloud storage limits"],
      ["Publishing and sharing", "Share links, collaboration", "Limited note sharing"],
    ],
    strengths: {
      bakuscribe: [
        "Notes become a connected graph instead of a flat list",
        "Private AI chat and agents grounded in your own notes",
        "Works on every platform, not just Apple hardware",
        "Canvas, Whiteboard, and Mind Map studios for spatial thinking",
      ],
      competitor: [
        "Deep OS integration: Siri, Apple Pencil, Lock Screen capture",
        "Free with every Apple device and instant iCloud sync",
        "Excellent document scanning and handwriting",
      ],
    },
    faqs: [
      {
        question: "Is there a good Apple Notes alternative with AI?",
        answer:
          "Baku Scribe is an AI-native Apple Notes alternative. It auto-links notes into a knowledge graph and lets you chat with your own notes privately, which Apple Notes cannot do.",
      },
      {
        question: "Can I import my Apple Notes into Baku Scribe?",
        answer:
          "Yes. Export your notes as PDF or Markdown (or copy them into Markdown files) and drag them into Baku Scribe's Import Studio. Duplicate detection runs automatically.",
      },
      {
        question: "Does Baku Scribe work on iPhone and iPad?",
        answer:
          "Yes. Baku Scribe installs as a Progressive Web App on iOS and iPadOS with full offline support, and also runs on Android, Windows, macOS, and the web.",
      },
    ],
  },
  {
    slug: "logseq",
    competitor: "Logseq",
    title: "Baku Scribe vs Logseq (2026): Best Logseq Alternative Compared",
    metaDescription:
      "Baku Scribe vs Logseq compared: outliner blocks vs atomic cards, automatic linking, built-in AI, knowledge graph, sync, and pricing. The zero-setup Logseq alternative.",
    h1: "Baku Scribe vs Logseq: outliner blocks or an AI knowledge graph?",
    answerSummary:
      "Logseq is a free, local-first outliner with block references and a plugin ecosystem, but it requires manual linking and configuration and has no built-in AI. Baku Scribe links your notes automatically, ships AI chat and agents out of the box, and syncs reliably across devices without plugins or file wrangling.",
    verdict:
      "Choose Logseq if you want local Markdown files and daily-journal outlining you configure yourself. Choose Baku Scribe if you want automatic linking, built-in AI, and reliable sync with zero setup.",
    tableRows: [
      ["Automatic idea linking", "Yes — AI links every card", "No — manual [[links]]"],
      ["Built-in AI chat and agents", "Yes", "No — third-party plugins only"],
      ["Setup and configuration", "None — works instantly", "Manual: graphs, plugins, sync"],
      ["Living knowledge graph", "Built in", "Basic graph view"],
      ["Reliable multi-device sync", "Yes, built in", "Paid Sync or self-managed"],
      ["Canvas / Whiteboard / Mind Map", "All three included", "Whiteboards only"],
      ["Free tier", "Free forever (50 cards)", "Free, open source"],
      ["End-to-end encryption", "Optional per item", "Via Sync only"],
    ],
    strengths: {
      bakuscribe: [
        "Zero-configuration automatic linking and knowledge graph",
        "Private AI chat and agents included, no plugins",
        "Dependable cross-device sync and offline PWA",
        "Import Logseq Markdown with duplicate detection",
      ],
      competitor: [
        "Free and open source with local Markdown ownership",
        "Powerful block-level references and queries",
        "Strong plugin and theming community",
      ],
    },
    faqs: [
      {
        question: "What is the best Logseq alternative in 2026?",
        answer:
          "Baku Scribe is the strongest Logseq alternative for people who want automatic linking and built-in AI instead of manual outlining and plugin configuration, while keeping Markdown import and export.",
      },
      {
        question: "Can I move my Logseq graph to Baku Scribe?",
        answer:
          "Yes. Logseq stores plain Markdown, so you can drag your pages folder into Baku Scribe's Import Studio. Wikilinks resolve after import and duplicates are detected.",
      },
      {
        question: "Does Baku Scribe support block references like Logseq?",
        answer:
          "Baku Scribe uses atomic Zettelkasten cards with wikilinks and contextual backlinks. It covers the same referencing use cases while adding AI-generated links you did not have to create.",
      },
    ],
  },
  {
    slug: "mem",
    competitor: "Mem",
    title: "Baku Scribe vs Mem (2026): AI Note-Taking Compared",
    metaDescription:
      "Baku Scribe vs Mem compared: AI auto-linking, knowledge graph visualization, agents, encryption, offline mode, and pricing. A cheaper, more visual Mem alternative.",
    h1: "Baku Scribe vs Mem: which AI notes app should you keep?",
    answerSummary:
      "Mem pioneered AI-organized notes but keeps everything in a chronological stream with limited visual structure and a higher price. Baku Scribe adds a living knowledge graph, Canvas and Mind Map studios, autonomous agents, optional end-to-end encryption, and full offline mode at $4.99 per month.",
    verdict:
      "Choose Mem if you want a minimal AI inbox for notes. Choose Baku Scribe if you want the same AI organization plus visual thinking, agents, encryption, and a lower price.",
    tableRows: [
      ["AI automatic linking", "Yes — embedding based", "Yes"],
      ["Living knowledge graph", "Built in", "Not available"],
      ["Canvas / Whiteboard / Mind Map", "All three included", "No"],
      ["Autonomous AI agents", "Yes", "Limited"],
      ["End-to-end encryption", "Optional per item", "No"],
      ["Offline mode", "Full PWA", "Limited"],
      ["Paid tier", "$4.99 / month", "$14.99+ / month"],
      ["Import from Notion / Obsidian", "One-click, dedupe", "Partial"],
    ],
    strengths: {
      bakuscribe: [
        "Knowledge graph and spatial studios on top of AI linking",
        "Autonomous agents that monitor and synthesize your notes",
        "Optional zero-knowledge encryption for sensitive content",
        "Roughly one third the price of comparable AI notes apps",
      ],
      competitor: [
        "Very fast, low-friction capture inbox",
        "Clean, minimal interface with little to learn",
        "Strong email and calendar capture flows",
      ],
    },
    faqs: [
      {
        question: "Is Baku Scribe a cheaper Mem alternative?",
        answer:
          "Yes. Baku Scribe Premium is $4.99 per month and includes AI chat, agents, the knowledge graph, and visual studios, well below typical AI note-taking subscriptions.",
      },
      {
        question: "Does Baku Scribe organize notes automatically like Mem?",
        answer:
          "Yes. Baku Scribe categorizes new cards automatically and links them to similar cards using embeddings every 30 minutes, so structure appears without manual tagging.",
      },
      {
        question: "Can I keep sensitive notes private?",
        answer:
          "Baku Scribe offers optional per-item end-to-end encryption with zero-knowledge keys, so encrypted content is unreadable server-side.",
      },
    ],
  },
  {
    slug: "craft",
    competitor: "Craft",
    title: "Baku Scribe vs Craft (2026): Beautiful Docs vs AI Second Brain",
    metaDescription:
      "Baku Scribe vs Craft compared: document design vs automatic linking and knowledge graphs, AI chat, agents, cross-platform support, and pricing for 2026.",
    h1: "Baku Scribe vs Craft: beautiful documents or a connected second brain?",
    answerSummary:
      "Craft is one of the best-designed document editors available, especially on Apple devices, but documents stay separate and structure is manual. Baku Scribe focuses on connection: every note is auto-linked into a living knowledge graph you can query with private AI, on every platform.",
    verdict:
      "Choose Craft if polished, shareable documents are the output you care about. Choose Baku Scribe if the value is in how your notes connect and what AI can find inside them.",
    tableRows: [
      ["Automatic idea linking", "Yes — AI links every card", "No — manual links"],
      ["Living knowledge graph", "Built in", "Not available"],
      ["AI chat grounded in your notes", "Included in Premium", "Generic AI assistant"],
      ["Cross-platform", "Web, Windows, Android, iOS, PWA", "Best on Apple, limited elsewhere"],
      ["Autonomous AI agents", "Yes", "No"],
      ["Canvas / Whiteboard / Mind Map", "All three included", "No"],
      ["Paid tier", "$4.99 / month", "$10+ / month"],
      ["Import from Notion / Obsidian", "One-click, dedupe", "Manual"],
    ],
    strengths: {
      bakuscribe: [
        "Automatic linking and a knowledge graph across everything you write",
        "Private AI chat and agents over your own content",
        "Visual studios for spatial thinking and planning",
        "Runs everywhere, including Windows and Android",
      ],
      competitor: [
        "Exceptional typography and document polish",
        "Delightful native Apple app experience",
        "Great for client-facing documents and sharing",
      ],
    },
    faqs: [
      {
        question: "Is Baku Scribe a good Craft alternative?",
        answer:
          "Baku Scribe is the better choice when you need connected knowledge rather than standalone documents: it auto-links notes, builds a knowledge graph, and answers questions from your own content.",
      },
      {
        question: "Can I write long documents in Baku Scribe?",
        answer:
          "Yes. The Catalyst writing suite handles long-form drafts with chapters, images, citation tools, document themes, and export to PDF, DOCX, and Markdown.",
      },
      {
        question: "Does Baku Scribe work outside the Apple ecosystem?",
        answer:
          "Yes. Baku Scribe is a web-first Progressive Web App that installs on Windows, Android, macOS, iOS, and ChromeOS with offline support.",
      },
    ],
  },
];

