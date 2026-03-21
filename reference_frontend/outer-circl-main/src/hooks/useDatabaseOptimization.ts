import React, { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { trackDatabaseQuery } from '@/utils/performanceUtils';

interface QueryCache {
  [key: string]: {
    data: any;
    timestamp: number;
    ttl: number;
  };
}

interface DatabaseOptimizationConfig {
  enableQueryCache: boolean;
  enableRealTimeUpdates: boolean;
  enableBatchingQueries: boolean;
  cacheExpiration: number;
}

export const useDatabaseOptimization = (config: Partial<DatabaseOptimizationConfig> = {}) => {
  const defaultConfig: DatabaseOptimizationConfig = {
    enableQueryCache: true,
    enableRealTimeUpdates: true,
    enableBatchingQueries: true,
    cacheExpiration: 5 * 60 * 1000, // 5 minutes
  };

  const optimizationConfig = { ...defaultConfig, ...config };
  const queryCache = useRef<QueryCache>({});
  const batchedQueries = useRef<Map<string, Promise<any>>>(new Map());

  // Optimized query execution with caching
  const executeOptimizedQuery = useCallback(async (
    queryKey: string,
    queryFn: () => Promise<any>,
    options: { ttl?: number; enableCache?: boolean } = {}
  ) => {
    const { ttl = optimizationConfig.cacheExpiration, enableCache = optimizationConfig.enableQueryCache } = options;
    
    // Check cache first
    if (enableCache && queryCache.current[queryKey]) {
      const cached = queryCache.current[queryKey];
      if (Date.now() - cached.timestamp < cached.ttl) {
        console.log(`📋 Cache hit for query: ${queryKey}`);
        return cached.data;
      }
    }

    // Check if query is already in flight (deduplication)
    if (batchedQueries.current.has(queryKey)) {
      console.log(`🔄 Deduplicating query: ${queryKey}`);
      return batchedQueries.current.get(queryKey);
    }

    // Execute query with performance tracking
    const tracker = trackDatabaseQuery(queryKey);
    const queryPromise = queryFn();
    
    if (optimizationConfig.enableBatchingQueries) {
      batchedQueries.current.set(queryKey, queryPromise);
    }

    try {
      const result = await queryPromise;
      tracker.end();

      // Cache successful results
      if (enableCache && result && !result.error) {
        queryCache.current[queryKey] = {
          data: result,
          timestamp: Date.now(),
          ttl,
        };
      }

      return result;
    } catch (error) {
      tracker.end();
      throw error;
    } finally {
      batchedQueries.current.delete(queryKey);
    }
  }, [optimizationConfig]);

  // Real-time subscription with optimization
  const subscribeToRealTimeUpdates = useCallback((
    table: string,
    callback: (payload: any) => void,
    filters?: { event?: 'INSERT' | 'UPDATE' | 'DELETE'; filter?: string }
  ) => {
    if (!optimizationConfig.enableRealTimeUpdates) {
      return () => {};
    }

    console.log(`🔴 Setting up real-time subscription for: ${table}`);
    
    const channel = supabase
      .channel(`realtime-${table}`)
      .on(
        'postgres_changes' as any,
        {
          event: filters?.event || '*',
          schema: 'public',
          table,
          filter: filters?.filter,
        },
        (payload) => {
          console.log(`📡 Real-time update for ${table}:`, payload);
          
          // Invalidate cache for affected queries
          Object.keys(queryCache.current).forEach(key => {
            if (key.includes(table)) {
              delete queryCache.current[key];
            }
          });
          
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      console.log(`🔴 Unsubscribing from real-time updates for: ${table}`);
      supabase.removeChannel(channel);
    };
  }, [optimizationConfig.enableRealTimeUpdates]);

  // Batch multiple queries for efficient execution
  const executeBatchQueries = useCallback(async (queries: Array<{ key: string; fn: () => Promise<any> }>) => {
    if (!optimizationConfig.enableBatchingQueries) {
      return Promise.all(queries.map(q => q.fn()));
    }

    console.log(`📦 Executing batch of ${queries.length} queries`);
    const tracker = trackDatabaseQuery(`batch-${queries.length}-queries`);
    
    try {
      const results = await Promise.allSettled(
        queries.map(query => executeOptimizedQuery(query.key, query.fn))
      );
      
      tracker.end();
      return results;
    } catch (error) {
      tracker.end();
      throw error;
    }
  }, [optimizationConfig.enableBatchingQueries, executeOptimizedQuery]);

  // Cache management
  const clearCache = useCallback((pattern?: string) => {
    if (pattern) {
      Object.keys(queryCache.current).forEach(key => {
        if (key.includes(pattern)) {
          delete queryCache.current[key];
        }
      });
    } else {
      queryCache.current = {};
    }
    console.log(`🗑️ Cache cleared${pattern ? ` for pattern: ${pattern}` : ''}`);
  }, []);

  const getCacheStats = useCallback(() => {
    const keys = Object.keys(queryCache.current);
    const totalSize = keys.length;
    const validEntries = keys.filter(key => {
      const entry = queryCache.current[key];
      return Date.now() - entry.timestamp < entry.ttl;
    }).length;

    return {
      totalSize,
      validEntries,
      hitRate: validEntries / Math.max(totalSize, 1),
    };
  }, []);

  // Cleanup expired cache entries
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      Object.keys(queryCache.current).forEach(key => {
        const entry = queryCache.current[key];
        if (now - entry.timestamp > entry.ttl) {
          delete queryCache.current[key];
        }
      });
    }, 60000); // Clean up every minute

    return () => clearInterval(cleanup);
  }, []);

  return {
    executeOptimizedQuery,
    subscribeToRealTimeUpdates,
    executeBatchQueries,
    clearCache,
    getCacheStats,
    config: optimizationConfig,
  };
};

// Hook for optimized event queries with real-time updates
export const useOptimizedEventQueries = () => {
  const { executeOptimizedQuery, subscribeToRealTimeUpdates } = useDatabaseOptimization();

  const getEvents = useCallback((filters: any = {}) => {
    const queryKey = `events-${JSON.stringify(filters)}`;
    return executeOptimizedQuery(queryKey, async () => {
      const query = supabase.from('events').select('*');
      
      if (filters.category) query.eq('category', filters.category);
      if (filters.date) query.gte('event_date', filters.date);
      if (filters.location) query.ilike('location', `%${filters.location}%`);
      
      return query;
    });
  }, [executeOptimizedQuery]);

  const subscribeToEventUpdates = useCallback((callback: (payload: any) => void) => {
    return subscribeToRealTimeUpdates('activities', callback);
  }, [subscribeToRealTimeUpdates]);

  return {
    getEvents,
    subscribeToEventUpdates,
  };
};