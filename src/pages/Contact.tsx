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

const Contact = () => {
  useSEO(
    "Contact PendragonX",
    "Get help, report a bug, request a feature, or reach out about press and security. We read every message.",
    "https://pendragonx.com/contact"
  );
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-16 max-w-3xl mx-auto">
      <h1 className="text-4xl font-serif mb-6">Get in touch</h1>
      <p className="mb-8 text-lg">
        We're a small team and we read every message. Pick the address that fits
        what you need — we'll get back to you as quickly as we can.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Need help with the app?</h2>
      <p className="mb-2">
        Email <a className="underline" href="mailto:support@pendragonx.com">support@pendragonx.com</a>{" "}
        for bug reports, account issues, billing questions, or anything that isn't
        working the way you expected. Including a screenshot helps us help you faster.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Have an idea or feedback?</h2>
      <p className="mb-2">
        We'd love to hear it. Send feature requests and product feedback to{" "}
        <a className="underline" href="mailto:hello@pendragonx.com">hello@pendragonx.com</a>.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Press &amp; partnerships</h2>
      <p className="mb-2">
        Writing about PendragonX or interested in partnering? Reach out to{" "}
        <a className="underline" href="mailto:press@pendragonx.com">press@pendragonx.com</a>.
      </p>

      <h2 className="text-2xl font-semibold mt-8 mb-3">Found a security issue?</h2>
      <p className="mb-2">
        Please report it privately to{" "}
        <a className="underline" href="mailto:security@pendragonx.com">security@pendragonx.com</a>{" "}
        before disclosing publicly. We treat security reports as the highest priority.
      </p>

      <h2 className="text-2xl font-semibold mt-10 mb-3">Typical response times</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>Support: within 2 business days</li>
        <li>Press: within 1 business day</li>
        <li>Security: within 24 hours</li>
      </ul>
    </main>
  );
};

export default Contact;
