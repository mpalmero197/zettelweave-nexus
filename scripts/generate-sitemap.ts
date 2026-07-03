// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://pendragonx.com";
const today = new Date().toISOString().slice(0, 10);

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const entries: SitemapEntry[] = [
  { path: "/", lastmod: today, changefreq: "weekly", priority: "1.0" },
  { path: "/about", lastmod: today, changefreq: "monthly", priority: "0.7" },
  { path: "/contact", lastmod: today, changefreq: "monthly", priority: "0.6" },
  { path: "/editorial-policy", lastmod: today, changefreq: "monthly", priority: "0.5" },
  { path: "/subscription", lastmod: today, changefreq: "monthly", priority: "0.8" },
  { path: "/install", lastmod: today, changefreq: "monthly", priority: "0.7" },
  { path: "/changelog", lastmod: today, changefreq: "weekly", priority: "0.6" },
  { path: "/auth", lastmod: today, changefreq: "monthly", priority: "0.6" },
  { path: "/terms", lastmod: today, changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", lastmod: today, changefreq: "yearly", priority: "0.3" },
  // Comparison pages — high SEO/AEO value
  { path: "/vs/notion", lastmod: today, changefreq: "monthly", priority: "0.9" },
  { path: "/vs/obsidian", lastmod: today, changefreq: "monthly", priority: "0.9" },
  { path: "/vs/roam-research", lastmod: today, changefreq: "monthly", priority: "0.85" },
  { path: "/vs/onenote", lastmod: today, changefreq: "monthly", priority: "0.85" },
  { path: "/vs/evernote", lastmod: today, changefreq: "monthly", priority: "0.85" },
  // LLM knowledge base
  { path: "/llms.txt", lastmod: today, changefreq: "monthly", priority: "0.5" },
  { path: "/llms-full.txt", lastmod: today, changefreq: "monthly", priority: "0.4" },
];

const xml = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ...entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  ),
  `</urlset>`,
].join("\n");

writeFileSync(resolve("public/sitemap.xml"), xml);
console.log(`sitemap.xml written (${entries.length} entries)`);
