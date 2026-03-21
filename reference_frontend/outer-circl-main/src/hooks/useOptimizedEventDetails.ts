import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeLocalStorage } from '@/utils/safeStorage';

export interface OptimizedEventDetails {
  event: {
    id: string;
    title: string;
    description: string;
    location: string;
    meetup_spot?: string;
    date: string;
    time: string;
    duration?: string;
    max_attendees: number;
    category: string;
    categories: string[];
    image_url: string;
    coordinates?: [number, number];
    status: string;
    created_at: string;
    host_id: string;
    host: {
      id: string;
      name: string;
      username?: string;
      avatar_url: string;
      bio?: string;
    };
  };
  participants: Array<{
    id: string;
    name: string;
    username?: string;
    avatar: string;
    joined_at: string;
    status: string;
  }>;
  messages: Array<{
    id: string;
    content: string;
    created_at: string;
    user: {
      id: string;
      name: string;
      avatar: string;
    };
  }>;
  userStatus: {
    isAttending: boolean;
    isSaved: boolean;
    isHost: boolean;
  };
  participantCount: number;
  isLoading: boolean;
  error: string | null;
  isCached: boolean;
  cacheAge?: number;
}

interface CacheEntry {
  data: OptimizedEventDetails;
  timestamp: number;
  eventId: string;
  userId: string;
}

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes fresh cache
const CACHE_KEY = 'event_details_cache';

