import React, { useEffect, useState, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface PerformanceConfig {
  enableImageLazyLoading: boolean;
  enableVirtualScrolling: boolean;
  reducedMotion: boolean;
  connectionType: 'slow' | 'fast' | 'unknown';
}

export const usePerformanceOptimization = () => {
  const isMobile = useIsMobile();
  const [config, setConfig] = useState<PerformanceConfig>({
    enableImageLazyLoading: true,
    enableVirtualScrolling: false,
    reducedMotion: false,
    connectionType: 'unknown',
  });

  // Detect connection speed
  useEffect(() => {
    const detectConnection = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      if (connection) {
        const effectiveType = connection.effectiveType;
        const connectionType = ['slow-2g', '2g', '3g'].includes(effectiveType) ? 'slow' : 'fast';
        
        setConfig(prev => ({
          ...prev,
          connectionType,
          enableVirtualScrolling: connectionType === 'slow' && isMobile,
        }));
      }
    };

    detectConnection();
  }, [isMobile]);

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = () => {
      setConfig(prev => ({
        ...prev,
        reducedMotion: mediaQuery.matches,
      }));
    };

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Optimize images based on device capabilities
  const getImageQuality = useCallback(() => {
    if (config.connectionType === 'slow') return 60;
    if (isMobile) return 75;
    return 85;
  }, [config.connectionType, isMobile]);

  // Get appropriate image sizes for responsive loading
  const getImageSizes = useCallback((type: 'card' | 'hero' | 'thumbnail' = 'card') => {
    const baseSizes = {
      thumbnail: '(max-width: 640px) 100px, 150px',
      card: '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
      hero: '100vw',
    };

    return baseSizes[type];
  }, []);

  // Debounce function for performance
  const debounce = useCallback((func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }, []);

  // Throttle function for scroll events
  const throttle = useCallback((func: Function, limit: number) => {
    let inThrottle: boolean;
    return function(this: any, ...args: any[]) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }, []);

  // Preload critical resources
  const preloadResource = useCallback((href: string, as: string, type?: string) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    if (type) link.type = type;
    
    document.head.appendChild(link);
    
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  // Priority loading for critical content
  const priorityLoad = useCallback((callback: () => void, delay = 0) => {
    if (config.connectionType === 'slow') {
      setTimeout(callback, delay + 500);
    } else {
      setTimeout(callback, delay);
    }
  }, [config.connectionType]);

  return {
    config,
    isMobile,
    getImageQuality,
    getImageSizes,
    debounce,
    throttle,
    preloadResource,
    priorityLoad,
  };
};

// Hook for virtual scrolling optimization
export const useVirtualScrolling = (itemCount: number, itemHeight: number, containerHeight: number) => {
  const [scrollTop, setScrollTop] = useState(0);
  const { throttle } = usePerformanceOptimization();

  const handleScroll = throttle((e: Event) => {
    const target = e.target as HTMLElement;
    setScrollTop(target.scrollTop);
  }, 16); // ~60fps

  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    itemCount - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + 1
  );

  const visibleItems = Array.from(
    { length: endIndex - startIndex + 1 },
    (_, i) => startIndex + i
  );

  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    offsetY,
    handleScroll,
    totalHeight: itemCount * itemHeight,
  };
};