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
    "Contact PendragonX — Support, Press & Security",
    "Reach the PendragonX team. Email support, press inquiries, and responsible security disclosures with documented response times.",
    "https://pendragonx.com/contact"
  );
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-16 max-w-3xl mx-auto">
      <h1 className="text-4xl font-serif mb-6">Contact</h1>
      <p className="mb-6">A real, reachable contact page is one of the strongest E-E-A-T signals. Use the addresses below and we will reply within the documented response times.</p>
      <h2 className="text-2xl font-semibold mt-8 mb-3">General</h2>
      <ul className="space-y-2">
        <li><strong>Support:</strong> <a className="underline" href="mailto:support@pendragonx.com">support@pendragonx.com</a></li>
        <li><strong>Press:</strong> <a className="underline" href="mailto:press@pendragonx.com">press@pendragonx.com</a></li>
        <li><strong>Hello:</strong> <a className="underline" href="mailto:hello@pendragonx.com">hello@pendragonx.com</a></li>
      </ul>
      <h2 className="text-2xl font-semibold mt-8 mb-3">Response times</h2>
      <ul className="list-disc pl-6 space-y-1">
        <li>General inquiries: within 2 business days</li>
        <li>Press: within 1 business day</li>
        <li>Security disclosures: within 24 hours</li>
      </ul>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "PendragonX",
        url: "https://pendragonx.com/",
        contactPoint: [
          { "@type": "ContactPoint", contactType: "customer support", email: "support@pendragonx.com", availableLanguage: ["English"] },
          { "@type": "ContactPoint", contactType: "press", email: "press@pendragonx.com", availableLanguage: ["English"] }
        ]
      }) }} />
    </main>
  );
};

export default Contact;
