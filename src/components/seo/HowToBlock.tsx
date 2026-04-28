import { SchemaInjector, buildHowToSchema } from "./SchemaInjector";

export interface HowToStep {
  name: string;
  text: string;
  image?: string;
}

interface HowToBlockProps {
  name: string;
  description: string;
  steps: HowToStep[];
  totalTime?: string; // ISO 8601 duration e.g. "PT5M"
  injectSchema?: boolean;
}

export function HowToBlock({ name, description, steps, totalTime, injectSchema = true }: HowToBlockProps) {
  return (
    <section
      className="my-8"
      itemScope
      itemType="https://schema.org/HowTo"
      data-aeo="howto"
    >
      {injectSchema && (
        <SchemaInjector
          id="howto-schema"
          schema={buildHowToSchema({ name, description, steps, totalTime })}
        />
      )}
      <h2 className="text-2xl font-semibold tracking-tight text-foreground mb-2" itemProp="name">
        {name}
      </h2>
      <p className="text-muted-foreground mb-6" itemProp="description">{description}</p>
      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li
            key={i}
            className="flex gap-4 rounded-lg border border-border bg-card/50 p-4"
            itemScope
            itemProp="step"
            itemType="https://schema.org/HowToStep"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
              {i + 1}
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold text-foreground" itemProp="name">{step.name}</h3>
              <p className="text-foreground/90 leading-relaxed" itemProp="text">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
