import React from 'react';
import { Helmet } from 'react-helmet-async';

interface UnifiedSEOProps {
  title: string;
  description: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  canonicalUrl?: string;
  type?: 'website' | 'article' | 'product';
  structuredData?: object;
  noIndex?: boolean;
  author?: string;
  article?: {
    publishedTime?: string;
    modifiedTime?: string;
    author?: string;
    section?: string;
    tags?: string[];
  };
}

const UnifiedSEO: React.FC<UnifiedSEOProps> = ({
  title,
  description,
  keywords,
  ogTitle,
  ogDescription,
  ogImage = '/lovable-uploads/76cfb7c3-9869-4a7a-abf6-1a5688ae9f15.png',
  canonicalUrl,
  type = 'website',
  structuredData,
  noIndex = false,
  author,
  article
}) => {
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://outercircl.com';
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const baseCanonicalUrl = `https://outercircl.com${currentPath}`;
  const finalCanonicalUrl = canonicalUrl || baseCanonicalUrl;
  
  // Ensure title follows consistent format
  const fullTitle = title.includes('outercircl') ? title : `${title} | outercircl`;
  const finalOgTitle = ogTitle || fullTitle;
  const finalOgDescription = ogDescription || description;
  const finalOgImage = ogImage.startsWith('http') ? ogImage : `https://outercircl.com${ogImage}`;

  // Generate comprehensive structured data
  const generateStructuredData = () => {
    const baseData = {
      "@context": "https://schema.org",
      "@type": type === 'article' ? 'Article' : 'WebPage',
      "name": fullTitle,
      "description": description,
      "url": finalCanonicalUrl,
      "image": finalOgImage,
      "publisher": {
        "@type": "Organization",
        "name": "outercircl",
        "logo": {
          "@type": "ImageObject",
          "url": "https://outercircl.com/lovable-uploads/76cfb7c3-9869-4a7a-abf6-1a5688ae9f15.png"
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": finalCanonicalUrl
      }
    };

    if (type === 'article' && article) {
      return {
        ...baseData,
        "@type": "Article",
        "headline": fullTitle,
        "datePublished": article.publishedTime,
        "dateModified": article.modifiedTime || article.publishedTime,
        "author": {
          "@type": "Person",
          "name": article.author || author || "outercircl"
        },
        "articleSection": article.section,
        "keywords": article.tags?.join(', ') || keywords
      };
    }

    return baseData;
  };

  const finalStructuredData = structuredData || generateStructuredData();

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {author && <meta name="author" content={author} />}
      <meta name="robots" content={noIndex ? "noindex, nofollow" : "index, follow"} />
      
      {/* Enhanced Mobile and Performance Meta Tags */}
      <meta name="format-detection" content="telephone=no" />
      <meta name="format-detection" content="date=no" />
      <meta name="format-detection" content="address=no" />
      <meta name="format-detection" content="email=no" />
      <meta name="HandheldFriendly" content="true" />
      <meta name="MobileOptimized" content="width" />
      
      {/* Open Graph Tags */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={finalOgTitle} />
      <meta property="og:description" content={finalOgDescription} />
      <meta property="og:image" content={finalOgImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={finalOgTitle} />
      <meta property="og:url" content={finalCanonicalUrl} />
      <meta property="og:site_name" content="outercircl" />
      <meta property="og:locale" content="en_US" />
      
      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@outer_circle" />
      <meta name="twitter:creator" content="@outer_circle" />
      <meta name="twitter:title" content={finalOgTitle} />
      <meta name="twitter:description" content={finalOgDescription} />
      <meta name="twitter:image" content={finalOgImage} />
      <meta name="twitter:image:alt" content={finalOgTitle} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={finalCanonicalUrl} />
      
      {/* Additional SEO Enhancement */}
      <meta name="theme-color" content="#E60023" />
      <meta name="application-name" content="outercircl" />
      <meta name="apple-mobile-web-app-title" content="outercircl" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="mobile-web-app-capable" content="yes" />
      
      {/* Performance Hints */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="preconnect" href="https://bommnpdpzmvqufurwwik.supabase.co" />
      <link rel="dns-prefetch" href="https://images.unsplash.com" />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(finalStructuredData)}
      </script>
      
      {/* Article specific meta tags */}
      {type === 'article' && article && (
        <>
          {article.publishedTime && (
            <meta property="article:published_time" content={article.publishedTime} />
          )}
          {article.modifiedTime && (
            <meta property="article:modified_time" content={article.modifiedTime} />
          )}
          {article.author && (
            <meta property="article:author" content={article.author} />
          )}
          {article.section && (
            <meta property="article:section" content={article.section} />
          )}
          {article.tags && article.tags.map((tag, index) => (
            <meta key={index} property="article:tag" content={tag} />
          ))}
        </>
      )}
    </Helmet>
  );
};

export default UnifiedSEO;