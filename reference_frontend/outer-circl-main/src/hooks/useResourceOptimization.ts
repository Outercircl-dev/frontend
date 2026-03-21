import { useEffect, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ResourceOptimizationOptions {
  enableServiceWorker?: boolean;
  prefetchRoutes?: string[];
  enableResourceHints?: boolean;
}

export const useResourceOptimization = (options: ResourceOptimizationOptions = {}) => {
  const isMobile = useIsMobile();
  const { 
    enableServiceWorker = true, 
    prefetchRoutes = [], 
    enableResourceHints = true 
  } = options;

  // Preload critical resources
  const preloadResource = useCallback((href: string, as: string, type?: string) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    if (type) link.type = type;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }, []);

  // Prefetch routes for faster navigation
  const prefetchRoute = useCallback((route: string) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = route;
    document.head.appendChild(link);
  }, []);

  // PHASE 2: Service Worker registration DISABLED
  useEffect(() => {
    console.log('🚫 Service Worker registration disabled (PHASE 2)');
  }, []);

  // Resource hints optimization
  useEffect(() => {
    if (!enableResourceHints) return;

    // Preload critical resources
    preloadResource('/fonts/inter-var.woff2', 'font', 'font/woff2');
    
    // Prefetch routes on desktop only to save bandwidth on mobile
    if (!isMobile && prefetchRoutes.length > 0) {
      const timer = setTimeout(() => {
        prefetchRoutes.forEach(route => prefetchRoute(route));
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [enableResourceHints, isMobile, prefetchRoutes, preloadResource, prefetchRoute]);

  // Network-aware optimizations
  useEffect(() => {
    if (!('connection' in navigator)) return;

    const connection = (navigator as any).connection;
    if (!connection) return;

    // Adjust optimization strategy based on connection
    const handleConnectionChange = () => {
      const { effectiveType, saveData } = connection;
      
      if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
        // Disable non-critical optimizations on slow connections
        console.log('🐌 Slow connection detected - reducing resource loading');
      }
    };

    connection.addEventListener('change', handleConnectionChange);
    handleConnectionChange(); // Initial check

    return () => {
      connection.removeEventListener('change', handleConnectionChange);
    };
  }, []);

  return {
    preloadResource,
    prefetchRoute,
    isMobile
  };
};