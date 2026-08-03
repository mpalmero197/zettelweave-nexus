import type { FAQItem } from "@/components/seo/FAQBlock";

export interface GuideSpec {
  slug: string;
  title: string;
  metaDescription: string;
  keywords: string;
  h1: string;
  /** Short label used in listings and internal links. */
  shortTitle: string;
  answerSummary: string;
  intro: string;
  /** Rendered as a HowTo with schema. */
  howTo: {
    name: string;
    description: string;
    totalTime?: string;
    steps: { name: string; text: string }[];
  };
  sections: { heading: string; body: string[] }[];
  faqs: FAQItem[];
  datePublished: string;
}

export const guides: GuideSpec[] = [
  {
    slug: "zettelkasten-method",
    shortTitle: "The Zettelkasten method",
    title: "The Zettelkasten Method: A Practical 2026 Guide",
    metaDescription:
      "How the Zettelkasten (slip-box) method actually works: atomic notes, unique IDs, dense linking, and a step-by-step setup you can run today — with modern AI shortcuts.",
    keywords:
      "zettelkasten method, slip box method, how to use zettelkasten, atomic notes, permanent notes, luhmann note taking system, zettelkasten app",
    h1: "The Zettelkasten method, explained and set up in an afternoon",
    answerSummary:
      "The Zettelkasten method stores one idea per note in your own words, gives each note a stable identity, and connects notes densely so new ideas emerge from the links rather than from folders. Niklas Luhmann used index cards; modern tools keep the same rules while automating the linking that used to consume the most time.",
    intro:
      "Most note systems fail because they optimize for storage instead of retrieval. The Zettelkasten optimizes for thinking: you write fewer, better notes and spend your effort connecting them. Here is the method in practical terms, followed by a setup you can complete today.",
    howTo: {
      name: "How to set up a Zettelkasten",
      description:
        "A five-step setup for a working slip box, whether you use index cards or software.",
      totalTime: "PT45M",
      steps: [
        {
          name: "Separate fleeting, literature, and permanent notes",
          text: "Capture raw thoughts as fleeting notes, summarize sources as literature notes, and promote only ideas worth keeping into permanent notes written in full sentences.",
        },
        {
          name: "Write one idea per note, in your own words",
          text: "A permanent note should make sense on its own in a year. If it contains two ideas, split it. Rewriting in your own words is what makes the note usable later.",
        },
        {
          name: "Give every note a stable identity",
          text: "A timestamp or unique ID means links never break when you rename or rephrase a note. Titles can change; identity should not.",
        },
        {
          name: "Link generously and explain the link",
          text: "When you connect two notes, write one line saying why they relate. Those sentences become the argument of your next article or chapter.",
        },
        {
          name: "Review by following links, not folders",
          text: "Enter the slip box through a topic note or search, then follow links. Every session should end with at least one new connection.",
        },
      ],
    },
    sections: [
      {
        heading: "Why atomicity matters more than volume",
        body: [
          "A note holding three ideas can only be linked as a unit, so two of those ideas become invisible to future you. Atomic notes multiply the number of useful connections your system can hold, which is why a 300-note slip box can outperform a 3,000-page archive.",
          "Atomicity also forces clarity. If you cannot state the idea in a few sentences without the source in front of you, you have not understood it yet.",
        ],
      },
      {
        heading: "Where the method breaks down",
        body: [
          "Manual linking is the bottleneck. Past a few hundred notes, nobody remembers what already exists, so new notes arrive orphaned and the graph stops growing in density even as it grows in size.",
          "This is the one place software genuinely helps: embedding-based similarity can propose links you would have missed, leaving you to accept, reject, or annotate them. In Baku Scribe, auto-linking runs continuously and locks any link you edit by hand, so automation never overwrites your judgment.",
        ],
      },
      {
        heading: "A modern slip box in practice",
        body: [
          "Keep the discipline: atomic cards, your own words, explicit link reasons. Delegate the mechanical parts: categorization, similarity linking, backlink context, and graph visualization.",
          "Then use the system to produce. A cluster of linked cards is a working outline, and the link sentences you wrote along the way are the first draft of your argument.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is the Zettelkasten method in simple terms?",
        answer:
          "It is a note-taking system where each note holds a single idea in your own words, has a permanent identity, and links to related notes. Insight comes from the links between notes rather than from a folder hierarchy.",
      },
      {
        question: "How many notes do I need before it works?",
        answer:
          "Usefulness comes from link density, not count. Most people feel the system click somewhere between 100 and 300 well-linked permanent notes.",
      },
      {
        question: "Do I need software for a Zettelkasten?",
        answer:
          "No, index cards work. Software helps with search, backlinks, and automatic link suggestions, which is where manual slip boxes stall as they grow.",
      },
      {
        question: "How is a Zettelkasten different from a wiki?",
        answer:
          "A wiki documents settled knowledge for readers. A Zettelkasten develops your own thinking, so notes are personal, atomic, and connected for idea generation rather than reference.",
      },
    ],
    datePublished: "2026-08-03",
  },
  {
    slug: "migrate-from-notion",
    shortTitle: "Migrating from Notion",
    title: "How to Migrate from Notion Without Losing Structure",
    metaDescription:
      "Step-by-step guide to exporting a Notion workspace and importing it into Baku Scribe: databases, nested pages, backlinks, images, and duplicate handling.",
    keywords:
      "migrate from notion, notion export markdown, move out of notion, notion alternative migration, import notion into knowledge graph",
    h1: "How to migrate out of Notion without losing your structure",
    answerSummary:
      "Export your Notion workspace as Markdown and CSV with subpages included, then import the ZIP into Baku Scribe. Pages become atomic cards, nested pages become notebooks, database rows map to Spaces records, and wikilinks resolve after import while duplicate detection prevents double entries.",
    intro:
      "The hard part of leaving Notion is not the export button, it is keeping hierarchy, links, and attachments intact. This guide covers the export settings that matter and what each Notion concept becomes on the other side.",
    howTo: {
      name: "Migrate a Notion workspace to Baku Scribe",
      description:
        "Export from Notion and import into Baku Scribe with hierarchy, links, and attachments preserved.",
      totalTime: "PT20M",
      steps: [
        {
          name: "Export the workspace correctly",
          text: "In Notion, open Settings, then Export all workspace content. Choose Markdown & CSV, enable Include subpages, and enable Create folders for subpages so hierarchy survives.",
        },
        {
          name: "Check the archive before importing",
          text: "Unzip and confirm that images and attachments came through and that database CSVs are present. Large workspaces arrive as several ZIP parts, so collect them all.",
        },
        {
          name: "Import into Baku Scribe",
          text: "Open Import Studio and drop in the ZIP or folder. Pages become atomic cards, folders become notebooks, and images are attached to their cards.",
        },
        {
          name: "Resolve links and duplicates",
          text: "Wikilink resolution runs after import to reconnect internal Notion links, and duplicate detection flags repeated pages from multi-part exports before they are created.",
        },
        {
          name: "Rebuild databases as Spaces",
          text: "Import each database CSV into a Space, define its fields once, and pick table, board, or gallery views. Records then participate in automatic linking like everything else.",
        },
      ],
    },
    sections: [
      {
        heading: "What maps to what",
        body: [
          "Notion pages become atomic cards, and nested page folders become notebooks. Database rows become Spaces records with typed fields. Inline images and files are attached to the card they belonged to.",
          "Toggle lists, callouts, and code blocks come through as Markdown, so formatting survives even where the original block type does not exist.",
        ],
      },
      {
        heading: "What to clean up afterwards",
        body: [
          "Notion exports append page IDs to filenames. Baku Scribe strips them on import, but check a handful of long titles to be sure they read the way you want.",
          "Synced blocks and linked database views cannot be exported by Notion at all. Note where you relied on them and recreate those views as Spaces views once, rather than duplicating content.",
        ],
      },
      {
        heading: "After the migration",
        body: [
          "Run auto-linking and open the knowledge graph. Most people discover that pages they kept in separate Notion databases were about the same three or four topics all along.",
          "Keep the Notion export ZIP until you have confirmed a full week of normal work in the new system.",
        ],
      },
    ],
    faqs: [
      {
        question: "Will I lose my Notion databases?",
        answer:
          "No. Export includes CSV files for each database, and each one can be imported into a Space with typed fields and table, board, or gallery views.",
      },
      {
        question: "Do internal Notion links keep working?",
        answer:
          "Internal links are rewritten as wikilinks and resolved after import, so cards reconnect to each other rather than pointing at dead Notion URLs.",
      },
      {
        question: "What happens if I import the same export twice?",
        answer:
          "Duplicate detection compares titles and content on import and flags repeats, which matters for large workspaces that Notion splits into multiple ZIP parts.",
      },
      {
        question: "How long does a migration take?",
        answer:
          "A typical personal workspace takes about twenty minutes end to end. Very large workspaces are limited mainly by how long Notion takes to email the export.",
      },
    ],
    datePublished: "2026-08-03",
  },
  {
    slug: "build-a-knowledge-graph",
    shortTitle: "Building a knowledge graph",
    title: "How to Build a Personal Knowledge Graph in 2026",
    metaDescription:
      "A practical guide to building a personal knowledge graph: atomic notes, entities, link types, embeddings, and how to read clusters to find gaps in your thinking.",
    keywords:
      "personal knowledge graph, how to build a knowledge graph, knowledge graph notes, second brain knowledge graph, linked notes graph view",
    h1: "How to build a personal knowledge graph you actually use",
    answerSummary:
      "A personal knowledge graph is a set of atomic notes joined by meaningful links, where the structure carries information. Build it by writing one idea per note, linking with a stated reason, letting embeddings propose links you missed, and reading the resulting clusters to find themes and gaps.",
    intro:
      "Graph views are easy to generate and easy to ignore. A knowledge graph earns its keep only when the links mean something and when you use the clusters to make decisions about what to read, write, or drop.",
    howTo: {
      name: "Build a personal knowledge graph",
      description:
        "Five steps from scattered notes to a graph that surfaces themes and gaps.",
      totalTime: "PT30M",
      steps: [
        {
          name: "Start with atomic notes",
          text: "Split multi-idea notes so each node in the graph represents exactly one claim, concept, or observation.",
        },
        {
          name: "Name your entities consistently",
          text: "Pick one canonical name per person, concept, and project. Consistent naming is what turns a pile of notes into a graph rather than a spelling exercise.",
        },
        {
          name: "Give links a reason",
          text: "Write a sentence next to each link explaining the relationship: supports, contradicts, extends, or is an example of. Typed links are what make the graph readable later.",
        },
        {
          name: "Add automatic similarity links",
          text: "Embed every note and let similarity propose connections you would not have remembered, then accept or reject them. Manual edits should always win over automation.",
        },
        {
          name: "Read the clusters",
          text: "Dense clusters are your real areas of expertise and likely next writing projects. Isolated nodes are either the seed of a new area or noise you can archive.",
        },
      ],
    },
    sections: [
      {
        heading: "Nodes, edges, and why hubs matter",
        body: [
          "Nodes are notes and entities; edges are the relationships between them. Hub notes with many connections act as entry points, so keep a handful of topic hubs and link new notes into them as you write.",
          "A hub-and-spoke layout by category makes a large graph legible: you see which categories are load-bearing and which are decorative.",
        ],
      },
      {
        heading: "Using the graph to decide what to do next",
        body: [
          "Look for clusters that are dense but have no output yet — those are articles waiting to be written. Look for clusters with a hole in the middle, where several notes reference a concept that has no note of its own; that is your next reading task.",
          "Gap analysis can be automated: compare the concepts referenced across a cluster against the concepts that have their own notes, and read the difference.",
        ],
      },
      {
        heading: "Keeping it alive",
        body: [
          "A graph decays when capture outpaces connection. Cap yourself: every capture session ends with at least one new deliberate link.",
          "Automation covers the rest. In Baku Scribe, cards are categorized on capture, similarity linking runs continuously, and contextual backlinks show the surrounding sentence for every reference so you can judge a link without opening the note.",
        ],
      },
    ],
    faqs: [
      {
        question: "What is a personal knowledge graph?",
        answer:
          "It is your notes modeled as nodes with meaningful relationships as edges, so that structure itself carries information about how your ideas relate.",
      },
      {
        question: "Is a graph view the same as a knowledge graph?",
        answer:
          "No. A graph view is a visualization. A knowledge graph requires consistent entities and meaningful link types, which is what makes clusters and gaps interpretable.",
      },
      {
        question: "Do I have to link everything manually?",
        answer:
          "No. Embedding-based similarity can propose most connections. Keep manual control over the links that carry an argument, since those are the ones you will reuse in writing.",
      },
      {
        question: "How do I find gaps in my knowledge?",
        answer:
          "Compare the concepts your notes reference against the concepts that have their own notes. Referenced but undocumented concepts are your reading list, which is exactly what the Knowledge Gap Analyzer automates.",
      },
    ],
    datePublished: "2026-08-03",
  },
];
