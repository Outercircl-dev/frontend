// PHASE 3: Unified cache manager for all app data
// Single source of truth for caching with TTL management
import { safeSessionStorage, safeLocalStorage } from './safeStorage';

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheConfig {
  storage: 'session' | 'local';
  ttl: number; // milliseconds
}

// Cache configurations for different data types
const CACHE_CONFIGS: Record<string, CacheConfig> = {
  // Auth data - session storage, no TTL (AppBootstrap validates on startup)
  auth: { storage: 'session', ttl: Infinity },
  
  // Dashboard data - session for quick access, 15 min TTL
  dashboard: { storage: 'session', ttl: 15 * 60 * 1000 },
  
  // Events list - local storage, 15 min TTL
  events: { storage: 'local', ttl: 15 * 60 * 1000 },
  
  // Event details - local storage, 1 hour TTL
  event_detail: { storage: 'local', ttl: 60 * 60 * 1000 },
  
  // Profile data - local storage, 1 hour TTL
  profile: { storage: 'local', ttl: 60 * 60 * 1000 },
  
  // User preferences - local storage, 24 hour TTL
  preferences: { storage: 'local', ttl: 24 * 60 * 60 * 1000 },
};

export class CacheManager {
  private static instance: CacheManager;
  
  private constructor() {}
  
  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }
  
  /**
   * Get cached data if valid
   */
  get<T>(key: string, type: keyof typeof CACHE_CONFIGS = 'dashboard'): T | null {
    const config = CACHE_CONFIGS[type];
    const storage = config.storage === 'session' ? safeSessionStorage : safeLocalStorage;
    
    try {
      const cached = storage.getItem(this.getCacheKey(key, type));
      if (!cached) return null;
      
      const entry: CacheEntry<T> = JSON.parse(cached);
      
      // Auth cache never expires (only invalidates on sign-out)
      // Other caches check TTL
      if (type !== 'auth' && Date.now() - entry.timestamp >= entry.ttl) {
        storage.removeItem(this.getCacheKey(key, type));
        return null;
      }
      
      return entry.data;
    } catch (error) {
      console.warn(`Cache read error for ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Set cached data with TTL
   */
  set<T>(key: string, data: T, type: keyof typeof CACHE_CONFIGS = 'dashboard'): void {
    const config = CACHE_CONFIGS[type];
    const storage = config.storage === 'session' ? safeSessionStorage : safeLocalStorage;
    
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: config.ttl,
      };
      
      storage.setItem(this.getCacheKey(key, type), JSON.stringify(entry));
    } catch (error) {
      console.warn(`Cache write error for ${key}:`, error);
    }
  }
  
  /**
   * Remove specific cache entry
   */
  remove(key: string, type: keyof typeof CACHE_CONFIGS = 'dashboard'): void {
    const config = CACHE_CONFIGS[type];
    const storage = config.storage === 'session' ? safeSessionStorage : safeLocalStorage;
    storage.removeItem(this.getCacheKey(key, type));
  }
  
  /**
   * Clear all cache entries of a specific type
   */
  clearType(type: keyof typeof CACHE_CONFIGS): void {
    const config = CACHE_CONFIGS[type];
    const storage = config.storage === 'session' ? safeSessionStorage : safeLocalStorage;
    
    // Get all keys and remove those matching the type prefix
    const prefix = `cache_${type}_`;
    const keys = this.getAllKeys(storage);
    
    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        storage.removeItem(key);
      }
    });
  }
  
  /**
   * Clear all cache
   */
  clearAll(): void {
    Object.keys(CACHE_CONFIGS).forEach(type => {
      this.clearType(type as keyof typeof CACHE_CONFIGS);
    });
  }
  
  /**
   * Check if cache exists and is valid
   */
  has(key: string, type: keyof typeof CACHE_CONFIGS = 'dashboard'): boolean {
    return this.get(key, type) !== null;
  }
  
  /**
   * Get cache statistics
   */
  getStats(): Record<string, { count: number; size: number }> {
    const stats: Record<string, { count: number; size: number }> = {};
    
    Object.keys(CACHE_CONFIGS).forEach(type => {
      const config = CACHE_CONFIGS[type as keyof typeof CACHE_CONFIGS];
      const storage = config.storage === 'session' ? safeSessionStorage : safeLocalStorage;
      const prefix = `cache_${type}_`;
      const keys = this.getAllKeys(storage).filter(k => k.startsWith(prefix));
      
      let size = 0;
      keys.forEach(key => {
        const value = storage.getItem(key);
        if (value) size += value.length;
      });
      
      stats[type] = { count: keys.length, size };
    });
    
    return stats;
  }
  
  private getCacheKey(key: string, type: string): string {
    return `cache_${type}_${key}`;
  }
  
  private getAllKeys(storage: typeof safeSessionStorage): string[] {
    const keys: string[] = [];
    try {
      const length = storage.length;
      for (let i = 0; i < length; i++) {
        const key = storage.key(i);
        if (key) keys.push(key);
      }
    } catch (error) {
      console.warn('Error getting storage keys:', error);
    }
    return keys;
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();
