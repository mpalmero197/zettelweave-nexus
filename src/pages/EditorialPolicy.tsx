import { useEffect } from "react";

const useSEO = (title: string, description: string, canonical: string) => {
  useEffect(() => {
    document.title = title;
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    setMeta("description", description);
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) { link = document.createElement("link"); link.setAttribute("rel", "canonical"); document.head.appendChild(link); }
    link.setAttribute("href", canonical);
  }, [title, description, canonical]);
};

const EditorialPolicy = () => {
  useSEO(
    "How we write — Editorial standards at Baku Scribe",
    "What you can expect from anything we publish: how we research, who reviews it, and how we handle mistakes.",
    "https://bakuscribe.com/editorial-policy"
  );
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-16 max-w-3xl mx-auto">
      <h1 className="text-4xl font-serif mb-6">How we write</h1>
      <p className="mb-6 text-lg">
        Anything we publish on Baku Scribe — product pages, guides, comparisons,
        changelog entries — follows the same standards. Here's what you can
        expect, and what to do if you think we got something wrong.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">What we promise</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>A real person reviews every page before it goes live.</li>
        <li>When we make a claim about a product, a feature, or a competitor, we link to a source you can check yourself.</li>
        <li>If something material changes, we update the page and show when it was last updated.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Who wrote it</h2>
      <p className="mb-4">
        Every article carries a byline, and authors link to their own profiles
        where you can see their background. We don't publish anonymous opinion
        pieces.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">When we get it wrong</h2>
      <p className="mb-4">
        We will. When you spot it, email us at{" "}
        <a className="underline" href="mailto:editorial@bakuscribe.com">editorial@bakuscribe.com</a>{" "}
        and we'll correct the article within 48 hours. Corrected pages keep a
        visible note so you know what changed.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Money &amp; conflicts</h2>
      <p className="mb-4">
        If a post is sponsored, an affiliate link, or covers a product we were
        gifted, we say so at the top. No exceptions.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Our use of AI</h2>
      <p className="mb-4">
        We sometimes use AI to draft, summarize, or research. Every AI-assisted
        page is reviewed and edited by a human before publication, and the human
        editor is accountable for what's published.
      </p>
    </main>
  );
};

export default EditorialPolicy;
