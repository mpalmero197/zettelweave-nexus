/**
 * AEO/SEO component library — answer-first, schema-rich, semantically strict
 * building blocks designed for both traditional crawlers and LLM citation.
 *
 * Usage:
 *   <AnswerBlock heading="What is PendragonX?" summary="...40-60 words...">
 *     ...long-form analysis...
 *   </AnswerBlock>
 *   <FAQBlock items={[...]} />  // auto-injects FAQPage JSON-LD
 *   <HowToBlock name="..." steps={[...]} />  // auto-injects HowTo JSON-LD
 *   <CitationBlock source="..." author="...">...</CitationBlock>
 *   <LastUpdated date={record.updated_at} published={record.created_at} />
 *   <TopicalCluster pillarTitle="..." topics={[...]} />
 */
export { AnswerBlock } from "./AnswerBlock";
export { ConversationalHeading } from "./ConversationalHeading";
export { ScannableList, ScannableTable } from "./ScannableList";
export { CitationBlock } from "./CitationBlock";
export { FAQBlock, type FAQItem } from "./FAQBlock";
export { HowToBlock, type HowToStep } from "./HowToBlock";
export { LastUpdated } from "./LastUpdated";
export { TopicalCluster, type ClusterTopic } from "./TopicalCluster";
export {
  SchemaInjector,
  buildFAQSchema,
  buildHowToSchema,
  buildArticleSchema,
  buildSoftwareApplicationSchema,
  detectAndBuildSchema,
} from "./SchemaInjector";
