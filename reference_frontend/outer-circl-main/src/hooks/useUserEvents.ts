import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  date: string;
  time?: string;
  max_attendees?: number;
  status: string;
  category?: string;
  image_url?: string;
  host_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizedEvents {
  upcomingEvents: UserEvent[];
  past30DaysEvents: UserEvent[];
  olderPastEvents: UserEvent[];
}

export const useUserEvents = (userId?: string) => {
  const [events, setEvents] = useState<OrganizedEvents>({ upcomingEvents: [], past30DaysEvents: [], olderPastEvents: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchUserEvents();
  }, [userId]);

  const fetchUserEvents = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      console.log('useUserEvents: fetching HOSTED events for userId:', userId);

      const { data: userEvents, error } = await supabase
        .from('events')
        .select('*')
        .eq('host_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;

      console.log('useUserEvents: found events:', userEvents?.length || 0, userEvents);

      // Organize events by upcoming, past 30 days, and older past
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const upcomingEvents: UserEvent[] = [];
      const past30DaysEvents: UserEvent[] = [];
      const olderPastEvents: UserEvent[] = [];

      userEvents?.forEach((event) => {
        if (!event.date) {
          upcomingEvents.push(event);
          return;
        }

        // Create event datetime
        let eventDateTime = new Date(event.date);
        if (event.time) {
          const [hours, minutes] = event.time.split(':');
          eventDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
        } else {
          // For date-only events, consider them past if the date has passed
          eventDateTime.setHours(23, 59, 59);
        }

        if (eventDateTime >= now) {
          // Future event
          upcomingEvents.push(event);
        } else if (eventDateTime >= thirtyDaysAgo) {
          // Past event within 30 days
          past30DaysEvents.push(event);
        } else {
          // Older past event
          olderPastEvents.push(event);
        }
      });

      setEvents({ upcomingEvents, past30DaysEvents, olderPastEvents });
    } catch (error) {
      console.error('Error fetching user events:', error);
      setError('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const isPastEvent = (event: UserEvent): boolean => {
    if (!event.date) return false;
    
    const now = new Date();
    let eventDateTime = new Date(event.date);
    
    if (event.time) {
      const [hours, minutes] = event.time.split(':');
      eventDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    } else {
      eventDateTime.setHours(23, 59, 59);
    }
    
    return eventDateTime < now;
  };

  return {
    events,
    loading,
    error,
    refetch: fetchUserEvents,
    isPastEvent
  };
};