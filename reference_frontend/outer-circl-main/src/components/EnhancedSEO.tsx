import React from 'react';
import { Helmet } from 'react-helmet-async';
import { generateOrganizationSchema, outercirclOrganization } from '../utils/seoSchemas';

interface EnhancedSEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  type?: 'website' | 'article';
  structuredData?: object;
  noIndex?: boolean;
  ogImage?: string;
  breadcrumbs?: Array<{
    name: string;
    url: string;
  }>;
}

/**
 * Enhanced SEO component that consolidates all SEO needs without duplication
 */
export const EnhancedSEO: React.FC<EnhancedSEOProps> = ({
  title,
  description,
  keywords,
  canonicalUrl,
  type = 'website',
  structuredData,
  noIndex = false,
  ogImage = '/lovable-uploads/76cfb7c3-9869-4a7a-abf6-1a5688ae9f15.png',
  breadcrumbs
}) => {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const finalCanonicalUrl = canonicalUrl || `https://outercircl.com${currentPath}`;
  const fullTitle = title.includes('outercircl') ? title : `${title} | outercircl`;
  const finalOgImage = ogImage.startsWith('http') ? ogImage : `https://outercircl.com${ogImage}`;

  // Generate consolidated structured data
  const generateStructuredData = () => {
    const baseData = {
      "@context": "https://schema.org",
      "@type": type === 'article' ? 'Article' : 'WebPage',
      "name": fullTitle,
      "description": description,
      "url": finalCanonicalUrl,
      "image": finalOgImage,
      "inLanguage": "en-US",
      "isPartOf": {
        "@type": "WebSite",
        "@id": "https://outercircl.com",
        "name": "outercircl",
        "url": "https://outercircl.com"
      },
      "publisher": generateOrganizationSchema(outercirclOrganization),
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": finalCanonicalUrl
      }
    };

    // Add breadcrumbs if provided
    if (breadcrumbs && breadcrumbs.length > 0) {
      baseData["breadcrumb"] = {
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs.map((item, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": item.name,
          "item": item.url
        }))
      };
    }

    return structuredData || baseData;
  };

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow"} />
      
      {/* Open Graph Tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={finalOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={finalCanonicalUrl} />
      <meta property="og:site_name" content="outercircl" />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={finalOgImage} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={finalCanonicalUrl} />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(generateStructuredData())}
      </script>
    </Helmet>
  );
};

export default EnhancedSEO;