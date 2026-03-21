// Optimized stock image service with request deduplication and caching
import { stockImageService } from './stockImageService';

interface CacheEntry {
  data: string;
  timestamp: number;
  promise?: Promise<string>;
}

class OptimizedStockImageService {
  private cache = new Map<string, CacheEntry>();
  private inFlightRequests = new Map<string, Promise<string>>();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_CACHE_SIZE = 100;

  // Clear expired cache entries
  private clearExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_DURATION) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
  }

  // Manage cache size
  private manageCacheSize(): void {
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, this.cache.size - this.MAX_CACHE_SIZE);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  async getStockImage(query: string, category?: string): Promise<string> {
    const cacheKey = `${query}-${category || 'default'}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    // Check if request is already in flight
    const inFlight = this.inFlightRequests.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    // Make new request with deduplication
    const request = this.makeRequest(query, category);
    this.inFlightRequests.set(cacheKey, request);

    try {
      const result = await request;
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      // Clean up
      this.inFlightRequests.delete(cacheKey);
      this.clearExpiredCache();
      this.manageCacheSize();
      
      return result;
    } catch (error) {
      this.inFlightRequests.delete(cacheKey);
      throw error;
    }
  }

  private async makeRequest(query: string, category?: string): Promise<string> {
    try {
      return await stockImageService.getImageForActivity(query, undefined, category ? [category] : undefined);
    } catch (error) {
      // Return a default image on error
      return '/lovable-uploads/4bdc490c-09ce-40a1-92fc-3a8331a3fc90.png';
    }
  }

  // Enhanced batch processing for multiple images
  async getBatchStockImages(requests: { query: string; category?: string }[]): Promise<string[]> {
    const promises = requests.map(req => 
      this.getStockImage(req.query, req.category)
    );
    
    // Process in parallel with error handling
    return Promise.all(promises.map(p => 
      p.catch(() => '/lovable-uploads/4bdc490c-09ce-40a1-92fc-3a8331a3fc90.png')
    ));
  }

  clearCache(): void {
    this.cache.clear();
    this.inFlightRequests.clear();
  }

  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      inFlightRequests: this.inFlightRequests.size
    };
  }
}

export const optimizedStockImageService = new OptimizedStockImageService();