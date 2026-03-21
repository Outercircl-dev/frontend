
import React, { useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { EventData } from '@/components/ActivityCard';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface SimplifiedDashboardEventsProps {
  events: EventData[];
  setEvents: React.Dispatch<React.SetStateAction<EventData[]>>;
  currentUserId: string | null;
  isLoggedIn: boolean;
  savedEventIds?: string[];
  setSavedEventIds?: React.Dispatch<React.SetStateAction<string[]>>;
  children: (props: {
    handleAttendClick: (eventId: string) => Promise<void>;
    handleSaveEvent: (eventId: string, isSaved: boolean) => Promise<void>;
    handleCreateEventClick: () => void;
    handleCreateFromSuggestion: (event: EventData) => void;
  }) => React.ReactNode;
}

const SimplifiedDashboardEvents: React.FC<SimplifiedDashboardEventsProps> = ({
  events,
  setEvents,
  currentUserId,
  isLoggedIn,
  savedEventIds,
  setSavedEventIds,
  children
}) => {
  const navigate = useNavigate();


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
    navigate("/create-event");
  }, [isLoggedIn, navigate]);

  const handleSaveEvent = useCallback(async (eventId: string, isSaved: boolean) => {
    if (!isLoggedIn || !currentUserId) {
      toast({
        title: "Please log in to save activities",
        variant: "destructive"
      });
      return;
    }

    try {
      if (isSaved) {
        // Save event
        const { error } = await supabase
          .from('saved_events')
          .insert({
            user_id: currentUserId,
            event_id: eventId
          });

        if (error) throw error;

        if (setSavedEventIds) {
          setSavedEventIds(prev => [...prev, eventId]);
        }

        // Update event state
        setEvents(prev => prev.map(event => 
          event.id === eventId ? { ...event, isSaved: true } : event
        ));

        toast({
          title: "Activity saved",
          variant: "default"
        });
      } else {
        // Unsave event
        const { error } = await supabase
          .from('saved_events')
          .delete()
          .eq('user_id', currentUserId)
          .eq('event_id', eventId);

        if (error) throw error;

        if (setSavedEventIds) {
          setSavedEventIds(prev => prev.filter(id => id !== eventId));
        }

        // Update event state
        setEvents(prev => prev.map(event => 
          event.id === eventId ? { ...event, isSaved: false } : event
        ));

        toast({
          title: "Activity removed from saved",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error saving/unsaving event:', error);
      toast({
        title: "Error saving activity",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  }, [isLoggedIn, currentUserId, setSavedEventIds, setEvents]);

  const handleCreateFromSuggestion = useCallback((event: EventData) => {
    console.log("Creating event from suggestion:", event);
  }, []);

  return (
    <>
      {children({
        handleAttendClick,
        handleSaveEvent,
        handleCreateEventClick,
        handleCreateFromSuggestion
      })}
    </>
  );
};

export default React.memo(SimplifiedDashboardEvents);
