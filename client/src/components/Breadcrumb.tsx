import { Link } from 'wouter';
import { ChevronRight, Home } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useMemo } from 'react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  includeSchema?: boolean;
}

export function Breadcrumb({ items, className = '', includeSchema = true }: BreadcrumbProps) {
  const breadcrumbSchema = useMemo(() => {
    const itemList = [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://journalmate.ai/"
      },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 2,
        "name": item.label,
        ...(item.href ? { "item": `https://journalmate.ai${item.href}` } : {})
      }))
    ];
    
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": itemList
    };
  }, [items]);

  return (
    <>
      {includeSchema && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify(breadcrumbSchema)}
          </script>
        </Helmet>
      )}
      <nav aria-label="Breadcrumb" className={`flex items-center text-sm text-muted-foreground ${className}`} data-testid="breadcrumb-nav">
        <Link href="/" className="flex items-center hover:text-foreground transition-colors" data-testid="breadcrumb-link-home">
          <Home className="w-4 h-4" />
          <span className="sr-only">Home</span>
        </Link>
        {items.map((item, index) => (
          <span key={index} className="flex items-center">
            <ChevronRight className="w-4 h-4 mx-2" />
            {item.href ? (
              <Link 
                href={item.href} 
                className="hover:text-foreground transition-colors"
                data-testid={`breadcrumb-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-medium" data-testid="breadcrumb-current">
                {item.label}
              </span>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
