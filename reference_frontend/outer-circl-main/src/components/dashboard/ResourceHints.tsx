import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * ResourceHints component adds critical resource hints to improve performance
 * - DNS prefetch for external domains
 * - Preconnect for critical origins
 * - Prefetch for likely navigation targets
 */
export const ResourceHints = () => {
  useEffect(() => {
    // Prefetch likely next pages
    const prefetchPages = ['/events', '/messages', '/profile'];
    
    prefetchPages.forEach(page => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = page;
      link.as = 'document';
      document.head.appendChild(link);
    });

    return () => {
      // Cleanup prefetch hints on unmount
      const hints = document.querySelectorAll('link[rel="prefetch"]');
      hints.forEach(hint => hint.remove());
    };
  }, []);

  return (
    <Helmet>
      {/* DNS Prefetch for Supabase */}
      <link rel="dns-prefetch" href="https://bommnpdpzmvqufurwwik.supabase.co" />
      
      {/* Preconnect for critical origins */}
      <link 
        rel="preconnect" 
        href="https://bommnpdpzmvqufurwwik.supabase.co" 
        crossOrigin="anonymous"
      />
      
      {/* Preconnect for storage */}
      <link 
        rel="preconnect" 
        href="https://bommnpdpzmvqufurwwik.supabase.co/storage/v1" 
        crossOrigin="anonymous"
      />
    </Helmet>
  );
};
