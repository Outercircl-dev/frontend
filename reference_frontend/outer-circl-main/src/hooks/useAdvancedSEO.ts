import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { generateEventSEO, generateProfileSEO, generateCategorySEO, generateLocationSEO } from '@/utils/dynamicSEO';

interface SEOData {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl: string;
  breadcrumbs?: Array<{ name: string; url: string }>;
  faqs?: Array<{ question: string; answer: string }>;
  structuredData?: object;
}

/**
 * Hook for managing dynamic SEO based on current route and data
 */
export const useAdvancedSEO = (data?: any) => {
  const location = useLocation();
  const [seoData, setSeoData] = useState<SEOData | null>(null);

  useEffect(() => {
    const path = location.pathname;
    const searchParams = new URLSearchParams(location.search);

    // Generate SEO data based on current route
    let generatedSEO: SEOData | null = null;

    if (path.startsWith('/event/') && data?.event) {
      generatedSEO = generateEventSEO(data.event);
    } else if (path.startsWith('/profile/') && data?.profile) {
      generatedSEO = generateProfileSEO(data.profile);
    } else if (path === '/dashboard' && searchParams.get('category') && data?.category) {
      generatedSEO = generateCategorySEO(data.category);
    } else if (data?.location) {
      generatedSEO = generateLocationSEO(data.location);
    }

    setSeoData(generatedSEO);
  }, [location, data]);

  return seoData;
};

/**
 * Hook for managing FAQ structured data
 */
export const useFAQStructuredData = (faqs: Array<{ question: string; answer: string }>) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return structuredData;
};

/**
 * Hook for managing breadcrumb structured data
 */
export const useBreadcrumbStructuredData = (breadcrumbs: Array<{ name: string; url: string }>) => {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": {
        "@type": "WebPage",
        "@id": item.url.startsWith('http') ? item.url : `https://outercircl.com${item.url}`
      }
    }))
  };

  return structuredData;
};