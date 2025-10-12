export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border">
      <div className="max-w-7xl mx-auto px-4 py-3 text-center">
        <p className="text-sm text-muted-foreground">
          &copy; {currentYear} Mills Tech Industry. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
