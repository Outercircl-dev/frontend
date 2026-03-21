import React, { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { performanceOptimizer } from '@/utils/performanceOptimizer';

interface UseOptimizedImagePreloaderOptions {
  activityTitle?: string;
  activityCategory?: string;
  preloadPopular?: boolean;
  defer?: boolean; // Add option to defer preloading
}

export const useOptimizedImagePreloader = (options: UseOptimizedImagePreloaderOptions = {}) => {
  const location = useLocation();
  const { activityTitle, activityCategory, preloadPopular = false, defer = true } = options;

  // Optimized preload function that respects performance budgets
  const preloadForRoute = useCallback(async () => {
    const path = location.pathname;
    
    // Only preload if we're on a slow connection and user hasn't opted for data saving
    if (!performanceOptimizer.isHighPerformanceMode()) {
      console.log('⚡ Skipping image preload on slow connection');
      return;
    }
    
    if (path === '/create-event') {
      try {
        // Lazy load image services only when needed
        const [{ imageCacheService }, { imagePreloadService }] = await Promise.all([
          import('@/utils/imageCacheService'),
          import('@/services/imagePreloadService')
        ]);
        
        // Preload only critical images
        await imageCacheService.preloadCriticalImages();
        
        // Preload popular images only if specifically requested and device has sufficient memory
        if (preloadPopular && performanceOptimizer.hasSufficientMemory()) {
          imagePreloadService.preloadPopularImages();
        }

        // Context-specific preloading
        if ((activityTitle || activityCategory) && performanceOptimizer.hasSufficientMemory()) {
          imagePreloadService.preloadByActivity(activityTitle || '', activityCategory);
        }
      } catch (error) {
        console.warn('Image preloading failed:', error);
      }
    }
  }, [location.pathname, activityTitle, activityCategory, preloadPopular]);

  // Defer image preloading to not block main rendering
  useEffect(() => {
    if (!defer) {
      preloadForRoute();
      return;
    }

    // Use performance optimizer to defer until browser is idle
    const cleanup = performanceOptimizer.deferUntilIdle(() => {
      preloadForRoute();
    }, 3000); // Give more time for main content to load

    return cleanup;
  }, [preloadForRoute, defer]);

  // Manual preload functions with performance checks
  const preloadByCategory = useCallback(async (category: string, count?: number) => {
    if (!performanceOptimizer.hasSufficientMemory()) {
      console.log('⚡ Skipping category preload due to memory constraints');
      return [];
    }
    
    try {
      const { imagePreloadService } = await import('@/services/imagePreloadService');
      return imagePreloadService.preloadByCategory(category, count);
    } catch (error) {
      console.warn('Category preload failed:', error);
      return [];
    }
  }, []);

  const preloadByActivity = useCallback(async (title: string, category?: string) => {
    if (!performanceOptimizer.hasSufficientMemory()) {
      console.log('⚡ Skipping activity preload due to memory constraints');
      return [];
    }
    
    try {
      const { imagePreloadService } = await import('@/services/imagePreloadService');
      return imagePreloadService.preloadByActivity(title, category);
    } catch (error) {
      console.warn('Activity preload failed:', error);
      return [];
    }
  }, []);

  const isImagePreloaded = useCallback(async (url: string) => {
    try {
      const { imagePreloadService } = await import('@/services/imagePreloadService');
      return imagePreloadService.isImagePreloaded(url);
    } catch (error) {
      console.warn('Preload check failed:', error);
      return false;
    }
  }, []);

  const getPreloadStats = useCallback(async () => {
    try {
      const { imagePreloadService } = await import('@/services/imagePreloadService');
      return imagePreloadService.getPreloadStats();
    } catch (error) {
      console.warn('Stats retrieval failed:', error);
      return { preloadedCount: 0, totalRequests: 0, cacheHitRate: 0 };
    }
  }, []);

  return {
    preloadByCategory,
    preloadByActivity,
    isImagePreloaded,
    getPreloadStats
  };
};