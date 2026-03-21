import { useEffect, useCallback, useState } from 'react';
import { imageCacheService } from '@/utils/imageCacheService';


interface CacheManagerOptions {
  maxCacheSize?: number;
  preloadCriticalImages?: boolean;
  enableBackgroundCleaning?: boolean;
}

export const useImageCacheManager = (options: CacheManagerOptions = {}) => {

  const {
    maxCacheSize = 50,
    preloadCriticalImages = true,
    enableBackgroundCleaning = true
  } = options;

  const [cacheStats, setCacheStats] = useState({
    size: 0,
    oldestEntry: 0,
    newestEntry: 0
  });

  const [isPreloading, setIsPreloading] = useState(false);

  // Update cache statistics
  const updateCacheStats = useCallback(async () => {
    try {
      const stats = await imageCacheService.getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
    }
  }, []);

  // Preload critical images for better UX
  const preloadCritical = useCallback(async () => {
    if (!preloadCriticalImages) return;
    
    setIsPreloading(true);
    try {
      await imageCacheService.preloadCriticalImages();
    } catch (error) {
      console.warn('Failed to preload critical images:', error);
    } finally {
      setIsPreloading(false);
    }
  }, [preloadCriticalImages]);

  // Cache multiple images efficiently
  const batchCacheImages = useCallback(async (
    urls: string[], 
    priority: 'high' | 'medium' | 'low' = 'medium'
  ) => {
    try {
      await imageCacheService.batchCacheImages(urls, priority);
      updateCacheStats();
    } catch (error) {
      console.warn('Failed to batch cache images:', error);
    }
  }, [updateCacheStats]);

  // Cache single image
  const cacheImage = useCallback(async (
    url: string, 
    priority: 'high' | 'medium' | 'low' = 'medium'
  ) => {
    try {
      const success = await imageCacheService.cacheImage(url, priority);
      if (success) {
        updateCacheStats();
      }
      return success;
    } catch (error) {
      console.warn('Failed to cache image:', error);
      return false;
    }
  }, [updateCacheStats]);

  // Get cached image
  const getCachedImage = useCallback(async (url: string) => {
    try {
      return await imageCacheService.getCachedImage(url);
    } catch (error) {
      console.warn('Failed to get cached image:', error);
      return null;
    }
  }, []);

  // Clean up expired cache entries
  const cleanupCache = useCallback(async () => {
    try {
      await imageCacheService.cleanupExpiredCache();
      updateCacheStats();
    } catch (error) {
      console.warn('Failed to cleanup cache:', error);
    }
  }, [updateCacheStats]);

  // Initialize cache manager
  useEffect(() => {
    updateCacheStats();
    
    if (preloadCriticalImages) {
      preloadCritical();
    }

    // Set up periodic cache cleanup
    if (enableBackgroundCleaning) {
      const cleanupInterval = setInterval(cleanupCache, 5 * 60 * 1000); // Every 5 minutes
      return () => clearInterval(cleanupInterval);
    }
  }, [preloadCritical, enableBackgroundCleaning, cleanupCache, updateCacheStats]);

  // Monitor cache size and cleanup if needed
  useEffect(() => {
    if (cacheStats.size > maxCacheSize) {
      cleanupCache();
    }
  }, [cacheStats.size, maxCacheSize, cleanupCache]);

  return {
    cacheStats,
    isPreloading,
    batchCacheImages,
    cacheImage,
    getCachedImage,
    cleanupCache,
    updateCacheStats
  };
};