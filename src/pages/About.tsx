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
    "About Baku Scribe",
    "Baku Scribe is an AI-powered second brain for writers, researchers, and lifelong learners. Learn what we build and why.",
    "https://pendragonx.com/about"
  );
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-16 max-w-3xl mx-auto">
      <h1 className="text-4xl font-serif mb-6">About Baku Scribe</h1>

      <p className="mb-4 text-lg">
        Baku Scribe is your AI-powered second brain — a single place to capture every
        idea, note, and source you care about, and watch them connect themselves into
        a living knowledge graph.
      </p>

      <p className="mb-4">
        We built Baku Scribe because the tools most of us use to think — folders,
        tabs, scattered docs — don't actually help us think. They just store stuff.
        Baku Scribe is designed to do the opposite: surface the connections you'd
        miss, resurface the notes you forgot, and let you talk to your own knowledge
        like a collaborator.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-3">Who it's for</h2>
      <p className="mb-4">
        Writers drafting their next book. Researchers untangling a hard problem.
        Students preparing for exams. Founders keeping a hundred threads alive at
        once. If you've ever felt like your best ideas are trapped in a folder you
        can't find, Baku Scribe is for you.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-3">What we believe</h2>
      <ul className="list-disc pl-6 space-y-2 mb-4">
        <li>Your notes should belong to you. We use end-to-end encryption and never sell your data.</li>
        <li>Software should work offline. Your thinking shouldn't depend on a connection.</li>
        <li>AI should help you think, not think for you.</li>
        <li>Pricing should be honest. There's a real free tier and a simple paid plan.</li>
      </ul>

      <h2 className="text-2xl font-semibold mt-10 mb-3">Who's behind it</h2>
      <p className="mb-4">
        Baku Scribe is built by Halcyon Systems Group — a small, independent,
        bootstrapped team. No venture capital, no ads, no data brokers.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-3">Get in touch</h2>
      <p>
        Questions, feedback, or just want to say hi? Visit our{" "}
        <Link className="underline" to="/contact">contact page</Link>.
      </p>
    </main>
  );
};

export default About;
