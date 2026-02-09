export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-border bg-card" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 py-3 text-center">
        <p className="text-xs text-muted-foreground">
          &copy; {currentYear} Mills Tech Industry. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
