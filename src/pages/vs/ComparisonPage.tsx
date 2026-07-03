import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, Check, X } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { AnswerBlock } from "@/components/seo/AnswerBlock";
import { FAQBlock } from "@/components/seo/FAQBlock";
import { ScannableTable } from "@/components/seo/ScannableList";
import { TopicalCluster } from "@/components/seo/TopicalCluster";
import { SchemaInjector, buildSoftwareApplicationSchema } from "@/components/seo/SchemaInjector";
import { Button } from "@/components/ui/button";
import { comparisons } from "@/lib/seo/comparisons";

const ComparisonPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const spec = comparisons.find((c) => c.slug === slug);

  if (!spec) return <Navigate to="/" replace />;

  const canonical = `https://pendragonx.com/vs/${spec.slug}`;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://pendragonx.com/" },
      { "@type": "ListItem", position: 2, name: "Compare", item: "https://pendragonx.com/vs" },
      { "@type": "ListItem", position: 3, name: `vs ${spec.competitor}`, item: canonical },
    ],
  };

  const productSchema = buildSoftwareApplicationSchema({
    name: "Baku Scribe",
    description: spec.answerSummary,
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web, iOS, Android",
    url: canonical,
    price: "4.99",
    priceCurrency: "USD",
    ratingValue: 4.9,
    ratingCount: 10000,
  });

  const otherComparisons = comparisons
    .filter((c) => c.slug !== spec.slug)
    .map((c) => ({
      title: `Baku Scribe vs ${c.competitor}`,
      href: `/vs/${c.slug}`,
      description: c.answerSummary.slice(0, 110) + "…",
    }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title={spec.title}
        description={spec.metaDescription}
        canonicalUrl={canonical}
        keywords={`Baku Scribe vs ${spec.competitor}, ${spec.competitor} alternative, best ${spec.competitor} alternative, AI second brain, knowledge management software, Notion alternative, Obsidian alternative`}
      />
      <SchemaInjector id="cmp-breadcrumb" schema={breadcrumb} />
      <SchemaInjector id="cmp-product" schema={productSchema} />

      <header className="border-b border-border/60 bg-card/30 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Baku Scribe
          </Link>
          <Button asChild size="sm">
            <Link to="/auth">Try Baku Scribe free</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            Comparison · Updated 2026
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{spec.h1}</h1>
        </div>

        <AnswerBlock
          heading="Short answer"
          summary={spec.answerSummary}
          as="h2"
        >
          <p className="mt-2 text-foreground/90">{spec.verdict}</p>
        </AnswerBlock>

        <section aria-labelledby="feature-table">
          <h2 id="feature-table" className="text-2xl font-semibold tracking-tight mb-3">
            Feature-by-feature comparison
          </h2>
          <ScannableTable
            caption={`How Baku Scribe compares to ${spec.competitor} across the capabilities knowledge workers use daily.`}
            headers={["Capability", "Baku Scribe", spec.competitor]}
            rows={spec.tableRows.map(([cap, us, them]) => [
              <span className="font-medium">{cap}</span>,
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <Check className="h-4 w-4 text-primary shrink-0" />
                {us}
              </span>,
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                {them.startsWith("No") || them.startsWith("Not") ? (
                  <X className="h-4 w-4 text-destructive shrink-0" />
                ) : (
                  <Check className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                {them}
              </span>,
            ])}
          />
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-5">
            <h2 className="text-lg font-semibold mb-3">Where Baku Scribe wins</h2>
            <ul className="space-y-2 text-sm">
              {spec.strengths.pendragonx.map((s) => (
                <li key={s} className="flex gap-2">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card/60 p-5">
            <h2 className="text-lg font-semibold mb-3">Where {spec.competitor} still wins</h2>
            <ul className="space-y-2 text-sm">
              {spec.strengths.competitor.map((s) => (
                <li key={s} className="flex gap-2 text-muted-foreground">
                  <Check className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <FAQBlock heading={`Baku Scribe vs ${spec.competitor}: FAQ`} items={spec.faqs} />

        <section className="rounded-xl border border-primary/50 bg-gradient-to-br from-primary/10 to-transparent p-6 text-center space-y-3">
          <h2 className="text-2xl font-semibold">Try Baku Scribe free — import your {spec.competitor} data in one click</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            No credit card required. Free forever tier. 7-day Premium trial when you upgrade.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link to="/auth">Start free</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/subscription">See pricing</Link>
            </Button>
          </div>
        </section>

        <TopicalCluster
          pillarTitle="Baku Scribe comparisons"
          pillarHref="/"
          topics={otherComparisons}
        />
      </main>
    </div>
  );
};

export default ComparisonPage;
