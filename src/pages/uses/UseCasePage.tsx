import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { AnswerBlock } from "@/components/seo/AnswerBlock";
import { FAQBlock } from "@/components/seo/FAQBlock";
import { HowToBlock } from "@/components/seo/HowToBlock";
import { TopicalCluster } from "@/components/seo/TopicalCluster";
import { SchemaInjector, buildSoftwareApplicationSchema } from "@/components/seo/SchemaInjector";
import { Button } from "@/components/ui/button";
import { useCases } from "@/lib/seo/useCases";
import { guides } from "@/lib/seo/guides";

const UseCasePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const spec = useCases.find((u) => u.slug === slug);

  if (!spec) return <Navigate to="/" replace />;

  const canonical = `https://bakuscribe.com/for/${spec.slug}`;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://bakuscribe.com/" },
      { "@type": "ListItem", position: 2, name: spec.audience, item: canonical },
    ],
  };

  const productSchema = buildSoftwareApplicationSchema({
    name: "Baku Scribe",
    description: spec.answerSummary,
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Web, iOS, Android",
    url: canonical,
    price: "0",
    priceCurrency: "USD",
  });

  const related = [
    ...useCases
      .filter((u) => u.slug !== spec.slug)
      .map((u) => ({
        title: `Baku Scribe for ${u.audience.toLowerCase()}`,
        href: `/for/${u.slug}`,
        description: u.answerSummary.slice(0, 110) + "…",
      })),
    ...guides.map((g) => ({
      title: g.shortTitle,
      href: `/guides/${g.slug}`,
      description: g.answerSummary.slice(0, 110) + "…",
    })),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title={spec.title}
        description={spec.metaDescription}
        canonicalUrl={canonical}
        keywords={spec.keywords}
      />
      <SchemaInjector id="uc-breadcrumb" schema={breadcrumb} />
      <SchemaInjector id="uc-product" schema={productSchema} />

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
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            For {spec.audience.toLowerCase()}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{spec.h1}</h1>
        </div>

        <AnswerBlock heading="Short answer" summary={spec.answerSummary} as="h2">
          <p className="mt-2 text-foreground/90">{spec.problem}</p>
        </AnswerBlock>

        <HowToBlock
          name={`The ${spec.audience.toLowerCase()}' workflow in Baku Scribe`}
          description={`How ${spec.audience.toLowerCase()} move from capture to finished output inside Baku Scribe.`}
          steps={spec.workflow}
        />

        <section className="rounded-xl border border-primary/40 bg-primary/5 p-5">
          <h2 className="text-lg font-semibold mb-3">What you get</h2>
          <ul className="space-y-2 text-sm">
            {spec.benefits.map((b) => (
              <li key={b} className="flex gap-2">
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>

        <FAQBlock heading={`Baku Scribe for ${spec.audience.toLowerCase()}: FAQ`} items={spec.faqs} />

        <section className="rounded-xl border border-primary/50 bg-gradient-to-br from-primary/10 to-transparent p-6 text-center space-y-3">
          <h2 className="text-2xl font-semibold">Start your second brain free</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            No credit card required. Free forever tier, and a 7-day Premium trial when you upgrade.
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

        <TopicalCluster pillarTitle="Baku Scribe guides" pillarHref="/guides" topics={related} />
      </main>
    </div>
  );
};

export default UseCasePage;
