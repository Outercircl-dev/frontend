import React, { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { imagePreloadService } from '@/services/imagePreloadService';
import { imageCacheService } from '@/utils/imageCacheService';

interface UseSmartImagePreloaderOptions {
  activityTitle?: string;
  activityCategory?: string;
  preloadPopular?: boolean;
}

export const useSmartImagePreloader = (options: UseSmartImagePreloaderOptions = {}) => {
  const location = useLocation();
  const { activityTitle, activityCategory, preloadPopular = true } = options;

  // Preload images based on route and context
  const preloadForRoute = useCallback(async () => {
    const path = location.pathname;
    
    if (path === '/create-event') {
      // Preload critical images in service worker cache
      await imageCacheService.preloadCriticalImages();
      
      // Preload popular images for event creation
      if (preloadPopular) {
        imagePreloadService.preloadPopularImages();
      }

      // Preload specific images if we have context
      if (activityTitle || activityCategory) {
        imagePreloadService.preloadByActivity(activityTitle || '', activityCategory);
      }
    } else if (path === '/dashboard') {
      // Preload images for dashboard events
      imagePreloadService.preloadPopularImages();
    }
  }, [location.pathname, activityTitle, activityCategory, preloadPopular]);

  // Preload images when component mounts or route changes
  useEffect(() => {
    const timer = setTimeout(preloadForRoute, 500); // Delay to not interfere with main rendering
    return () => clearTimeout(timer);
  }, [preloadForRoute]);

  // Manual preload functions
  const preloadByCategory = useCallback((category: string, count?: number) => {
    return imagePreloadService.preloadByCategory(category, count);
  }, []);

  const preloadByActivity = useCallback((title: string, category?: string) => {
    return imagePreloadService.preloadByActivity(title, category);
  }, []);

  const isImagePreloaded = useCallback((url: string) => {
    return imagePreloadService.isImagePreloaded(url);
  }, []);

  const getPreloadStats = useCallback(() => {
    return imagePreloadService.getPreloadStats();
  }, []);

  return {
    preloadByCategory,
    preloadByActivity,
    isImagePreloaded,
    getPreloadStats
  };
};