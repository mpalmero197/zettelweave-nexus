import { Link } from "react-router-dom";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-2 text-center">
        <p className="text-xs text-muted-foreground">
          &copy; {currentYear} Mills Tech Industry. All rights reserved.
        </p>
        <nav className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground" aria-label="Footer navigation">
          <Link to="/sitemap" className="hover:text-foreground transition-colors">Sitemap</Link>
          <Link to="/changelog" className="hover:text-foreground transition-colors">Changelog</Link>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
        </nav>
        <a
          href="https://halcyonranker.lovable.app/site/pendragonx.com"
          target="_blank"
          rel="noopener"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 14px",
            background: "#FFFFFF",
            color: "#0F172A",
            border: "1px solid #E2E8F0",
            borderRadius: "10px",
            font: "600 12px/1 -apple-system,Segoe UI,Inter,sans-serif",
            textDecoration: "none",
            boxShadow: "0 1px 2px rgba(15,23,42,.06)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Verified by Halcyon Ranker · 79/100
        </a>
      </div>
    </footer>
  );
}
