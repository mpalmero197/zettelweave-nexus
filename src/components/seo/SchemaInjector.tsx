import { useEffect } from "react";
import type { FAQItem } from "./FAQBlock";
import type { HowToStep } from "./HowToBlock";

interface SchemaInjectorProps {
  schema: object | object[];
  /** Unique id so multiple injectors don't collide. */
  id: string;
}

/**
 * Dynamic JSON-LD injector. Mounts a <script type="application/ld+json"> tag
 * into the document head and cleans it up on unmount. Multiple injectors can
 * coexist on the same page using unique ids.
 */
export function SchemaInjector({ schema, id }: SchemaInjectorProps) {
  useEffect(() => {
    const elementId = `ld-json-${id}`;
    let script = document.getElementById(elementId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = elementId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(Array.isArray(schema) ? schema : [schema]);
    return () => {
      script?.remove();
    };
  }, [schema, id]);
  return null;
}

// ─── Schema builders ──────────────────────────────────────────────────────

export const buildFAQSchema = (items: FAQItem[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
});

export const buildHowToSchema = (input: {
  name: string;
  description: string;
  steps: HowToStep[];
  totalTime?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: input.name,
  description: input.description,
  ...(input.totalTime ? { totalTime: input.totalTime } : {}),
  step: input.steps.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: s.name,
    text: s.text,
    ...(s.image ? { image: s.image } : {}),
  })),
});

export const buildArticleSchema = (article: {
  headline: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author: string;
  url?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: article.headline,
  description: article.description,
  ...(article.image ? { image: article.image } : {}),
  datePublished: article.datePublished,
  dateModified: article.dateModified ?? article.datePublished,
  author: { "@type": "Person", name: article.author },
  ...(article.url ? { mainEntityOfPage: article.url } : {}),
  publisher: {
    "@type": "Organization",
    name: "PendragonX",
    logo: {
      "@type": "ImageObject",
      url: "https://pendragonx.com/icon-512x512.png",
    },
  },
});

export const buildSoftwareApplicationSchema = (app: {
  name: string;
  description: string;
  applicationCategory?: string;
  operatingSystem?: string;
  url?: string;
  price?: string;
  priceCurrency?: string;
  ratingValue?: number;
  ratingCount?: number;
}) => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: app.name,
  description: app.description,
  applicationCategory: app.applicationCategory ?? "ProductivityApplication",
  operatingSystem: app.operatingSystem ?? "Web, iOS, Android",
  ...(app.url ? { url: app.url } : {}),
  offers: {
    "@type": "Offer",
    price: app.price ?? "0",
    priceCurrency: app.priceCurrency ?? "USD",
  },
  ...(app.ratingValue && app.ratingCount
    ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: app.ratingValue,
          ratingCount: app.ratingCount,
        },
      }
    : {}),
});

/**
 * Auto-detects content type from the rendered DOM and returns the appropriate
 * schema. Used by AutoSchema for zero-config injection.
 */
export function detectAndBuildSchema(): object[] {
  const schemas: object[] = [];
  if (typeof document === "undefined") return schemas;

  const faqs = document.querySelectorAll('[data-aeo="faq"] [itemtype$="/Question"]');
  if (faqs.length > 0) {
    const items: FAQItem[] = Array.from(faqs).map((q) => ({
      question: q.querySelector('[itemprop="name"]')?.textContent ?? "",
      answer: q.querySelector('[itemprop="text"]')?.textContent ?? "",
    }));
    schemas.push(buildFAQSchema(items));
  }
  return schemas;
}
