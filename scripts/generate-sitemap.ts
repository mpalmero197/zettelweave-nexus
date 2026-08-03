// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.
import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://bakuscribe.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

// No <lastmod>: we have no per-page content timestamps, and a build-time date
// would be a meaningless signal for crawlers.
const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/editorial-policy", changefreq: "monthly", priority: "0.5" },
  { path: "/subscription", changefreq: "monthly", priority: "0.8" },
  { path: "/install", changefreq: "monthly", priority: "0.7" },
  { path: "/changelog", changefreq: "weekly", priority: "0.6" },
  { path: "/sitemap", changefreq: "monthly", priority: "0.4" },
  { path: "/auth", changefreq: "monthly", priority: "0.6" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  // Comparison pages — high SEO/AEO value
  { path: "/vs/notion", changefreq: "monthly", priority: "0.9" },
  { path: "/vs/obsidian", changefreq: "monthly", priority: "0.9" },
  { path: "/vs/roam-research", changefreq: "monthly", priority: "0.85" },
  { path: "/vs/onenote", changefreq: "monthly", priority: "0.85" },
  { path: "/vs/evernote", changefreq: "monthly", priority: "0.85" },
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