export const useOptimizedEventDetails = (eventId: string | undefined, userId?: string) => {
  const [data, setData] = useState<OptimizedEventDetails>({
    event: {} as any,
    participants: [],
    messages: [],
    userStatus: { isAttending: false, isSaved: false, isHost: false },
    participantCount: 0,
    isLoading: true,
    error: null,
    isCached: false,
    cacheAge: undefined
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  // Cache operations
  const getCacheKey = (eventId: string, userId?: string) => `${eventId}_${userId || 'anon'}`;
  
  const getFromCache = (eventId: string, userId?: string): { data: OptimizedEventDetails; age: number } | null => {
    const key = getCacheKey(eventId, userId);
    const cached = cacheRef.current.get(key);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('📦 Event details cache hit');
      return { 
        data: { ...cached.data, isCached: true, cacheAge: Date.now() - cached.timestamp }, 
        age: Date.now() - cached.timestamp 
      };
    }
    
    // Try localStorage as fallback
    try {
      const stored = safeLocalStorage.getItem(`${CACHE_KEY}_${key}`);
      if (stored) {
        const parsed: CacheEntry = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < CACHE_DURATION) {
          cacheRef.current.set(key, parsed);
          const age = Date.now() - parsed.timestamp;
          return { 
            data: { ...parsed.data, isCached: true, cacheAge: age }, 
            age 
          };
        }
      }
    } catch (error) {
      console.warn('Event details cache read error:', error);
    }
    
    return null;
  };

  const setToCache = (eventId: string, userId: string | undefined, data: OptimizedEventDetails) => {
    const key = getCacheKey(eventId, userId);
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      eventId,
      userId: userId || 'anon'
    };
    
    cacheRef.current.set(key, entry);
    
    try {
      safeLocalStorage.setItem(`${CACHE_KEY}_${key}`, JSON.stringify(entry));
      console.log('📦 Event details cached');
    } catch (error) {
      console.warn('Event details cache write error:', error);
    }
  };

  // Optimized single-query fetch using new database function
  const fetchEventDetails = useCallback(async (eventId: string, userId?: string, retryCount = 0): Promise<void> => {
    // Check cache first for fresh data
    const cached = getFromCache(eventId, userId);
    if (cached && retryCount === 0) {
      setData(cached.data);
      return;
    }

    setData(prev => ({ ...prev, isLoading: true, error: null }));

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      console.log(`🔄 Fetching event details (attempt ${retryCount + 1}):`, eventId);
      
      const { data: result, error } = await supabase
        .rpc('get_event_details_optimized', {
          p_event_id: eventId,
          p_user_id: userId || null
        })
        .abortSignal(controller.signal);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      if (controller.signal.aborted) return;

      if (!result) {
        throw new Error('Event not found');
      }

      console.log('✅ Event details fetched successfully');

      // Transform the response to match the expected format
      const eventResult = result as any; // Type assertion for RPC result
      const transformedData: OptimizedEventDetails = {
        event: {
          ...eventResult.event,
          categories: eventResult.event?.category ? [eventResult.event.category] : ['other']
        },
        participants: eventResult.participants || [],
        messages: eventResult.messages || [],
        userStatus: eventResult.userStatus || { isAttending: false, isSaved: false, isHost: false },
        participantCount: eventResult.participantCount || 0,
        isLoading: false,
        error: null,
        isCached: false,
        cacheAge: 0
      };

      setData(transformedData);
      setToCache(eventId, userId, transformedData);

    } catch (error: any) {
      if (error.name === 'AbortError' || controller.signal.aborted) {
        return;
      }

      console.error('❌ Event details fetch error:', error);
      
      // Categorize error types
      const isNetworkError = !navigator.onLine || 
                           error.message?.includes('fetch') || 
                           error.message?.includes('network') ||
                           error.code === 'PGRST301';
      
      const isPermissionError = error.message?.includes('Access denied') || 
                              error.message?.includes('permission') ||
                              error.code === 'PGRST116';
      
      const isNotFoundError = error.message?.includes('Event not found') ||
                            error.code === 'PGRST116';

      // Handle different error types
      if (isNetworkError && retryCount < 2) {
        // Retry with exponential backoff for network errors
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`🔄 Retrying in ${delay}ms due to network error`);
        
        setTimeout(() => {
          fetchEventDetails(eventId, userId, retryCount + 1);
        }, delay);
        return;
      }

      // Try stale cache for network errors as last resort
      if (isNetworkError) {
        const staleKey = getCacheKey(eventId, userId);
        try {
          const stored = safeLocalStorage.getItem(`${CACHE_KEY}_${staleKey}`);
          if (stored) {
            const parsed: CacheEntry = JSON.parse(stored);
            console.log('📦 Using stale cached data due to network error');
            
            const staleData = {
              ...parsed.data,
              isLoading: false,
              error: null,
              isCached: true,
              cacheAge: Date.now() - parsed.timestamp
            };
            
            setData(staleData);
            toast.info('Using cached data due to network error. Pull to refresh for latest.');
            return;
          }
        } catch (cacheError) {
          console.warn('Failed to load stale cache:', cacheError);
        }
      }

      // Set error state for non-recoverable errors
      const errorMessage = isPermissionError 
        ? 'You do not have permission to view this event'
        : isNotFoundError 
        ? 'Event not found'
        : isNetworkError 
        ? 'Network error - please check your connection'
        : error.message || 'Failed to load event details';
      
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
      
      // Only show toast for non-permission errors (permission errors are expected)
      if (!isPermissionError) {
        toast.error(errorMessage);
      }
    }
  }, []);

  // Update attendance status with optimistic update
  const updateAttendance = useCallback(async (eventId: string, isAttending: boolean) => {
    if (!userId) return;

    // Optimistic update
    setData(prev => ({
      ...prev,
      userStatus: { ...prev.userStatus, isAttending },
      participantCount: isAttending 
        ? prev.participantCount + 1 
        : Math.max(0, prev.participantCount - 1)
    }));

    try {
      if (isAttending) {
        await supabase
          .from('event_participants')
          .insert({
            event_id: eventId,
            user_id: userId,
            status: 'attending'
          });
      } else {
        await supabase
          .from('event_participants')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', userId);
      }

      // Refresh data to get updated participant list
      await fetchEventDetails(eventId, userId, 0);
    } catch (error) {
      console.error('Update attendance error:', error);
      // Revert optimistic update
      setData(prev => ({
        ...prev,
        userStatus: { ...prev.userStatus, isAttending: !isAttending },
        participantCount: !isAttending 
          ? prev.participantCount + 1 
          : Math.max(0, prev.participantCount - 1)
      }));
      toast.error('Failed to update attendance');
    }
  }, [userId, fetchEventDetails]);

  // Update saved status with optimistic update
  const updateSavedStatus = useCallback(async (eventId: string, isSaved: boolean) => {
    if (!userId) return;

    // Optimistic update
    setData(prev => ({
      ...prev,
      userStatus: { ...prev.userStatus, isSaved }
    }));

    try {
      if (isSaved) {
        await supabase
          .from('saved_events')
          .insert({
            event_id: eventId,
            user_id: userId
          });
      } else {
        await supabase
          .from('saved_events')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('Update saved status error:', error);
      // Revert optimistic update
      setData(prev => ({
        ...prev,
        userStatus: { ...prev.userStatus, isSaved: !isSaved }
      }));
      toast.error('Failed to update saved status');
    }
  }, [userId]);

  // Add message with optimistic update
  const addMessage = useCallback(async (eventId: string, content: string) => {
    if (!userId) return;

    // Get current user info for optimistic update
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, avatar_url')
      .eq('id', userId)
      .single();

    const tempMessage = {
      id: `temp_${Date.now()}`,
      content,
      created_at: new Date().toISOString(),
      user: {
        id: userId,
        name: profile?.name || 'You',
        avatar: profile?.avatar_url || 'https://randomuser.me/api/portraits/women/44.jpg'
      }
    };

    // Optimistic update
    setData(prev => ({
      ...prev,
      messages: [tempMessage, ...prev.messages]
    }));

    try {
      await supabase
        .from('messages')
        .insert({
          event_id: eventId,
          sender_id: userId,
          content,
          message_type: 'event'
        });

      // Refresh messages to get the real message with proper ID
      await fetchEventDetails(eventId, userId, 0);
    } catch (error) {
      console.error('Add message error:', error);
      // Remove optimistic message
      setData(prev => ({
        ...prev,
        messages: prev.messages.filter(m => m.id !== tempMessage.id)
      }));
      toast.error('Failed to send message');
    }
  }, [userId, fetchEventDetails]);

  // Refetch function
  const refetch = useCallback(async () => {
    if (eventId) {
      // Clear cache for this event
      const key = getCacheKey(eventId, userId);
      cacheRef.current.delete(key);
      safeLocalStorage.removeItem(`${CACHE_KEY}_${key}`);
      
      await fetchEventDetails(eventId, userId, 0);
    }
  }, [eventId, userId, fetchEventDetails]);

  // Initialize
  useEffect(() => {
    if (eventId) {
      fetchEventDetails(eventId, userId, 0);
    }
  }, [eventId, userId, fetchEventDetails]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...data,
    updateAttendance,
    updateSavedStatus,
    addMessage,
    refetch
  };
};