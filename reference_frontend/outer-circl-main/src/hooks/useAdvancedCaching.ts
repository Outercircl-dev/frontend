import React, { useState, useEffect, useCallback } from 'react';
import { usePerformanceBudget } from './usePerformanceBudget';
import { safeLocalStorage } from '@/utils/safeStorage';

interface CacheMetrics {
  totalSize: number;
  hitRate: number;
  missRate: number;
  entries: number;
  lastCleared: Date | null;
}

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheOptions {
  ttl?: number;
  maxSize?: number;
  strategy?: 'lru' | 'lfu' | 'fifo';
  persistent?: boolean;
}

export const useAdvancedCaching = () => {
  const [metrics, setMetrics] = useState<CacheMetrics>({
    totalSize: 0,
    hitRate: 0,
    missRate: 0,
    entries: 0,
    lastCleared: null
  });

  const { checkBudget } = usePerformanceBudget();

  // In-memory cache storage
  const cache = React.useRef<Map<string, CacheEntry>>(new Map());
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0 });

  // Get cached data with automatic cleanup
  const get = useCallback(<T>(key: string): T | null => {
    const entry = cache.current.get(key);
    
    if (!entry) {
      setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      cache.current.delete(key);
      setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    cache.current.set(key, entry);
    
    setCacheStats(prev => ({ ...prev, hits: prev.hits + 1 }));
    return entry.data;
  }, []);

  // Set cached data with options
  const set = useCallback(<T>(
    key: string, 
    data: T, 
    options: CacheOptions = {}
  ): void => {
    const {
      ttl = 30 * 60 * 1000, // 30 minutes default
      maxSize = 100,
      strategy = 'lru',
      persistent = false
    } = options;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 1,
      lastAccessed: Date.now()
    };

    // Manage cache size
    if (cache.current.size >= maxSize) {
      evictEntry(strategy);
    }

    cache.current.set(key, entry);

    // Persist to localStorage if requested
    if (persistent && typeof window !== 'undefined') {
      try {
        safeLocalStorage.setItem(`cache_${key}`, JSON.stringify(entry));
      } catch (error) {
        console.warn('Failed to persist cache entry:', error);
      }
    }

    updateMetrics();
  }, []);

  // Evict entry based on strategy
  const evictEntry = useCallback((strategy: 'lru' | 'lfu' | 'fifo') => {
    if (cache.current.size === 0) return;

    let keyToEvict: string;
    const entries = Array.from(cache.current.entries());

    switch (strategy) {
      case 'lru': // Least Recently Used
        keyToEvict = entries.reduce((oldest, [key, entry]) => {
          const oldestEntry = cache.current.get(oldest);
          return !oldestEntry || entry.lastAccessed < oldestEntry.lastAccessed ? key : oldest;
        }, entries[0][0]);
        break;

      case 'lfu': // Least Frequently Used
        keyToEvict = entries.reduce((least, [key, entry]) => {
          const leastEntry = cache.current.get(least);
          return !leastEntry || entry.accessCount < leastEntry.accessCount ? key : least;
        }, entries[0][0]);
        break;

      case 'fifo': // First In, First Out
      default:
        keyToEvict = entries.reduce((oldest, [key, entry]) => {
          const oldestEntry = cache.current.get(oldest);
          return !oldestEntry || entry.timestamp < oldestEntry.timestamp ? key : oldest;
        }, entries[0][0]);
        break;
    }

    cache.current.delete(keyToEvict);
  }, []);

  // Clear cache
  const clear = useCallback((pattern?: string) => {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [key] of cache.current) {
        if (regex.test(key)) {
          cache.current.delete(key);
        }
      }
    } else {
      cache.current.clear();
    }

    setMetrics(prev => ({ ...prev, lastCleared: new Date() }));
    updateMetrics();
  }, []);

  // Remove expired entries
  const cleanup = useCallback(() => {
    const now = Date.now();
    const expired: string[] = [];

    for (const [key, entry] of cache.current) {
      if (now - entry.timestamp > entry.ttl) {
        expired.push(key);
      }
    }

    expired.forEach(key => cache.current.delete(key));
    
    if (expired.length > 0) {
      console.log(`🧹 Cache cleanup: removed ${expired.length} expired entries`);
      updateMetrics();
    }
  }, []);

  // Update cache metrics
  const updateMetrics = useCallback(() => {
    const totalEntries = cache.current.size;
    const totalHits = cacheStats.hits;
    const totalMisses = cacheStats.misses;
    const totalRequests = totalHits + totalMisses;

    let totalSize = 0;
    for (const [, entry] of cache.current) {
      totalSize += JSON.stringify(entry.data).length;
    }

    setMetrics({
      totalSize,
      hitRate: totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0,
      missRate: totalRequests > 0 ? (totalMisses / totalRequests) * 100 : 0,
      entries: totalEntries,
      lastCleared: metrics.lastCleared
    });

    // Check performance budget
    checkBudget('maxCacheSize', totalSize);
  }, [cacheStats, checkBudget, metrics.lastCleared]);

  // Prefetch data for performance
  const prefetch = useCallback(async <T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ): Promise<void> => {
    try {
      // Check if already cached and not expired
      const existing = get<T>(key);
      if (existing) return;

      const data = await fetcher();
      set(key, data, options);
    } catch (error) {
      console.warn(`Prefetch failed for key ${key}:`, error);
    }
  }, [get, set]);

  // Invalidate cache entries
  const invalidate = useCallback((pattern: string) => {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    for (const [key] of cache.current) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => cache.current.delete(key));
    updateMetrics();

    console.log(`🗑️ Invalidated ${keysToDelete.length} cache entries matching pattern: ${pattern}`);
  }, [updateMetrics]);

  // Background cache operations
  useEffect(() => {
    // Periodic cleanup
    const cleanupInterval = setInterval(cleanup, 5 * 60 * 1000); // Every 5 minutes

    // Update metrics periodically
    const metricsInterval = setInterval(updateMetrics, 30 * 1000); // Every 30 seconds

    return () => {
      clearInterval(cleanupInterval);
      clearInterval(metricsInterval);
    };
  }, [cleanup, updateMetrics]);

  // Load persistent cache on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !safeLocalStorage.isAvailable()) return;

    try {
      for (let i = 0; i < safeLocalStorage.length; i++) {
        const key = safeLocalStorage.key(i);
        if (key?.startsWith('cache_')) {
          const cacheKey = key.replace('cache_', '');
          const entryStr = safeLocalStorage.getItem(key);
          if (entryStr) {
            const entry = JSON.parse(entryStr);
            // Check if not expired
            if (Date.now() - entry.timestamp <= entry.ttl) {
              cache.current.set(cacheKey, entry);
            } else {
              safeLocalStorage.removeItem(key);
            }
          }
        }
      }
      updateMetrics();
    } catch (error) {
      console.warn('Failed to load persistent cache:', error);
    }
  }, [updateMetrics]);

  return {
    get,
    set,
    clear,
    cleanup,
    prefetch,
    invalidate,
    metrics,
    cacheStats
  };
};