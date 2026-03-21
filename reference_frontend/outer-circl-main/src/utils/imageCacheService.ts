// Service Worker enhancement for image caching
class ImageCacheService {
  private readonly CACHE_NAME = 'outercircle-images-v1';
  private readonly MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours
  private cachePromise: Promise<Cache> | null = null;

  constructor() {
    this.initServiceWorker();
  }

  private async initServiceWorker() {
    // PHASE 2: Service workers disabled, but keep cache API for images
    if ('caches' in window) {
      try {
        await this.getCache();
        console.log('✅ Image cache service initialized (no SW)');
      } catch (error) {
        console.warn('⚠️ Failed to initialize image cache:', error);
      }
    }
  }

  private async getCache(): Promise<Cache> {
    if (!this.cachePromise) {
      this.cachePromise = caches.open(this.CACHE_NAME);
    }
    return this.cachePromise;
  }

  // Cache an image with metadata
  async cacheImage(url: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<boolean> {
    if (!('caches' in window)) return false;

    try {
      const cache = await this.getCache();
      
      // Check if already cached
      const cached = await cache.match(url);
      if (cached) return true;

      // Fetch and cache the image
      const response = await fetch(url, {
        mode: 'cors',
        cache: priority === 'high' ? 'force-cache' : 'default'
      });

      if (response.ok) {
        // Clone response for caching
        const responseClone = response.clone();
        
        // Add timestamp header for cache expiration
        const headers = new Headers(responseClone.headers);
        headers.set('x-cached-at', Date.now().toString());
        headers.set('x-cache-priority', priority);
        
        const cachedResponse = new Response(responseClone.body, {
          status: responseClone.status,
          statusText: responseClone.statusText,
          headers
        });

        await cache.put(url, cachedResponse);
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('Failed to cache image:', url, error);
      return false;
    }
  }

  // Batch cache multiple images
  async batchCacheImages(urls: string[], priority: 'high' | 'medium' | 'low' = 'medium'): Promise<void> {
    const promises = urls.map(url => this.cacheImage(url, priority));
    await Promise.allSettled(promises);
  }

  // Get cached image or fetch if not cached
  async getCachedImage(url: string): Promise<Response | null> {
    if (!('caches' in window)) return null;

    try {
      const cache = await this.getCache();
      const cached = await cache.match(url);
      
      if (cached) {
        // Check if cache is still valid
        const cachedAt = cached.headers.get('x-cached-at');
        if (cachedAt) {
          const age = Date.now() - parseInt(cachedAt);
          if (age < this.MAX_CACHE_AGE) {
            return cached;
          } else {
            // Remove expired cache
            await cache.delete(url);
          }
        }
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to get cached image:', url, error);
      return null;
    }
  }

  // Clean up expired cache entries
  async cleanupExpiredCache(): Promise<void> {
    if (!('caches' in window)) return;

    try {
      const cache = await this.getCache();
      const requests = await cache.keys();
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const cachedAt = response.headers.get('x-cached-at');
          if (cachedAt) {
            const age = Date.now() - parseInt(cachedAt);
            if (age > this.MAX_CACHE_AGE) {
              await cache.delete(request);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup cache:', error);
    }
  }

  // Get cache statistics
  async getCacheStats(): Promise<{ size: number; oldestEntry: number; newestEntry: number }> {
    if (!('caches' in window)) {
      return { size: 0, oldestEntry: 0, newestEntry: 0 };
    }

    try {
      const cache = await this.getCache();
      const requests = await cache.keys();
      
      let oldestEntry = Date.now();
      let newestEntry = 0;
      
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const cachedAt = response.headers.get('x-cached-at');
          if (cachedAt) {
            const timestamp = parseInt(cachedAt);
            oldestEntry = Math.min(oldestEntry, timestamp);
            newestEntry = Math.max(newestEntry, timestamp);
          }
        }
      }
      
      return {
        size: requests.length,
        oldestEntry: oldestEntry === Date.now() ? 0 : oldestEntry,
        newestEntry
      };
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
      return { size: 0, oldestEntry: 0, newestEntry: 0 };
    }
  }

  // Preload critical images
  async preloadCriticalImages(): Promise<void> {
    const criticalImages = [
      '/lovable-uploads/4bdc490c-09ce-40a1-92fc-3a8331a3fc90.png', // Default fallback
      // Add other critical images here
    ];

    await this.batchCacheImages(criticalImages, 'high');
  }
}

export const imageCacheService = new ImageCacheService();