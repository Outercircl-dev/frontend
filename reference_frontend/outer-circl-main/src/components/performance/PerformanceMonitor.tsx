import React, { useEffect } from 'react';

interface PerformanceMonitorProps {
  enabled?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  enabled = process.env.NODE_ENV === 'development' 
}) => {
  useEffect(() => {
    if (!enabled) return;

    let loadTime = 0;
    let renderStartTime = performance.now();

    // Monitor initial page load
    const handleLoad = () => {
      loadTime = performance.now();
      if (process.env.NODE_ENV === 'development') {
        console.log(`⚡ Page load time: ${loadTime.toFixed(2)}ms`);
      }
    };

    // Monitor Core Web Vitals (simplified for development)
    if (typeof PerformanceObserver !== 'undefined') {
      // Largest Contentful Paint
      try {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (process.env.NODE_ENV === 'development') {
            console.log(`📊 LCP: ${lastEntry.startTime.toFixed(2)}ms`);
          }
        }).observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // Observer not supported
      }

      // First Input Delay
      try {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            const fid = entry.processingStart - entry.startTime;
            if (process.env.NODE_ENV === 'development') {
              console.log(`📊 FID: ${fid.toFixed(2)}ms`);
            }
          });
        }).observe({ entryTypes: ['first-input'] });
      } catch (e) {
        // Observer not supported
      }
    }

    // Monitor component render time
    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTime;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🎨 Component render time: ${renderTime.toFixed(2)}ms`);
    }

    window.addEventListener('load', handleLoad);
    
    return () => {
      window.removeEventListener('load', handleLoad);
    };
  }, [enabled]);

  return null; // This component doesn't render anything
};

export default PerformanceMonitor;