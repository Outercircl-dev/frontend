import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { dashboardPerf, DASHBOARD_TIMEOUTS, isSlowOperation } from '@/utils/dashboardPerformance';

export interface EventData {
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

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache

export const useDashboard = (userId: string | undefined) => {
  const [events, setEvents] = useState<EventData[]>([]);
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<{ data: EventData[]; timestamp: number } | null>(null);
  const hasInitializedRef = useRef<string | null>(null);


  // Cache operations
  const cacheOperations = {
    get: () => {
      if (cacheRef.current && Date.now() - cacheRef.current.timestamp < CACHE_DURATION) {
        console.log('📦 Dashboard cache hit');
        return cacheRef.current.data;
      }
      return null;
    },
    
    set: (data: EventData[]) => {
      cacheRef.current = {
        data,
        timestamp: Date.now()
      };
      console.log('📦 Dashboard cached', data.length, 'events');
    },
    
    clear: () => {
      cacheRef.current = null;
      console.log('📦 Dashboard cache cleared');
    }
  };

  // Load saved events
  useEffect(() => {
    if (!userId) return;
    
    const fetchSavedEvents = async () => {
      try {
        const { data } = await supabase
          .from('saved_events')
          .select('event_id')
          .eq('user_id', userId);
        
        const savedIds = data?.map(item => item.event_id) || [];
        setSavedEventIds(savedIds);
        console.log('📌 Loaded saved events:', savedIds.length);
      } catch (error) {
        console.error('Error fetching saved events:', error);
      }
    };
    
    fetchSavedEvents();
  }, [userId]);

  // Main data fetching function
  const fetchEvents = useCallback(async (useCache = true): Promise<void> => {
    if (!userId) {
      setIsLoading(false);
      setEvents([]);
      return;
    }

    console.log('📊 Dashboard: Fetching events for user', userId);
    
    try {
      // Check cache first
      if (useCache) {
        const cachedEvents = cacheOperations.get();
        if (cachedEvents) {
          setEvents(cachedEvents);
          setIsLoading(false);
          setError(null);
          console.log('⚡ Dashboard: Loaded from cache');
          return;
        }
      }

      setError(null);
      setIsLoading(true);

      // Cancel previous request only if we're making a new one
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const today = new Date().toISOString().split('T')[0];
      
      // Single optimized query with timeout
      const timeoutId = setTimeout(() => {
        if (!controller.signal.aborted) {
          controller.abort();
          console.warn('⏱️ Request timeout, aborting...');
        }
      }, 15000); // 15 second timeout

      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          id, title, description, image_url, date, time, location, 
          max_attendees, category, host_id, duration, coordinates
        `)
        .eq('status', 'active')
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(30)
        .abortSignal(controller.signal);

      console.log('📊 Dashboard: Events fetched:', eventsData?.length || 0);

      clearTimeout(timeoutId);

      if (controller.signal.aborted) {
        console.log('📊 Request was aborted');
        return;
      }

      if (eventsError) throw eventsError;

      const rawEvents = eventsData || [];
      console.log('📊 Dashboard: Raw events fetched:', rawEvents.length);
      console.log('📊 Raw events data:', rawEvents);

      // Get host profiles for all events at once
      const hostIds = [...new Set(rawEvents.map(event => event.host_id))];
      const profilesPromise = hostIds.length > 0 ? supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', hostIds)
        .abortSignal(controller.signal) : Promise.resolve({ data: [] });

      // Get participation data for current user
      const eventIds = rawEvents.map(e => e.id);
      const participantsPromise = eventIds.length > 0 ? supabase
        .from('event_participants')
        .select('event_id, status')
        .eq('user_id', userId)
        .in('event_id', eventIds)
        .abortSignal(controller.signal) : Promise.resolve({ data: [] });

      const [profilesResult, participantsResult] = await Promise.allSettled([
        profilesPromise,
        participantsPromise
      ]);

      if (controller.signal.aborted) {
        console.log('📊 Request was aborted during profile fetch');
        return;
      }

      // Process results safely
      const profiles = profilesResult.status === 'fulfilled' ? profilesResult.value.data : [];
      const participants = participantsResult.status === 'fulfilled' ? participantsResult.value.data : [];

      // Create lookup maps for efficiency
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const participantMap = new Map(participants?.map(p => [p.event_id, p.status]) || []);

      // Transform events with all data
      const transformedEvents: EventData[] = rawEvents.map(event => {
        const hostProfile = profileMap.get(event.host_id);
        const userParticipation = participantMap.get(event.id);
        
        return {
          id: event.id,
          title: event.title || 'Untitled Event',
          description: event.description || '',
          imageUrl: event.image_url || '/placeholder.svg',
          date: event.date,
          time: event.time || '00:00',
          location: event.location || 'TBD',
          attendees: 0, // Will be updated with actual counts
          maxAttendees: event.max_attendees || 4,
          categories: event.category ? [event.category] : ['other'],
          host: {
            name: hostProfile?.name || 'Unknown Host',
            avatar: hostProfile?.avatar_url || 'https://randomuser.me/api/portraits/women/44.jpg',
          },
          hostId: event.host_id,
          isPinned: false, // Will be updated separately
          isAttending: event.host_id === userId || userParticipation === 'attending',
          isSaved: savedEventIds.includes(event.id),
          duration: event.duration,
          coordinates: Array.isArray(event.coordinates) ? event.coordinates as [number, number] : undefined
        };
      });

      // Cache and set events
      cacheOperations.set(transformedEvents);
      setEvents(transformedEvents);
      console.log('📊 Dashboard: Final transformed events:', transformedEvents.length);
      console.log('📊 Transformed events data:', transformedEvents);
      setIsLoading(false);
      setError(null);

      console.log('✅ Dashboard: Events loaded successfully');

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('❌ Dashboard: Fetch error:', error);
        setError('Failed to load events');
        setIsLoading(false);
        toast.error('Failed to load events');
      } else {
        console.log('📊 Fetch was aborted normally');
      }
    } finally {
      // Clean up the controller reference
      if (abortControllerRef.current?.signal.aborted) {
        abortControllerRef.current = null;
      }
    }
  }, [userId, savedEventIds]);

  // Background participant count loading
  const loadParticipantCounts = useCallback(async (events: EventData[], signal: AbortSignal) => {
    try {
      const eventIds = events.map(e => e.id);
      
      const { data: participants } = await supabase
        .from('event_participants')
        .select('event_id')
        .in('event_id', eventIds)
        .eq('status', 'attending')
        .abortSignal(signal);

      if (signal.aborted || !participants) return;

      // Count participants per event
      const counts = participants.reduce((acc, p) => {
        acc[p.event_id] = (acc[p.event_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Update attendee counts - use actual participant count from DB (host already included via trigger)
      setEvents(prevEvents => 
        prevEvents.map(event => ({
          ...event,
          attendees: counts[event.id] || 0 // Use actual participant count
        }))
      );

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.warn('⚠️ Failed to load participant counts:', error);
      }
    }
  }, []);

  // Refresh function
  const refreshEvents = useCallback(async () => {
    console.log('🔄 Dashboard: Manual refresh triggered');
    cacheOperations.clear();
    await fetchEvents(false);
  }, [fetchEvents]);

  // Initialize data loading
  useEffect(() => {
    console.log('📊 useDashboard: useEffect called', { 
      hasUserId: !!userId, 
      userId,
      hasInitialized: hasInitializedRef.current,
    });
    
    if (!userId) {
      console.log('📊 useDashboard: No userId, skipping');
      return;
    }
    
    // Only initialize if we haven't for this user yet, but allow re-fetch if needed
    if (hasInitializedRef.current !== userId) {
      hasInitializedRef.current = userId;
      console.log('🚀 Dashboard: First-time initialization for user', userId);
      setIsLoading(true);
      fetchEvents(true);
    } else if (events.length === 0 && !isLoading) {
      // If we have a user but no events and not currently loading, fetch them
      console.log('🚀 Dashboard: Re-fetching events (no events found)');
      setIsLoading(true);
      fetchEvents(true);
    }
  }, [userId, fetchEvents, events.length, isLoading]);

  // Update saved status when saved events change
  useEffect(() => {
    setEvents(prevEvents => 
      prevEvents.map(event => ({
        ...event,
        isSaved: savedEventIds.includes(event.id)
      }))
    );
  }, [savedEventIds]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    events,
    setEvents,
    savedEventIds,
    setSavedEventIds,
    isLoading,
    error,
    refreshEvents,
    // Additional computed properties for compatibility
    hasMore: false,
    loadMore: () => {},
    pinnedEventIds: [], // Legacy compatibility
    setPinnedEventIds: () => {}
  };
};