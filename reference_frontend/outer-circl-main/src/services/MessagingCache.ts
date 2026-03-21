// Unified caching system for all messaging data
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  dependencies: string[];
  ttl: number;
}

export class MessagingCache {
  private static instance: MessagingCache;
  private cache = new Map<string, CacheEntry>();
  private dependencyMap = new Map<string, Set<string>>();
  private readonly DEFAULT_TTL = 300000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly CACHE_VERSION = 'v1.0.0';
  private readonly STORAGE_KEY = 'messaging_cache';
  private readonly VERSION_KEY = 'messaging_cache_version';

  static getInstance(): MessagingCache {
    if (!MessagingCache.instance) {
      MessagingCache.instance = new MessagingCache();
    }
    return MessagingCache.instance;
  }

  private constructor() {
    // Load from localStorage on initialization
    this.loadFromLocalStorage();
    
    // Auto-cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 300000);
    
    // Save to localStorage before page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.saveToLocalStorage();
      });
    }
  }

  // Load cache from localStorage
  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const version = localStorage.getItem(this.VERSION_KEY);
      
      // Clear cache if version mismatch
      if (version !== this.CACHE_VERSION) {
        console.log(`📦 Cache version mismatch (${version} vs ${this.CACHE_VERSION}), clearing`);
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.setItem(this.VERSION_KEY, this.CACHE_VERSION);
        return;
      }

      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored);
      const now = Date.now();
      let loadedCount = 0;

      // Restore cache entries, filtering out expired ones
      for (const [key, entry] of Object.entries(parsed.cache || {})) {
        const cacheEntry = entry as CacheEntry;
        if (now - cacheEntry.timestamp < cacheEntry.ttl) {
          this.cache.set(key, cacheEntry);
          
          // Restore dependency mappings
          cacheEntry.dependencies.forEach(dep => {
            if (!this.dependencyMap.has(dep)) {
              this.dependencyMap.set(dep, new Set());
            }
            this.dependencyMap.get(dep)!.add(key);
          });
          
          loadedCount++;
        }
      }

      console.log(`📦 Cache loaded from localStorage: ${loadedCount} valid entries`);
    } catch (error) {
      console.warn('⚠️ Failed to load cache from localStorage:', error);
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  // Save cache to localStorage
  private saveToLocalStorage(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const cacheObj: Record<string, CacheEntry> = {};
      
      // Convert Map to plain object
      for (const [key, entry] of this.cache.entries()) {
        cacheObj[key] = entry;
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        cache: cacheObj,
        savedAt: Date.now()
      }));

      console.log(`📦 Cache saved to localStorage: ${this.cache.size} entries`);
    } catch (error) {
      console.warn('⚠️ Failed to save cache to localStorage:', error);
    }
  }

  // Set cache entry with dependencies for intelligent invalidation
  set<T>(
    key: string, 
    data: T, 
    dependencies: string[] = [], 
    ttl: number = this.DEFAULT_TTL
  ): void {
    // Prevent memory bloat
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.cleanup();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      dependencies,
      ttl
    };

    this.cache.set(key, entry);

    // Update dependency mapping for fast invalidation
    dependencies.forEach(dep => {
      if (!this.dependencyMap.has(dep)) {
        this.dependencyMap.set(dep, new Set());
      }
      this.dependencyMap.get(dep)!.add(key);
    });

    // Save to localStorage after each set
    this.saveToLocalStorage();

    console.log(`📦 Cache SET: ${key} (deps: ${dependencies.join(', ')})`);
  }

  // Get cache entry if valid
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      console.log(`📦 Cache MISS: ${key}`);
      this.trackMiss();
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      console.log(`📦 Cache EXPIRED: ${key}`);
      this.delete(key);
      this.trackMiss();
      return null;
    }

    console.log(`📦 Cache HIT: ${key}`);
    this.trackHit();
    return entry.data as T;
  }

  // Check if cache entry exists and is valid
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  // Delete specific cache entry
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (entry) {
      // Remove from dependency mapping
      entry.dependencies.forEach(dep => {
        const depSet = this.dependencyMap.get(dep);
        if (depSet) {
          depSet.delete(key);
          if (depSet.size === 0) {
            this.dependencyMap.delete(dep);
          }
        }
      });
    }

    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`📦 Cache DELETE: ${key}`);
    }
    return deleted;
  }

  // Invalidate all cache entries with specific dependency
  invalidateByDependency(dependency: string): void {
    const keysToInvalidate = this.dependencyMap.get(dependency);
    
    if (keysToInvalidate) {
      console.log(`📦 Cache INVALIDATE by dependency: ${dependency} (${keysToInvalidate.size} entries)`);
      
      keysToInvalidate.forEach(key => {
        this.delete(key);
      });
      
      // Save after invalidation
      this.saveToLocalStorage();
    }
  }

  // Invalidate multiple dependencies at once
  invalidateByDependencies(dependencies: string[]): void {
    dependencies.forEach(dep => this.invalidateByDependency(dep));
  }

  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`📦 Cache CLEANUP: Removed ${cleanedCount} expired entries`);
    }
  }

  // Clear all cache
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.dependencyMap.clear();
    console.log(`📦 Cache CLEAR: Removed ${size} entries`);
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let expired = 0;
    let valid = 0;

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      expired,
      dependencies: this.dependencyMap.size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  // Estimate memory usage (approximate)
  private estimateMemoryUsage(): number {
    let size = 0;
    for (const [key, entry] of this.cache.entries()) {
      size += key.length * 2; // UTF-16
      size += JSON.stringify(entry.data).length * 2;
      size += entry.dependencies.join(',').length * 2;
      size += 24; // timestamp, ttl overhead
    }
    return size;
  }

  // Phase 3: Enhanced preload with actual data fetching
  async preload(userId: string, eventIds: string[] = []): Promise<void> {
    console.log(`📦 Cache PRELOAD for user: ${userId} (${eventIds.length} events)`);
    
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Preload recent direct messages
      const directMsgKey = `messages-${userId}-direct-all`;
      if (!this.isPreloading(directMsgKey) && !this.has(directMsgKey)) {
        this.set(`__preloading_${directMsgKey}`, true, [], 30000);
        
        const { data: directMessages } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
          .eq('message_type', 'direct')
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (directMessages) {
          this.set(directMsgKey, directMessages, [`user-${userId}`], 120000); // 2 min TTL
        }
        this.delete(`__preloading_${directMsgKey}`);
      }
      
      // Preload notifications
      const notifKey = `notifications-${userId}-all-all`;
      if (!this.isPreloading(notifKey) && !this.has(notifKey)) {
        this.set(`__preloading_${notifKey}`, true, [], 30000);
        
        const { data: notifications } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (notifications) {
          this.set(notifKey, notifications, [`user-${userId}`], 120000);
        }
        this.delete(`__preloading_${notifKey}`);
      }
      
      // Preload event messages for active events (background)
      if (eventIds.length > 0) {
        const eventPromises = eventIds.slice(0, 5).map(async (eventId) => {
          const eventKey = `messages-${userId}-${eventId}-activity`;
          if (!this.isPreloading(eventKey) && !this.has(eventKey)) {
            this.set(`__preloading_${eventKey}`, true, [], 30000);
            
            const { data: eventMessages } = await supabase
              .from('messages')
              .select('*')
              .eq('event_id', eventId)
              .eq('message_type', 'event')
              .order('created_at', { ascending: false })
              .limit(30);
            
            if (eventMessages) {
              this.set(eventKey, eventMessages, [`event-${eventId}`], 180000); // 3 min TTL
            }
            this.delete(`__preloading_${eventKey}`);
          }
        });
        
        // Fire and forget - don't await
        Promise.all(eventPromises).catch(err => 
          console.warn('📦 Event message preload failed:', err)
        );
      }
      
      console.log(`📦 Cache PRELOAD complete for user: ${userId}`);
    } catch (error) {
      console.warn('📦 Cache PRELOAD error:', error);
    }
  }

  // Check if currently preloading
  isPreloading(key: string): boolean {
    return this.has(`__preloading_${key}`);
  }
  
  // Phase 3: Get performance metrics
  getPerformanceMetrics() {
    const stats = this.getStats();
    let totalHits = 0;
    let totalMisses = 0;
    
    // Track hits/misses in session storage
    if (typeof sessionStorage !== 'undefined') {
      totalHits = parseInt(sessionStorage.getItem('cache_hits') || '0', 10);
      totalMisses = parseInt(sessionStorage.getItem('cache_misses') || '0', 10);
    }
    
    const hitRate = totalHits + totalMisses > 0 
      ? (totalHits / (totalHits + totalMisses)) * 100 
      : 0;
    
    return {
      ...stats,
      hits: totalHits,
      misses: totalMisses,
      hitRate: hitRate.toFixed(2) + '%',
      avgEntrySize: stats.total > 0 ? (stats.memoryUsage / stats.total).toFixed(0) + ' bytes' : '0 bytes'
    };
  }
  
  // Track cache hit
  private trackHit() {
    if (typeof sessionStorage !== 'undefined') {
      const hits = parseInt(sessionStorage.getItem('cache_hits') || '0', 10);
      sessionStorage.setItem('cache_hits', String(hits + 1));
    }
  }
  
  // Track cache miss
  private trackMiss() {
    if (typeof sessionStorage !== 'undefined') {
      const misses = parseInt(sessionStorage.getItem('cache_misses') || '0', 10);
      sessionStorage.setItem('cache_misses', String(misses + 1));
    }
  }
}