import React, { useEffect } from 'react';
import { useResourceOptimization } from '@/hooks/useResourceOptimization';

interface ResourcePreloaderProps {
  criticalRoutes?: string[];
  criticalImages?: string[];
  enableServiceWorker?: boolean;
}

const ResourcePreloader: React.FC<ResourcePreloaderProps> = ({
  criticalRoutes = ['/dashboard', '/auth', '/profile'],
  criticalImages = [],
  enableServiceWorker = true
}) => {
  const { preloadResource, prefetchRoute, isMobile } = useResourceOptimization({
    enableServiceWorker,
    prefetchRoutes: criticalRoutes,
    enableResourceHints: true
  });

  useEffect(() => {
    // Preload critical resources
    const criticalResources = [
      { href: '/fonts/inter-var.woff2', as: 'font', type: 'font/woff2' },
      ...criticalImages.map(src => ({ href: src, as: 'image' }))
    ];

    criticalResources.forEach(resource => {
      preloadResource(resource.href, resource.as, (resource as any).type);
    });

    // Prefetch critical routes on desktop
    if (!isMobile) {
      setTimeout(() => {
        criticalRoutes.forEach(route => prefetchRoute(route));
      }, 2000);
    }
  }, [preloadResource, prefetchRoute, isMobile, criticalRoutes, criticalImages]);

  return null;
};

export default ResourcePreloader;