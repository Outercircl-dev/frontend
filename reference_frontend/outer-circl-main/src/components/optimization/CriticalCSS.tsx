import React, { useEffect } from 'react';

// Critical CSS inlining for above-the-fold content
const CriticalCSS: React.FC = () => {
  useEffect(() => {
    // Preload critical fonts
    const fontPreload = document.createElement('link');
    fontPreload.rel = 'preload';
    fontPreload.as = 'font';
    fontPreload.type = 'font/woff2';
    fontPreload.crossOrigin = 'anonymous';
    fontPreload.href = '/fonts/inter-var.woff2';
    document.head.appendChild(fontPreload);

    // Preconnect to external domains
    const preconnects = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com'
    ];

    preconnects.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = url;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

    return () => {
      // Cleanup on unmount
      if (document.head.contains(fontPreload)) {
        document.head.removeChild(fontPreload);
      }
    };
  }, []);

  return null;
};

export default CriticalCSS;