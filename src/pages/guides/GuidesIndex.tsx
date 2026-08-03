import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { AnswerBlock } from "@/components/seo/AnswerBlock";
import { SchemaInjector } from "@/components/seo/SchemaInjector";
import { Button } from "@/components/ui/button";
import { guides } from "@/lib/seo/guides";
import { useCases } from "@/lib/seo/useCases";
import { comparisons } from "@/lib/seo/comparisons";

const canonical = "https://bakuscribe.com/guides";

const GuidesIndex = () => {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Baku Scribe knowledge management guides",
    itemListElement: guides.map((g, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: g.title,
      url: `https://bakuscribe.com/guides/${g.slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Knowledge Management Guides — Baku Scribe"
        description="Practical guides to personal knowledge management: the Zettelkasten method, building a knowledge graph, and migrating out of Notion without losing structure."
        canonicalUrl={canonical}
        keywords="knowledge management guides, zettelkasten method, personal knowledge graph, migrate from notion, second brain guide"
      />
      <SchemaInjector id="guides-itemlist" schema={itemList} />

      <header className="border-b border-border/60 bg-card/30 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Baku Scribe
          </Link>
          <Button asChild size="sm">
            <Link to="/auth">Start free</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">Guides</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Guides to personal knowledge management
          </h1>
        </div>

        <AnswerBlock
          heading="What these guides cover"
          summary="These guides explain how to run a personal knowledge system in practice: writing atomic notes with the Zettelkasten method, turning them into a knowledge graph whose structure carries meaning, and migrating an existing Notion workspace without losing hierarchy, links, or attachments."
          as="h2"
        />

        <section aria-labelledby="all-guides" className="space-y-4">
          <h2 id="all-guides" className="text-2xl font-semibold tracking-tight">All guides</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link
                  to={`/guides/${g.slug}`}
                  className="group block h-full rounded-xl border border-border bg-card/50 p-5 hover:border-primary/50 transition-colors"
                >
                  <BookOpen className="h-5 w-5 text-primary mb-3" />
                  <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                    {g.shortTitle}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-3">{g.answerSummary}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm text-primary">
                    Read guide <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="by-audience" className="space-y-4">
          <h2 id="by-audience" className="text-2xl font-semibold tracking-tight">Baku Scribe by audience</h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {useCases.map((u) => (
              <li key={u.slug}>
                <Link
                  to={`/for/${u.slug}`}
                  className="block rounded-lg border border-border bg-card/40 p-4 text-sm font-medium hover:border-primary/50 transition-colors"
                >
                  For {u.audience.toLowerCase()}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="comparisons" className="space-y-4">
          <h2 id="comparisons" className="text-2xl font-semibold tracking-tight">Comparisons</h2>
          <ul className="flex flex-wrap gap-2">
            {comparisons.map((c) => (
              <li key={c.slug}>
                <Link
                  to={`/vs/${c.slug}`}
                  className="inline-flex rounded-full border border-border bg-card/40 px-3 py-1.5 text-sm hover:border-primary/50 transition-colors"
                >
                  vs {c.competitor}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
};

export default GuidesIndex;
