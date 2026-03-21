import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { performanceTracker } from '@/utils/performanceOptimizations';
import { safeLocalStorage } from '@/utils/safeStorage';

export interface UnifiedEventData {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  date: string;
  time: string;
  location: string;
  attendees: number;
  maxAttendees: number;
  categories: string[];
  host: {
    name: string;
    avatar: string;
  };
  hostId: string;
  isPinned: boolean;
  isAttending: boolean;
  isSaved: boolean;
  duration?: string;
  coordinates?: [number, number];
}

interface CacheEntry {
  data: UnifiedEventData[];
  savedEventIds: string[];
  timestamp: number;
  userId: string;
}

const CACHE_KEY = 'unified_dashboard_cache';
const PRELOAD_CACHE_KEY = 'dashboard_preload_cache';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const STALE_DURATION = 30 * 60 * 1000; // 30 minutes stale-while-revalidate
const LOCALSTORAGE_DURATION = 60 * 60 * 1000; // 1 hour for localStorage persistence

export const useUnifiedDashboard = (userId: string | undefined) => {
  // Phase 7: Synchronous cache check for instant loading
  const getInitialCache = (): CacheEntry | null => {
    if (!userId) return null;
    
    try {
      // Check preload cache first
      const preloadCached = sessionStorage.getItem(PRELOAD_CACHE_KEY);
      if (preloadCached) {
        const parsed = JSON.parse(preloadCached);
        const age = Date.now() - parsed.timestamp;
        if (age < STALE_DURATION && parsed.data) {
          return {
            data: parsed.data.events || [],
            savedEventIds: parsed.data.saved_event_ids || [],
            timestamp: parsed.timestamp,
            userId: userId
          };
        }
      }

      // Check sessionStorage
      const sessionCached = sessionStorage.getItem(`${CACHE_KEY}_${userId}`);
      if (sessionCached) {
        const parsed = JSON.parse(sessionCached);
        const age = Date.now() - parsed.timestamp;
        if (age < STALE_DURATION) {
          return parsed;
        }
      }

      // Check localStorage
      const localCached = safeLocalStorage.getItem(`${CACHE_KEY}_${userId}`);
      if (localCached) {
        const parsed = JSON.parse(localCached);
        const age = Date.now() - parsed.timestamp;
        if (age < LOCALSTORAGE_DURATION) {
          return parsed;
        }
      }
    } catch (error) {
      console.warn('Initial cache check failed:', error);
    }
    
    return null;
  };

  const initialCache = getInitialCache();
  
  const [events, setEvents] = useState<UnifiedEventData[]>(initialCache?.data || []);
  const [savedEventIds, setSavedEventIds] = useState<string[]>(initialCache?.savedEventIds || []);
  const [isLoading, setIsLoading] = useState(false);
  // CRITICAL FIX: Set isInitialLoading to false if we have cached data
  const [isInitialLoading, setIsInitialLoading] = useState(
    !(initialCache && initialCache.data.length > 0)
  );
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestInFlightRef = useRef(false);
  const cacheRef = useRef<CacheEntry | null>(initialCache);
  const userIdRef = useRef(userId);
  
  // Update userIdRef when userId changes
  userIdRef.current = userId;

  // Phase 8: Enhanced load state logging
  useEffect(() => {
    console.log('🚀 Initial Load State:', {
      hasCache: !!(initialCache && initialCache.data.length > 0),
      isInitialLoading,
      cacheAge: initialCache ? Date.now() - initialCache.timestamp : null
    });
    
    if (initialCache) {
      console.log('⚡ INSTANT LOAD: Dashboard initialized with cached data', {
        eventCount: initialCache.data.length,
        cacheAge: Date.now() - initialCache.timestamp,
        userId: userId?.substring(0, 8)
      });
    }
  }, []);

  // Circuit breaker: Force loading to complete after timeout (REMOVED IN PHASE 3)
  // Trust the architecture - no defensive timeouts needed

  // Enhanced cache operations with multi-layer caching
  const cacheOperations = {
    get: (): CacheEntry | null => {
      try {
        // Memory cache first (fastest)
        if (cacheRef.current?.userId === userId) {
          const age = Date.now() - cacheRef.current.timestamp;
          if (age < STALE_DURATION) {
            return cacheRef.current;
          }
        }

        // Check preload cache from auth provider (Phase 2 optimization)
        const preloadCached = sessionStorage.getItem(PRELOAD_CACHE_KEY);
        if (preloadCached) {
          try {
            const parsed = JSON.parse(preloadCached);
            const age = Date.now() - parsed.timestamp;
            if (age < STALE_DURATION && parsed.data) {
              console.log('⚡ PHASE 2: Using preloaded cache from auth');
              const entry: CacheEntry = {
                data: parsed.data.events || [],
                savedEventIds: parsed.data.saved_event_ids || [],
                timestamp: parsed.timestamp,
                userId: userId
              };
              cacheRef.current = entry;
              return entry;
            }
          } catch (e) {
            console.warn('Preload cache parse error:', e);
          }
        }

        // Try sessionStorage
        const sessionCached = sessionStorage.getItem(`${CACHE_KEY}_${userId}`);
        if (sessionCached) {
          const parsed = JSON.parse(sessionCached);
          const age = Date.now() - parsed.timestamp;
          if (age < STALE_DURATION) {
            console.log('⚡ Using sessionStorage cache');
            cacheRef.current = parsed;
            return parsed;
          } else {
            sessionStorage.removeItem(`${CACHE_KEY}_${userId}`);
          }
        }

        // Try localStorage for longer persistence (Phase 2 optimization)
        const localCached = safeLocalStorage.getItem(`${CACHE_KEY}_${userId}`);
        if (localCached) {
          const parsed = JSON.parse(localCached);
          const age = Date.now() - parsed.timestamp;
          if (age < LOCALSTORAGE_DURATION) {
            console.log('⚡ PHASE 2: Using localStorage cache for persistent load');
            cacheRef.current = parsed;
            return parsed;
          } else {
            safeLocalStorage.removeItem(`${CACHE_KEY}_${userId}`);
          }
        }

        return null;
      } catch (error) {
        console.warn('Cache read error:', error);
        return null;
      }
    },

    set: (data: UnifiedEventData[], savedIds: string[]) => {
      if (!userId) return;
      
      const entry: CacheEntry = {
        data,
        savedEventIds: savedIds,
        timestamp: Date.now(),
        userId
      };

      // Store in memory, sessionStorage AND localStorage (Phase 2)
      cacheRef.current = entry;
      
      try {
        sessionStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify(entry));
        safeLocalStorage.setItem(`${CACHE_KEY}_${userId}`, JSON.stringify(entry));
      } catch (error) {
        console.warn('Cache write failed:', error);
      }
    },

    isStale: (entry: CacheEntry): boolean => {
      return Date.now() - entry.timestamp > CACHE_DURATION;
    },

    clear: () => {
      cacheRef.current = null;
      try {
        if (userId) {
          sessionStorage.removeItem(`${CACHE_KEY}_${userId}`);
          safeLocalStorage.removeItem(`${CACHE_KEY}_${userId}`);
        }
      } catch (error) {
        console.warn('Cache clear failed:', error);
      }
    },

    // Phase 2: Warm cache method for proactive loading
    warmCache: async (userId: string) => {
      if (!userId) return;
      
      try {
        console.log('🔥 PHASE 2: Warming cache proactively');
        const { data, error } = await supabase.rpc('get_dashboard_data_optimized', {
          p_user_id: userId
        });
        
        if (error || !data) return;
        
        // Transform and cache immediately
        const transformedEvents: UnifiedEventData[] = data.map((item: any) => ({
          id: item.id,
          title: item.title || 'Untitled Event',
          description: item.description || '',
          imageUrl: item.image_url || '/placeholder.svg',
          date: item.date,
          time: item.event_time || '00:00',
          location: item.location || 'TBD',
          attendees: Number(item.attendee_count) || 0,
          maxAttendees: item.max_attendees || 4,
          categories: item.category ? [item.category] : ['other'],
          host: {
            name: item.host_name || 'Unknown Host',
            avatar: item.host_avatar || '/placeholder.svg',
          },
          hostId: item.host_id,
          isPinned: false,
          isAttending: Boolean(item.is_attending),
          isSaved: Boolean(item.is_saved),
          duration: item.duration,
          coordinates: item.coordinates ? [item.coordinates.lat, item.coordinates.lng] : undefined
        }));

        const savedIds = data
          .filter((item: any) => item.is_saved)
          .map((item: any) => item.id);

        cacheOperations.set(transformedEvents, savedIds);
        console.log('✅ Cache warmed successfully');
      } catch (error) {
        console.warn('Cache warming failed (non-critical):', error);
      }
    }
  };

  // Phase 2: Enhanced fetch with preflight mode
  const fetchDashboardData = useCallback(async (useCache = true, showLoading = true, preflight = false) => {
    if (!userId) return;

    // Phase 2: Advanced request deduplication 
    if (requestInFlightRef.current) {
      console.log('⚠️ Request already in flight, skipping duplicate request');
      return;
    }

    console.log('🔄 Dashboard data fetch started', { useCache, showLoading, userId: userId.substring(0, 8) });
    performanceTracker.startTimer('dashboard-unified-fetch');

    try {
      // Check cache first for instant loading
      if (useCache) {
        const cached = cacheOperations.get();
        if (cached && cached.data.length > 0) {
          const cacheAge = Date.now() - cached.timestamp;
          console.log('⚡ Cache hit, loading data instantly', {
            eventCount: cached.data.length,
            cacheAge,
            isFresh: !cacheOperations.isStale(cached)
          });
          
          // Set state immediately with cached data
          setEvents(cached.data);
          setSavedEventIds(cached.savedEventIds);
          setIsLoading(false);
          setIsInitialLoading(false); // CRITICAL: Always set to false when we have cached data
          setError(null);

          // Phase 8: Enhanced cache strategy logging
          if (!cacheOperations.isStale(cached)) {
            console.log('✅ INSTANT LOAD: Using fresh cache, no network request', {
              eventCount: cached.data.length,
              cacheAge
            });
            performanceTracker.endTimer('dashboard-unified-fetch');
            return;
          }
          
          // Cache is stale but valid - show it immediately and refresh in background
          console.log('🔄 HYBRID LOAD: Showing stale cache, refreshing in background', {
            eventCount: cached.data.length,
            cacheAge
          });
          showLoading = false; // Don't show loading spinner for background refresh
          // Continue with fetch below...
        } else {
          // No cached data or empty cache
          console.log('📡 No cached data available, fetching from network');
        }
      }

      requestInFlightRef.current = true;
      
      // Phase 2: Preflight mode doesn't set loading states
      if (!preflight && showLoading) {
        setIsLoading(true);
        setError(null);
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Phase 2: Optimized retry logic with reduced timeout
      const fetchWithRetry = async (attempt = 1): Promise<any> => {
        const maxAttempts = 1; // Single attempt - fail fast
        const timeoutMs = 8000; // OPTIMIZED: 8 seconds for mobile 3G networks (was 5s)
        
        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Database request timeout after ${timeoutMs/1000} seconds`)), timeoutMs);
          });

          const dataPromise = supabase
            .rpc('get_dashboard_data_optimized', { p_user_id: userId })
            .abortSignal(abortControllerRef.current.signal);

          const result = await Promise.race([
            dataPromise,
            timeoutPromise
          ]) as any;

          return result;
        } catch (error: any) {
          // If this is the last attempt or abort error, throw immediately
          if (attempt >= maxAttempts || error.name === 'AbortError') {
            throw error;
          }

          // Exponential backoff: 500ms, 1000ms, 2000ms
          const backoffMs = 500 * Math.pow(2, attempt - 1);
          console.log(`⚠️ Attempt ${attempt} failed, retrying in ${backoffMs}ms...`);
          
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          return fetchWithRetry(attempt + 1);
        }
      };

      const { data: dashboardData, error: fetchError } = await fetchWithRetry();

      if (fetchError) throw fetchError;

      if (!dashboardData || abortControllerRef.current?.signal.aborted) {
        return;
      }

      // Optimized data transformation
      const transformedEvents: UnifiedEventData[] = dashboardData.map((item: any) => ({
        id: item.id,
        title: item.title || 'Untitled Event',
        description: item.description || '',
        imageUrl: item.image_url || '/placeholder.svg',
        date: item.date,
        time: item.event_time || '00:00',
        location: item.location || 'TBD',
        attendees: Number(item.attendee_count) || 0,
        maxAttendees: item.max_attendees || 4,
        categories: item.category ? [item.category] : ['other'],
        host: {
          name: item.host_name || 'Unknown Host',
          avatar: item.host_avatar || '/placeholder.svg',
        },
        hostId: item.host_id,
        isPinned: false,
        isAttending: Boolean(item.is_attending),
        isSaved: Boolean(item.is_saved),
        duration: item.duration,
        coordinates: item.coordinates ? [item.coordinates.lat, item.coordinates.lng] : undefined
      }));

      const savedIds = dashboardData
        .filter((item: any) => item.is_saved)
        .map((item: any) => item.id);

      console.log('✅ Dashboard data processed', { 
        eventCount: transformedEvents.length, 
        savedCount: savedIds.length 
      });

      // Update state (skip if preflight mode)
      if (!preflight) {
        setEvents(transformedEvents);
        setSavedEventIds(savedIds);
        setIsLoading(false);
        setIsInitialLoading(false);
        setError(null);
      }

      // Update cache
      cacheOperations.set(transformedEvents, savedIds);

      performanceTracker.endTimer('dashboard-unified-fetch');

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('❌ Dashboard fetch error:', error);
        setError('Failed to load activities');
        setIsLoading(false);
        setIsInitialLoading(false);
        
        if (showLoading) {
          toast.error('Failed to load activities. Please try again.');
        }
      }
    } finally {
      requestInFlightRef.current = false;
    }
  }, [userId]);

  // Optimized event interaction handlers
  const handleAttendClick = useCallback(async (eventId: string): Promise<void> => {
    if (!userId) return;

    const event = events.find(e => e.id === eventId);
    if (!event) return;

    // Optimistic update
    const optimisticEvents = events.map(e => 
      e.id === eventId 
        ? { 
            ...e, 
            isAttending: !e.isAttending,
            attendees: e.isAttending ? e.attendees - 1 : e.attendees + 1
          }
        : e
    );
    setEvents(optimisticEvents);

    try {
      if (event.isAttending) {
        // Leave event
        await supabase
          .from('event_participants')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', userId);
      } else {
        // Join event
        await supabase
          .from('event_participants')
          .insert({
            event_id: eventId,
            user_id: userId,
            status: 'attending'
          });
      }

      // Update cache with optimistic data
      cacheOperations.set(optimisticEvents, savedEventIds);
      
    } catch (error) {
      console.error('Failed to update attendance:', error);
      // Revert optimistic update
      setEvents(events);
      toast.error('Failed to update attendance. Please try again.');
    }
  }, [events, savedEventIds, userId]);

  const handleSaveClick = useCallback(async (eventId: string, currentlySaved: boolean): Promise<void> => {
    if (!userId) return;

    // Optimistic update
    const optimisticSavedIds = currentlySaved 
      ? savedEventIds.filter(id => id !== eventId)
      : [...savedEventIds, eventId];
    
    const optimisticEvents = events.map(e => 
      e.id === eventId ? { ...e, isSaved: !currentlySaved } : e
    );

    setSavedEventIds(optimisticSavedIds);
    setEvents(optimisticEvents);

    try {
      if (currentlySaved) {
        await supabase
          .from('saved_events')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', userId);
      } else {
        await supabase
          .from('saved_events')
          .insert({
            event_id: eventId,
            user_id: userId
          });
      }

      // Update cache
      cacheOperations.set(optimisticEvents, optimisticSavedIds);

    } catch (error) {
      console.error('Failed to update saved status:', error);
      // Revert optimistic update
      setSavedEventIds(savedEventIds);
      setEvents(events);
      toast.error('Failed to save event. Please try again.');
    }
  }, [events, savedEventIds, userId]);

  // Refresh function
  const refreshEvents = useCallback(async () => {
    cacheOperations.clear();
    await fetchDashboardData(false, true);
  }, [fetchDashboardData]);

  // Phase 7: Initialize data with instant cache loading
  useEffect(() => {
    if (!userId) {
      setEvents([]);
      setSavedEventIds([]);
      setIsLoading(false);
      setIsInitialLoading(false);
      setError(null);
      return;
    }

    console.log('🔄 Dashboard initialization effect triggered', {
      userId: userId.substring(0, 8)
    });

    // Let fetchDashboardData handle all the cache logic
    fetchDashboardData(true, true);

    // Background refresh interval for stale data
    const interval = setInterval(() => {
      const cached = cacheOperations.get();
      if (cached && cacheOperations.isStale(cached)) {
        console.log('⏰ Interval refresh: Cache is stale');
        fetchDashboardData(true, false); // Silent background refresh
      }
    }, 30000); // 30 seconds

    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // Only depend on userId - fetchDashboardData is stable via useCallback with proper deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Phase 5: Smart prefetching for likely user actions
  const prefetchEventDetails = useCallback(async (eventId: string) => {
    // Skip on slow connections or data saver mode
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn?.saveData || conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g') {
        return;
      }
    }

    try {
      const cacheKey = `event_${eventId}`;
      const cached = sessionStorage.getItem(cacheKey);
      
      if (cached) {
        const { timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 5 * 60 * 1000) { // 5 min cache
          return; // Already cached and fresh
        }
      }

      const { data } = await supabase
        .from('events')
        .select('*, profiles!events_host_id_fkey(*), event_participants(count)')
        .eq('id', eventId)
        .single();
      
      if (data) {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data,
          timestamp: Date.now(),
        }));
      }
    } catch (error) {
      console.debug('Prefetch skipped:', error);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    events,
    savedEventIds,
    isLoading,
    isInitialLoading,
    error,
    refreshEvents,
    handleAttendClick,
    handleSaveClick,
    prefetchEventDetails,
    // Direct setters for compatibility
    setEvents,
    setSavedEventIds,
    // Performance metrics
    cacheAge: cacheRef.current ? Date.now() - cacheRef.current.timestamp : 0,
    isCacheStale: cacheRef.current ? cacheOperations.isStale(cacheRef.current) : false,
    // Phase 2: Expose warm cache method
    warmCache: () => userId ? cacheOperations.warmCache(userId) : Promise.resolve(),
  };
};