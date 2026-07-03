import { Link, useLocation } from "react-router-dom";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useEffect } from "react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface SEOBreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

const baseUrl = "https://bakuscribe.com";

// Route label mapping for automatic breadcrumb generation
const routeLabels: Record<string, string> = {
  "": "Home",
  "landing": "Home",
  "auth": "Sign In",
  "app": "Dashboard",
  "admin": "Admin Panel",
  "settings": "Settings",
  "subscription": "Subscription",
  "terms": "Terms of Service",
  "privacy": "Privacy Policy",
  "install": "Install App",
};

export const SEOBreadcrumb = ({ items, className }: SEOBreadcrumbProps) => {
  // Inject JSON-LD breadcrumb structured data
  useEffect(() => {
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": baseUrl
        },
        ...items.map((item, index) => ({
          "@type": "ListItem",
          "position": index + 2,
          "name": item.label,
          "item": item.href ? `${baseUrl}${item.href}` : undefined
        }))
      ]
    };

    // Remove existing breadcrumb schema
    const existingScript = document.getElementById("breadcrumb-json-ld");
    if (existingScript) {
      existingScript.remove();
    }

    // Add new breadcrumb schema
    const script = document.createElement("script");
    script.id = "breadcrumb-json-ld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(breadcrumbSchema);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [items]);

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {/* Home */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/" className="flex items-center gap-1.5">
              <Home className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {/* Dynamic items */}
        {items.map((item, index) => (
          <div key={index} className="contents">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {index === items.length - 1 || !item.href ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

// Auto-generate breadcrumbs from current route
export const useAutoBreadcrumbs = (): BreadcrumbItem[] => {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  return pathSegments.map((segment, index) => {
    const href = "/" + pathSegments.slice(0, index + 1).join("/");
    const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    
    return {
      label,
      href: index < pathSegments.length - 1 ? href : undefined
    };
  });
};

export default SEOBreadcrumb;
