import { useEffect } from "react";
import { Link } from "react-router-dom";

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

const About = () => {
  useSEO(
    "About PendragonX — Team, Mission & Trust",
    "About PendragonX: who we are, our mission to give writers and thinkers an AI second brain, and how we operate. Editorial standards and verifiable trust signals.",
    "https://pendragonx.com/about"
  );
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-16 max-w-3xl mx-auto">
      <h1 className="text-4xl font-serif mb-6">About PendragonX</h1>
      <p className="mb-4">PendragonX is an AI-powered second brain built by Halcyon Systems Group for writers, researchers, and lifelong learners. We believe knowledge tools should think <em>with</em> you — automatically connecting every idea in a living 3D graph instead of leaving you to manage folders and tags.</p>
      <p className="mb-4">The platform was founded in 2025 and is operated by a small, independent team. We are bootstrapped, take no venture capital, and never sell user data.</p>
      <h2 className="text-2xl font-semibold mt-10 mb-3">Mission</h2>
      <p className="mb-4">Make personal knowledge management effortless by combining Zettelkasten principles, end-to-end encryption, and modern AI — so your notes work as hard as you do.</p>
      <h2 className="text-2xl font-semibold mt-10 mb-3">Editorial standards</h2>
      <p className="mb-4">All product pages and articles follow our <Link className="underline" to="/editorial-policy">editorial policy</Link>. Material changes are reviewed by a named human editor before publication.</p>
      <h2 className="text-2xl font-semibold mt-10 mb-3">Contact</h2>
      <p>See our <Link className="underline" to="/contact">contact page</Link> for support, press, and security disclosures.</p>
    </main>
  );
};

export default About;
