import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { AnswerBlock } from "@/components/seo/AnswerBlock";
import { FAQBlock } from "@/components/seo/FAQBlock";
import { HowToBlock } from "@/components/seo/HowToBlock";
import { LastUpdated } from "@/components/seo/LastUpdated";
import { TopicalCluster } from "@/components/seo/TopicalCluster";
import { SchemaInjector, buildArticleSchema } from "@/components/seo/SchemaInjector";
import { Button } from "@/components/ui/button";
import { guides } from "@/lib/seo/guides";
import { useCases } from "@/lib/seo/useCases";

const GuidePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const spec = guides.find((g) => g.slug === slug);

  if (!spec) return <Navigate to="/guides" replace />;

  const canonical = `https://bakuscribe.com/guides/${spec.slug}`;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://bakuscribe.com/" },
      { "@type": "ListItem", position: 2, name: "Guides", item: "https://bakuscribe.com/guides" },
      { "@type": "ListItem", position: 3, name: spec.shortTitle, item: canonical },
    ],
  };

  const article = buildArticleSchema({
    headline: spec.h1,
    description: spec.metaDescription,
    datePublished: spec.datePublished,
    author: "Halcyon Systems Group",
    url: canonical,
  });

  const related = [
    ...guides
      .filter((g) => g.slug !== spec.slug)
      .map((g) => ({
        title: g.shortTitle,
        href: `/guides/${g.slug}`,
        description: g.answerSummary.slice(0, 110) + "…",
      })),
    ...useCases.map((u) => ({
      title: `Baku Scribe for ${u.audience.toLowerCase()}`,
      href: `/for/${u.slug}`,
      description: u.answerSummary.slice(0, 110) + "…",
    })),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title={spec.title}
        description={spec.metaDescription}
        canonicalUrl={canonical}
        keywords={spec.keywords}
        ogType="article"
      />
      <SchemaInjector id="guide-breadcrumb" schema={breadcrumb} />
      <SchemaInjector id="guide-article" schema={article} />

      <header className="border-b border-border/60 bg-card/30 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/guides" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> All guides
          </Link>
          <Button asChild size="sm">
            <Link to="/auth">Start free</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">Guide</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{spec.h1}</h1>
          <LastUpdated date={spec.datePublished} published={spec.datePublished} />
        </div>

        <AnswerBlock heading="Short answer" summary={spec.answerSummary} as="h2">
          <p className="mt-2 text-foreground/90">{spec.intro}</p>
        </AnswerBlock>

        <HowToBlock
          name={spec.howTo.name}
          description={spec.howTo.description}
          steps={spec.howTo.steps}
          totalTime={spec.howTo.totalTime}
        />

        {spec.sections.map((section) => (
          <section key={section.heading} className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight">{section.heading}</h2>
            {section.body.map((p, i) => (
              <p key={i} className="text-foreground/90 leading-relaxed">{p}</p>
            ))}
          </section>
        ))}

        <FAQBlock heading="Frequently asked questions" items={spec.faqs} />

        <section className="rounded-xl border border-primary/50 bg-gradient-to-br from-primary/10 to-transparent p-6 text-center space-y-3">
          <h2 className="text-2xl font-semibold">Put this into practice in Baku Scribe</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Atomic cards, automatic linking, and a living knowledge graph. Free forever tier, no credit card.
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link to="/auth">Start free</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/vs/notion">Compare with Notion</Link>
            </Button>
          </div>
        </section>

        <TopicalCluster pillarTitle="Baku Scribe guides" pillarHref="/guides" topics={related} />
      </main>
    </div>
  );
};

export default GuidePage;
