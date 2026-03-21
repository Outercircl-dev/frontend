
import React, { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { EventData } from '@/components/ActivityCard';
import { getSuggestedEvents } from '@/utils/eventSuggestions';
import { useNavigate } from 'react-router-dom';

interface DashboardEventsProps {
  events: EventData[];
  setEvents: (events: EventData[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  currentUserId: string | null;
  isLoggedIn: boolean;
  pinnedEventIds: string[];
  setPinnedEventIds: (ids: string[]) => void;
  categoryFilters: string[];
  setShowSuggestedEvents: (show: boolean) => void;
  setSuggestedEvents: (events: EventData[]) => void;
  children: (props: {
    filteredEvents: EventData[];
    handleAttendClick: (eventId: string) => Promise<void>;
    handlePinEvent: (eventId: string, isPinned: boolean) => void;
    handleCreateEventClick: () => void;
    handleCreateFromSuggestion: (event: EventData) => void;
  }) => React.ReactNode;
}

const DashboardEvents: React.FC<DashboardEventsProps> = ({
  events,
  setEvents,
  isLoading,
  setIsLoading,
  currentUserId,
  isLoggedIn,
  pinnedEventIds,
  setPinnedEventIds,
  categoryFilters,
  setShowSuggestedEvents,
  setSuggestedEvents,
  children
}) => {
  const navigate = useNavigate();
  const fetchedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Stable fetch function that won't change between renders
  const fetchEvents = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (fetchedRef.current) {
      console.log('Events already fetched, skipping');
      return;
    }

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    console.log('Starting fresh event fetch after recurring events cleanup...');
    fetchedRef.current = true;
    setIsLoading(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      console.log('Fetching events from date:', today);
      
      // Fetch from secure view that protects sensitive location data
      const { data: eventsData, error } = await supabase
        .from('events_dashboard_secure')
        .select('*')
        .order('date', { ascending: true })
        .limit(50)
        .abortSignal(signal);

      if (error) {
        console.error('Error fetching events:', error);
        setIsLoading(false);
        return;
      }

      console.log('Raw events from Supabase:', eventsData?.length || 0);
      console.log('Events with recurring info:', eventsData?.map(e => ({ 
        id: e.id, 
        title: e.title, 
        date: e.date, 
        is_recurring: e.is_recurring, 
        parent_event_id: e.parent_event_id,
        occurrence_number: e.occurrence_number
      })) || []);
      console.log('✅ Fresh data loaded after recurring events cleanup');

      if (error) {
        throw error;
      }

      console.log('Raw events fetched:', eventsData?.length || 0);

      if (!eventsData || !Array.isArray(eventsData)) {
        console.log('No events found, setting empty array');
        setEvents([]);
        return;
      }

      // Get host profiles
      const hostIds = eventsData.map(event => event.host_id);
      const { data: hostProfiles } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .in('id', hostIds);

      // Transform events with complete data - preserve original images
      const transformedEvents: EventData[] = eventsData.map(event => {
        const hostProfile = hostProfiles?.find(profile => profile.id === event.host_id);
        
        return {
          id: event.id,
          title: event.title || 'Untitled Event',
          description: event.description || '',
          imageUrl: event.image_url || '/placeholder.svg', // Use the actual stored image
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
          isAttending: event.host_id === currentUserId, // Host is always attending
          duration: event.duration,
          coordinates: event.coordinates
        };
      });

      console.log('Setting transformed events:', transformedEvents.length);
      setEvents(transformedEvents);

      // Load participant data if user is logged in
      if (currentUserId && transformedEvents.length > 0) {
        await loadParticipantData(transformedEvents, signal);
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted');
        return;
      }
      
      console.error('Error fetching events:', error);
      setEvents([]);
      toast({
        title: "Unable to load activities",
        description: "Please refresh the page to try again.",
        variant: "destructive"
      });
    } finally {
      console.log('Setting loading to false');
      setIsLoading(false);
    }
  }, [currentUserId, pinnedEventIds, setEvents, setIsLoading]);

  // Load participant data separately
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
          const currentUserParticipation = participantsData.find(p => p.event_id === event.id && p.user_id === currentUserId);
          
          // Use actual participant count from DB (host already included via trigger)
          return {
            ...event,
            attendees: eventParticipants.length,
            isAttending: currentUserParticipation?.status === 'attending' || event.hostId === currentUserId
          };
        });

        setEvents(updatedEvents);
        console.log('Updated events with participant data');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error loading participant data:', error);
      }
    }
  };

  // Only fetch once on mount - force fresh data after recurring events cleanup
  useEffect(() => {
    // Reset fetch flag to ensure fresh data
    fetchedRef.current = false;
    fetchEvents();
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchEvents]);

  // Memoized pin handler
  const handlePinEvent = useCallback((eventId: string, isPinned: boolean) => {
    const getSavedEvents = (): string[] => {
      const savedEvents = localStorage.getItem('pinnedEvents');
      return savedEvents ? JSON.parse(savedEvents) : [];
    };

    const saveEvent = (eventId: string) => {
      const savedEvents = getSavedEvents();
      if (!savedEvents.includes(eventId)) {
        savedEvents.push(eventId);
        localStorage.setItem('pinnedEvents', JSON.stringify(savedEvents));
      }
    };

    const unsaveEvent = (eventId: string) => {
      let savedEvents = getSavedEvents();
      savedEvents = savedEvents.filter(id => id !== eventId);
      localStorage.setItem('pinnedEvents', JSON.stringify(savedEvents));
    };

    if (isPinned) {
      saveEvent(eventId);
      setPinnedEventIds([...pinnedEventIds, eventId]);
    } else {
      unsaveEvent(eventId);
      setPinnedEventIds(pinnedEventIds.filter(id => id !== eventId));
    }
  }, [pinnedEventIds, setPinnedEventIds]);

  const handleAttendClick = useCallback(async (eventId: string) => {
    if (!isLoggedIn || !currentUserId) {
      toast({
        title: "Please log in to attend activities",
        variant: "destructive"
      });
      navigate("/auth?tab=login&redirect=" + encodeURIComponent(`/event/${eventId}`));
      return;
    }

    try {
      console.log('Handling attend click for event:', eventId, 'user:', currentUserId);
      
      const { data: existingParticipation, error: checkError } = await supabase
        .from('event_participants')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking participation:', checkError);
        toast({
          title: "Error checking participation status",
          description: "Please try again.",
          variant: "destructive"
        });
        return;
      }

      if (existingParticipation) {
        if (existingParticipation.status === 'attending') {
          await supabase
            .from('event_participants')
            .delete()
            .eq('event_id', eventId)
            .eq('user_id', currentUserId);

          toast({
            title: "You've left this activity",
            variant: "default"
          });
        } else {
          await supabase
            .from('event_participants')
            .update({ status: 'attending', updated_at: new Date().toISOString() })
            .eq('event_id', eventId)
            .eq('user_id', currentUserId);

          toast({
            title: "You're now attending this activity!",
            variant: "default"
          });
        }
      } else {
        await supabase
          .from('event_participants')
          .insert({
            event_id: eventId,
            user_id: currentUserId,
            status: 'attending',
            joined_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        toast({
          title: "You're now attending this activity!",
          variant: "default"
        });
      }

      // Update events array optimistically
      const updatedEvents = events.map((event: EventData): EventData => {
        if (event.id === eventId) {
          const wasAttending = event.isAttending;
          return {
            ...event,
            isAttending: !wasAttending,
            attendees: wasAttending ? event.attendees - 1 : event.attendees + 1
          };
        }
        return event;
      });
      
      setEvents(updatedEvents);
    } catch (error) {
      console.error('Unexpected error managing event attendance:', error);
      toast({
        title: "An unexpected error occurred",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  }, [isLoggedIn, currentUserId, navigate, events, setEvents]);

  const handleCreateEventClick = useCallback(() => {
    if (!isLoggedIn) {
      toast({
        title: "Please log in to create activities",
        variant: "destructive"
      });
      navigate("/auth?tab=login&redirect=/create-event");
      return;
    }
  }, [isLoggedIn, navigate]);

  const handleCreateFromSuggestion = useCallback((event: EventData) => {
    console.log("Creating event from suggestion:", event);
  }, []);

  // Memoize events with pinned status
  const eventsWithPinned = React.useMemo(() => {
    return events.map(event => ({
      ...event,
      isPinned: pinnedEventIds.includes(event.id)
    }));
  }, [events, pinnedEventIds]);

  return (
    <>
      {children({
        filteredEvents: eventsWithPinned,
        handleAttendClick,
        handlePinEvent,
        handleCreateEventClick,
        handleCreateFromSuggestion
      })}
    </>
  );
};

export default React.memo(DashboardEvents);
