
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { EventData } from '@/components/ActivityCard';

export const useDashboardData = (userId?: string) => {
  console.log('🔍 useDashboardData: Hook called with userId:', userId);
  const [events, setEvents] = useState<EventData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pinnedEventIds, setPinnedEventIds] = useState<string[]>([]);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasInitializedRef = useRef(false);
  
  console.log('🔍 useDashboardData: Current state', {
    eventsCount: events.length,
    isLoading,
    pinnedCount: pinnedEventIds.length,
    hasInitialized: hasInitializedRef.current
  });

  // Load pinned events from localStorage
  useEffect(() => {
    try {
      const savedEvents = localStorage.getItem('pinnedEvents');
      if (savedEvents) {
        setPinnedEventIds(JSON.parse(savedEvents));
      }
    } catch (error) {
      console.error('Error loading pinned events:', error);
    }
  }, []);

  // Fetch events with proper error handling and mobile safeguards
  const fetchEvents = useCallback(async () => {
    console.log('Fetching events for user:', userId);
    
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Add mobile-specific delays to prevent overwhelming the device
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    if (isMobile) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      console.log('Querying events from date:', today);
      
      // With new security policies, users can only see:
      // 1. Events they're hosting
      // 2. Events they're participating in  
      // 3. Public events for discovery (limited info)
      
      const { data: eventsData, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'active')
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(50) // Increased limit since we're now showing fewer events per user
        .abortSignal(signal);

      if (error) throw error;

      if (!eventsData || signal.aborted) {
        console.log('No events data or request aborted');
        return;
      }

      console.log('Found events:', eventsData.length);

      // Get host profiles
      const hostIds = eventsData.map(event => event.host_id);
      const { data: hostProfiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', hostIds);

      // Transform events
      const transformedEvents: EventData[] = eventsData.map(event => {
        const hostProfile = hostProfiles?.find(profile => profile.id === event.host_id);
        return {
          id: event.id,
          title: event.title || 'Untitled Event',
          description: event.description || '',
          imageUrl: event.image_url || '/placeholder.svg',
          date: event.date,
          time: event.time || '00:00',
          location: event.location || 'TBD',
          attendees: 0, // Will be updated with actual participant counts
          maxAttendees: event.max_attendees || 4,
          categories: event.category ? [event.category] : ['other'],
          host: {
            name: hostProfile?.name || 'Unknown Host',
            avatar: hostProfile?.avatar_url || 'https://randomuser.me/api/portraits/women/44.jpg',
          },
          hostId: event.host_id,
          isPinned: pinnedEventIds.includes(event.id),
          isAttending: event.host_id === userId, // Host is always attending
          duration: event.duration,
          coordinates: event.coordinates
        };
      });

      if (!signal.aborted) {
        console.log('Setting events:', transformedEvents.length);
        setEvents(transformedEvents);
        
        // Load participant data if user is logged in
        if (userId && transformedEvents.length > 0) {
          console.log('Loading participant data for user:', userId);
          await loadParticipantData(transformedEvents, signal);
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError' && !signal.aborted) {
        console.error('Error fetching events:', error);
        setEvents([]);
        
        // More gentle error handling for mobile
        const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
        if (!isMobile) {
          toast({
            title: "Unable to load activities",
            description: "Please refresh the page to try again.",
            variant: "destructive"
          });
        }
      }
    }
  }, [userId]); // Remove pinnedEventIds dependency to prevent circular re-renders

  // Load participant data
  const loadParticipantData = async (baseEvents: EventData[], signal: AbortSignal) => {
    try {
      const eventIds = baseEvents.map(event => event.id);
      
      const { data: participantsData } = await supabase
        .from('event_participants')
        .select('event_id, user_id, status')
        .in('event_id', eventIds)
        .eq('status', 'attending')
        .abortSignal(signal);

      if (participantsData && !signal.aborted) {
        const updatedEvents = baseEvents.map(event => {
          const eventParticipants = participantsData.filter(p => p.event_id === event.id);
          const currentUserParticipation = participantsData.find(p => p.event_id === event.id && p.user_id === userId);
          
            // Use actual participant count from DB (host already included via trigger)
            return {
              ...event,
              attendees: eventParticipants.length,
              isAttending: currentUserParticipation?.status === 'attending' || event.hostId === userId
            };
        });

        setEvents(updatedEvents);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error loading participant data:', error);
      }
    }
  };

  // Initialize data - prevent multiple initializations and loops
  useEffect(() => {
    // Skip if no user ID
    if (!userId) {
      console.log('useDashboardData: No userId provided, skipping initialization');
      setIsLoading(false);
      setEvents([]);
      return;
    }
    
    // Skip if already initialized for this user
    if (hasInitializedRef.current) {
      console.log('useDashboardData: Already initialized, skipping');
      return;
    }
    
    // Mark as initialized immediately to prevent multiple calls
    hasInitializedRef.current = true;
    console.log('useDashboardData: Starting initialization for user:', userId);
    
    // Initialize with controlled delay
    const initializeData = async () => {
      setIsLoading(true);
      
      try {
        // Inline the fetch logic to avoid circular dependency
        console.log('Fetching events for user:', userId);
        
        const today = new Date().toISOString().split('T')[0];
        console.log('Querying events from date:', today);
        
        // With new security policies, users can only see:
        // 1. Events they're hosting
        // 2. Events they're participating in  
        // 3. Public events for discovery (limited info)
        
        const { data: eventsData, error } = await supabase
          .from('events')
          .select('*')
          .eq('status', 'active')
          .gte('date', today)
          .order('date', { ascending: true })
          .limit(50); // Increased limit since we're now showing fewer events per user

        if (error) throw error;

        if (!eventsData) {
          console.log('No events data');
          setEvents([]);
          return;
        }

        console.log('Found events:', eventsData.length);

        // Get host profiles
        const hostIds = eventsData.map(event => event.host_id);
        const { data: hostProfiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', hostIds);

        // Transform events
        const transformedEvents: EventData[] = eventsData.map(event => {
          const hostProfile = hostProfiles?.find(profile => profile.id === event.host_id);
          return {
            id: event.id,
            title: event.title || 'Untitled Event',
            description: event.description || '',
            imageUrl: event.image_url || '/placeholder.svg',
            date: event.date,
            time: event.time || '00:00',
            location: event.location || 'TBD',
            attendees: 0, // Will be updated with actual participant counts
            maxAttendees: event.max_attendees || 4,
            categories: event.category ? [event.category] : ['other'],
            host: {
              name: hostProfile?.name || 'Unknown Host',
              avatar: hostProfile?.avatar_url || 'https://randomuser.me/api/portraits/women/44.jpg',
            },
            hostId: event.host_id,
            isPinned: false, // Will be updated after setting events
            isAttending: event.host_id === userId,
            duration: event.duration,
            coordinates: event.coordinates
          };
        });

        console.log('Setting events:', transformedEvents.length);
        setEvents(transformedEvents);
        
        // Load participant data
        if (transformedEvents.length > 0) {
          console.log('Loading participant data for user:', userId);
          
          const eventIds = transformedEvents.map(event => event.id);
          
          const { data: participantsData } = await supabase
            .from('event_participants')
            .select('event_id, user_id, status')
            .in('event_id', eventIds)
            .eq('status', 'attending');

          if (participantsData) {
            const updatedEvents = transformedEvents.map(event => {
              const eventParticipants = participantsData.filter(p => p.event_id === event.id);
              const currentUserParticipation = participantsData.find(p => p.event_id === event.id && p.user_id === userId);
              
              // Use actual participant count from DB (host already included via trigger)
              return {
                ...event,
                attendees: eventParticipants.length,
                isAttending: currentUserParticipation?.status === 'attending' || event.hostId === userId
              };
            });

            setEvents(updatedEvents);
          }
        }
        
        console.log('useDashboardData: Initialization complete');
      } catch (error) {
        console.error('useDashboardData: Initialization error:', error);
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Add delay for mobile to prevent overwhelming the device
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const delay = isMobile ? 300 : 0;
    
    const timeoutId = setTimeout(() => {
      initializeData();
    }, delay);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [userId]); // Only depend on userId

  // Update pinned status when pinnedEventIds changes
  useEffect(() => {
    if (events.length > 0 && pinnedEventIds.length >= 0) {
      setEvents(prevEvents => 
        prevEvents.map(event => ({
          ...event,
          isPinned: pinnedEventIds.includes(event.id)
        }))
      );
    }
  }, [pinnedEventIds]);

  // Manual refresh function
  const refreshEvents = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    await fetchEvents();
    setIsLoading(false);
  }, [fetchEvents, userId]);

  return {
    events,
    setEvents,
    isLoading,
    pinnedEventIds,
    setPinnedEventIds,
    refreshEvents
  };
};
