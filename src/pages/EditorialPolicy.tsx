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
    "Editorial Policy — PendragonX",
    "How PendragonX produces, reviews, and corrects published content. Authorship, sourcing, conflict of interest, and corrections standards.",
    "https://pendragonx.com/editorial-policy"
  );
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-16 max-w-3xl mx-auto">
      <h1 className="text-4xl font-serif mb-6">Editorial Policy</h1>
      <h2 className="text-2xl font-semibold mt-8 mb-3">Standards</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>All content is reviewed for accuracy by a named human editor before publication.</li>
        <li>Sources are cited inline using verifiable links.</li>
        <li>Material updates trigger a republish with a visible <code>dateModified</code>.</li>
      </ul>
      <h2 className="text-2xl font-semibold mt-8 mb-3">Authorship</h2>
      <p>Every article carries an author byline with a profile page and, where applicable, credentials. Author profiles link to verified <code>sameAs</code> targets (LinkedIn, ORCID, GitHub, Mastodon).</p>
      <h2 className="text-2xl font-semibold mt-8 mb-3">Corrections</h2>
      <p>Errors are corrected within 48 hours of being reported. Corrected articles include a "Correction" notice with the date.</p>
      <h2 className="text-2xl font-semibold mt-8 mb-3">Conflicts of interest</h2>
      <p>Sponsored, affiliate, and gifted content are clearly disclosed.</p>
      <h2 className="text-2xl font-semibold mt-8 mb-3">Contact</h2>
      <p>Editorial concerns: <a className="underline" href="mailto:editorial@pendragonx.com">editorial@pendragonx.com</a></p>
    </main>
  );
};

export default EditorialPolicy;
