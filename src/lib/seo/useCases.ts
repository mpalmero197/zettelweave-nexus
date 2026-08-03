import type { FAQItem } from "@/components/seo/FAQBlock";

export interface UseCaseSpec {
  slug: string;
  audience: string;
  title: string;
  metaDescription: string;
  keywords: string;
  h1: string;
  answerSummary: string;
  problem: string;
  workflow: { name: string; text: string }[];
  benefits: string[];
  faqs: FAQItem[];
}

export const useCases: UseCaseSpec[] = [
  {
    slug: "writers",
    audience: "Writers",
    title: "Second Brain for Writers — Baku Scribe",
    metaDescription:
      "A second brain built for writers: capture research, auto-link every idea, and draft in Catalyst with AI grounded in your own notes. Free tier, $4.99/mo Premium.",
    keywords:
      "second brain for writers, note taking app for writers, research app for authors, novel research organizer, AI writing assistant for authors, Zettelkasten for writers",
    h1: "A second brain for writers who research more than they draft",
    answerSummary:
      "Baku Scribe is a second brain designed around the writer's workflow: clip research from anywhere, let AI auto-link every note into a living knowledge graph, then draft in the Catalyst editor with an assistant that can only cite your own material. Nothing gets lost between the idea and the draft.",
    problem:
      "Writers lose hours re-finding a quote, a source, or the note that made a chapter click. Folder trees do not match how ideas actually relate, and generic AI writing tools invent facts because they have never read your research.",
    workflow: [
      {
        name: "Capture without breaking flow",
        text: "Clip articles, PDFs, YouTube transcripts, and highlights with the Toolbox extension, or dictate a note. Each capture becomes an atomic card, categorized automatically.",
      },
      {
        name: "Let connections form themselves",
        text: "Baku Scribe embeds every card and links related ones automatically, so the themes across a hundred notes surface in the knowledge graph instead of staying in your head.",
      },
      {
        name: "Outline visually",
        text: "Pull cards onto a Canvas or Mind Map to arrange chapters and beats spatially, then convert the arrangement into a document outline.",
      },
      {
        name: "Draft in Catalyst with grounded AI",
        text: "Write long-form in Catalyst with images, citations, and document themes. ALICE answers from your own cards and cites them, so drafts stay factual.",
      },
      {
        name: "Export where your editor lives",
        text: "Export to DOCX, PDF, or Markdown with your theme applied, and keep the research trail linked behind every claim.",
      },
    ],
    benefits: [
      "Research, notes, and drafts live in one linked system",
      "AI that cites your own sources instead of inventing them",
      "Visual outlining with Canvas and Mind Map studios",
      "One-click import from Obsidian, Notion, Roam, and Evernote",
      "Optional end-to-end encryption for unpublished manuscripts",
    ],
    faqs: [
      {
        question: "What is the best note-taking app for writers?",
        answer:
          "Writers need capture, connection, and drafting in one place. Baku Scribe combines atomic note cards, automatic AI linking, visual outlining, and the Catalyst long-form editor, so research flows directly into the manuscript.",
      },
      {
        question: "Will the AI make things up about my research?",
        answer:
          "ALICE answers are grounded in your own cards and documents and cite the specific sources they used, which keeps drafting accurate. You can always open the cited card to verify.",
      },
      {
        question: "Can I keep an unpublished manuscript private?",
        answer:
          "Yes. Any item can be encrypted client-side with zero-knowledge keys, so the content cannot be read server-side.",
      },
      {
        question: "Does it replace my word processor?",
        answer:
          "Catalyst handles long-form drafting with chapters, images, and citations, and exports to DOCX, PDF, or Markdown if your editor or publisher needs a specific format.",
      },
    ],
  },
  {
    slug: "researchers",
    audience: "Researchers",
    title: "Zettelkasten for Researchers — Baku Scribe",
    metaDescription:
      "Run a real Zettelkasten without the manual overhead: atomic cards, automatic linking, citation tools, and AI that answers only from your own literature. Free to start.",
    keywords:
      "zettelkasten for researchers, literature review software, academic note taking app, research knowledge management, slip box app, PhD note taking system",
    h1: "A Zettelkasten for researchers, without the manual upkeep",
    answerSummary:
      "Baku Scribe runs the slip-box method for you. Every literature note becomes an atomic card, embeddings link related cards automatically, and the knowledge graph exposes clusters and gaps across your reading. AI chat answers strictly from your own literature with citations, which makes synthesis and literature reviews far faster.",
    problem:
      "Traditional Zettelkasten works, but the linking overhead is brutal at scale. Reference managers store PDFs without ideas, and generic AI tools cannot cite the papers actually on your desk.",
    workflow: [
      {
        name: "Import your reading",
        text: "Bring in PDFs, Markdown notes, Obsidian vaults, and web sources. Each becomes atomic cards with automatic Dewey-style categorization.",
      },
      {
        name: "Write literature notes as atomic cards",
        text: "One idea per card, in your own words, with the source attached. Wikilinks and contextual backlinks show the surrounding sentence for every reference.",
      },
      {
        name: "Let the slip box self-organize",
        text: "Embedding-based auto-linking connects related cards every 30 minutes and locks links you have edited manually, so your curation is never overwritten.",
      },
      {
        name: "Find gaps before review",
        text: "The Knowledge Gap Analyzer identifies missing concepts across a topic cluster and proposes a structured reading path.",
      },
      {
        name: "Synthesize with citations",
        text: "Ask ALICE a research question and get an answer built only from your own cards, each claim linked back to the source card.",
      },
    ],
    benefits: [
      "Atomic cards with automatic, reversible AI linking",
      "Knowledge graph clusters that reveal themes and gaps",
      "Citation generation and contextual backlink snippets",
      "Master documents that synthesize a whole subject cluster",
      "Offline mode for fieldwork and archives",
    ],
    faqs: [
      {
        question: "Can software really run a Zettelkasten properly?",
        answer:
          "The method needs atomic notes, unique identity, and dense linking. Baku Scribe enforces atomic cards and adds embedding-based linking so density grows without hours of manual cross-referencing.",
      },
      {
        question: "Is it useful for a literature review?",
        answer:
          "Yes. Cluster your literature notes in the knowledge graph, run the Knowledge Gap Analyzer to find under-covered concepts, then generate a master document that synthesizes the cluster with citations.",
      },
      {
        question: "Does the AI ever answer from outside my notes?",
        answer:
          "Knowledge chat is grounded in your own content and cites the cards it used. Web search is a separate, explicit action so external material never silently enters your synthesis.",
      },
      {
        question: "Can I export my slip box?",
        answer:
          "Yes. Export cards and documents as Markdown, PDF, or a full data export, so your research is never locked in.",
      },
    ],
  },
  {
    slug: "students",
    audience: "Students",
    title: "Study Notes App with AI — Baku Scribe for Students",
    metaDescription:
      "Turn lectures, readings, and videos into connected study notes. AI study guides, mock exams from your own material, mind maps, and a free forever tier for students.",
    keywords:
      "study notes app, note taking app for students, AI study guide generator, lecture notes organizer, exam prep app, mind map study tool",
    h1: "Study notes that connect themselves — and quiz you back",
    answerSummary:
      "Baku Scribe turns lectures, readings, and videos into atomic notes that link themselves into a knowledge graph. From any cluster you can generate study guides, mind maps, and mock exams whose answers are verified against your own material, so revision starts from what you actually studied.",
    problem:
      "Notes pile up per course and per week, disconnected from each other. When exams arrive, you reread instead of recalling, and generic quiz apps test material you were never assigned.",
    workflow: [
      {
        name: "Capture every source",
        text: "Type notes in lectures, clip readings with the Toolbox extension, or drop a YouTube lecture into Watch & Ask to get a timestamped transcript and summary.",
      },
      {
        name: "Let topics assemble",
        text: "Cards are categorized and auto-linked, so a topic that spans three weeks of lectures shows up as one cluster in the knowledge graph.",
      },
      {
        name: "Generate study guides",
        text: "Turn a cluster or mind map into a structured Markdown study guide with concept maps and question-and-answer pairs.",
      },
      {
        name: "Test yourself with real material",
        text: "Generate mock exams whose answers are checked against specific citations in your notes, with plausible distractors instead of throwaway options.",
      },
      {
        name: "Stay on schedule",
        text: "Tasks, habits, and the unified calendar track assignments, and ALICE sends push reminders even when the app is closed.",
      },
    ],
    benefits: [
      "Free forever tier with no credit card",
      "AI study guides and mock exams from your own notes",
      "YouTube lecture transcripts, summaries, and timestamped chapters",
      "Mind maps and Canvas for visual revision",
      "Offline mode for campus dead zones",
    ],
    faqs: [
      {
        question: "Is Baku Scribe free for students?",
        answer:
          "Yes. The free forever tier includes note-taking, notebooks, unlimited notebooks, and the plugin suite with a 50-card limit. Premium unlocks unlimited cards and AI features for $4.99 per month.",
      },
      {
        question: "Can it make a study guide from my lecture notes?",
        answer:
          "Yes. Select a notebook, cluster, or mind map and generate a structured study guide with key concepts, summaries, and question-and-answer pairs drawn from your own notes.",
      },
      {
        question: "How do the practice exams work?",
        answer:
          "Mock exams are generated from your material, and every answer is verified against a specific citation in your notes so the correct option is defensible.",
      },
      {
        question: "Can I use it with YouTube lectures?",
        answer:
          "Yes. Paste a video URL into Watch & Ask to get the transcript, description, chapter outline, summary, and study notes while you watch.",
      },
    ],
  },
];
