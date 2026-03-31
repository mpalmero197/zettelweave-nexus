import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  noIndex?: boolean;
  jsonLd?: object | object[];
}

const defaultTitle = 'PendragonX: AI Second Brain with 3D Knowledge Graph & Agents | vs Notion & Obsidian';
const defaultDescription = 'PendragonX is the AI-powered second brain that auto-connects every idea in a living 3D knowledge graph, lets you chat with your own notes, build agents, and visualize with Canvas/Mind Maps. Import from Notion or Obsidian instantly. End-to-end encrypted. The smarter alternative to Notion, Obsidian, and OneNote.';
const defaultImage = 'https://storage.googleapis.com/gpt-engineer-file-uploads/Y2B2K0ExlLhjZt1L59MceqNQLdp1/social-images/social-1758934637901-PendragonLogo-01.jpg';
const baseUrl = 'https://pendragonx.com';

// Page-specific Open Graph images for better social sharing
export const ogImages = {
  home: defaultImage,
  auth: `${baseUrl}/screenshots/zettelkasten-ui.jpg`,
  dashboard: `${baseUrl}/screenshots/zettelkasten-ui.jpg`,
  graph: `${baseUrl}/screenshots/graph-view.jpg`,
  whiteboard: `${baseUrl}/screenshots/whiteboard.jpg`,
  aiSearch: `${baseUrl}/screenshots/ai-search.jpg`,
  privacy: defaultImage,
  terms: defaultImage,
  subscription: defaultImage,
  install: defaultImage,
  settings: `${baseUrl}/screenshots/zettelkasten-ui.jpg`,
};

export const SEOHead = ({
  title = defaultTitle,
  description = defaultDescription,
  keywords,
  canonicalUrl,
  ogImage = defaultImage,
  ogType = 'website',
  noIndex = false,
  jsonLd
}: SEOHeadProps) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Helper to update or create meta tag
    const updateMeta = (name: string, content: string, property = false) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        if (property) {
          meta.setAttribute('property', name);
        } else {
          meta.setAttribute('name', name);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Helper to update or create link tag
    const updateLink = (rel: string, href: string) => {
      let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement;
      
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
    };

    // Update meta tags
    updateMeta('description', description);
    updateMeta('robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    
    if (keywords) {
      updateMeta('keywords', keywords);
    }

    // Open Graph
    updateMeta('og:title', title, true);
    updateMeta('og:description', description, true);
    updateMeta('og:type', ogType, true);
    updateMeta('og:image', ogImage, true);
    
    if (canonicalUrl) {
      updateMeta('og:url', canonicalUrl, true);
      updateLink('canonical', canonicalUrl);
    }

    // Twitter
    updateMeta('twitter:title', title);
    updateMeta('twitter:description', description);
    updateMeta('twitter:image', ogImage);

    // JSON-LD structured data
    if (jsonLd) {
      // Remove existing dynamic JSON-LD
      const existingScript = document.getElementById('dynamic-json-ld');
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement('script');
      script.id = 'dynamic-json-ld';
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd]);
      document.head.appendChild(script);

      return () => {
        script.remove();
      };
    }
  }, [title, description, keywords, canonicalUrl, ogImage, ogType, noIndex, jsonLd]);

  return null;
};

// Preset JSON-LD schemas for common use cases
export const createFAQSchema = (faqs: { question: string; answer: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
});

export const createBreadcrumbSchema = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": items.map((item, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": item.name,
    "item": item.url
  }))
});

export const createArticleSchema = (article: {
  headline: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": article.headline,
  "description": article.description,
  "image": article.image,
  "datePublished": article.datePublished,
  "dateModified": article.dateModified || article.datePublished,
  "author": {
    "@type": "Person",
    "name": article.author
  },
  "publisher": {
    "@type": "Organization",
    "name": "PendragonX",
    "logo": {
      "@type": "ImageObject",
      "url": `${baseUrl}/icon-512x512.png`
    }
  }
});

export const createHowToSchema = (howTo: {
  name: string;
  description: string;
  steps: { name: string; text: string }[];
}) => ({
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": howTo.name,
  "description": howTo.description,
  "step": howTo.steps.map((step, index) => ({
    "@type": "HowToStep",
    "position": index + 1,
    "name": step.name,
    "text": step.text
  }))
});

export default SEOHead;
