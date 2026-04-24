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
      </div>
    </footer>
  );
}
