// WCAG 2.1 AA Compliance - Skip to main content link
export function SkipToMain() {
  return (
    <a 
      href="#main-content" 
      className="skip-to-main focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      Skip to main content
    </a>
  );
}
