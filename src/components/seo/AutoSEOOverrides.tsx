import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Pulls auto-applied SEO data from Supabase (managed by the SEO/AEO
 * self-improvement engine) and merges it into the document head:
 *   - seo_overrides → meta tags (title, description, keywords, og_image, canonical)
 *   - seo_jsonld    → extra <script type="application/ld+json"> blocks
 *
 * Mount once at the root (in AppLayout) — runs on every route change.
 * Failures are silent: this is purely additive.
 */

const matchRoute = (pattern: string, path: string) => {
  if (pattern === path || pattern === "*") return true;
  if (pattern.endsWith("/*")) return path.startsWith(pattern.slice(0, -2));
  if (pattern.startsWith("regex:")) {
    try { return new RegExp(pattern.slice(6)).test(path); } catch { return false; }
  }
  return false;
};

const setMeta = (name: string, content: string, property = false) => {
  const sel = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let el = document.querySelector(sel) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(property ? "property" : "name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

export const AutoSEOOverrides = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    let cancelled = false;
    const injectedIds: string[] = [];

    (async () => {
      try {
        const [{ data: overrides }, { data: jsonldRows }] = await Promise.all([
          supabase.from("seo_overrides").select("route_pattern,field,value").eq("active", true),
          supabase.from("seo_jsonld").select("id,route_pattern,schema_json").eq("active", true),
        ]);

        if (cancelled) return;

        // Apply overrides matching this route
        for (const o of overrides ?? []) {
          if (!matchRoute(o.route_pattern, pathname)) continue;
          switch (o.field) {
            case "title":
              document.title = o.value;
              setMeta("og:title", o.value, true);
              setMeta("twitter:title", o.value);
              break;
            case "description":
              setMeta("description", o.value);
              setMeta("og:description", o.value, true);
              setMeta("twitter:description", o.value);
              break;
            case "keywords":
              setMeta("keywords", o.value);
              break;
            case "og_image":
              setMeta("og:image", o.value, true);
              setMeta("twitter:image", o.value);
              break;
            case "canonical": {
              let l = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
              if (!l) {
                l = document.createElement("link");
                l.setAttribute("rel", "canonical");
                document.head.appendChild(l);
              }
              l.setAttribute("href", o.value);
              break;
            }
          }
        }

        // Inject JSON-LD blocks matching this route
        for (const j of jsonldRows ?? []) {
          if (!matchRoute(j.route_pattern, pathname)) continue;
          const id = `auto-jsonld-${j.id}`;
          let s = document.getElementById(id) as HTMLScriptElement | null;
          if (!s) {
            s = document.createElement("script");
            s.id = id;
            s.type = "application/ld+json";
            document.head.appendChild(s);
          }
          s.textContent = JSON.stringify(j.schema_json);
          injectedIds.push(id);
        }
      } catch {
        // silent — autonomous SEO must never break the app
      }
    })();

    return () => {
      cancelled = true;
      injectedIds.forEach((id) => document.getElementById(id)?.remove());
    };
  }, [pathname]);

  return null;
};

export default AutoSEOOverrides;
