import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AttendedEvent {
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
  joined_at?: string;
}

export const useUpcomingAttendedEvents = (userId?: string) => {
  const [events, setEvents] = useState<AttendedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchUpcomingAttendedEvents();
  }, [userId]);

  const fetchUpcomingAttendedEvents = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      console.log('useUpcomingAttendedEvents: fetching attended events for userId:', userId);

      // Get events user is attending from event_participants table
      const { data: participantEvents, error } = await supabase
        .from('event_participants')
        .select(`
          status,
          joined_at,
          events(*)
        `)
        .eq('user_id', userId)
        .eq('status', 'attending');

      if (error) throw error;

      console.log('useUpcomingAttendedEvents: found participant events:', participantEvents?.length || 0);

      // Filter for upcoming events only
      const now = new Date();
      const upcomingEvents: AttendedEvent[] = [];

      participantEvents?.forEach((participant) => {
        const event = participant.events;
        if (!event?.date) return;

        // Create event datetime
        let eventDateTime = new Date(event.date);
        if (event.time) {
          const [hours, minutes] = event.time.split(':');
          eventDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
        } else {
          // For date-only events, set to end of day for comparison
          eventDateTime.setHours(23, 59, 59);
        }

        // Only include future events
        if (eventDateTime >= now) {
          upcomingEvents.push({
            ...event,
            joined_at: participant.joined_at
          });
        }
      });

      // Sort by date (earliest first)
      upcomingEvents.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });

      console.log('useUpcomingAttendedEvents: upcoming attended events:', upcomingEvents);
      setEvents(upcomingEvents);
    } catch (error) {
      console.error('Error fetching upcoming attended events:', error);
      setError('Failed to fetch upcoming activities');
    } finally {
      setLoading(false);
    }
  };

  return {
    events,
    loading,
    error,
    refetch: fetchUpcomingAttendedEvents
  };
};