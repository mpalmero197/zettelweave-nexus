import { ReactNode } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SchemaInjector, buildFAQSchema } from "./SchemaInjector";

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQBlockProps {
  items: FAQItem[];
  heading?: string;
  /** Set false if FAQ schema is already injected on this page. */
  injectSchema?: boolean;
  children?: ReactNode;
}

/** FAQ section that renders as an accordion AND auto-injects FAQPage JSON-LD. */
export function FAQBlock({ items, heading = "Frequently asked questions", injectSchema = true }: FAQBlockProps) {
  return (
    <section className="my-8" data-aeo="faq">
      {injectSchema && <SchemaInjector schema={buildFAQSchema(items)} id="faq-schema" />}
      <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-4">{heading}</h2>
      <Accordion type="single" collapsible className="w-full">
        {items.map((item, i) => (
          <AccordionItem
            key={i}
            value={`faq-${i}`}
            itemScope
            itemProp="mainEntity"
            itemType="https://schema.org/Question"
          >
            <AccordionTrigger>
              <span itemProp="name" className="text-left">{item.question}</span>
            </AccordionTrigger>
            <AccordionContent
              itemScope
              itemProp="acceptedAnswer"
              itemType="https://schema.org/Answer"
            >
              <span itemProp="text" className="text-foreground/90 leading-relaxed">
                {item.answer}
              </span>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
