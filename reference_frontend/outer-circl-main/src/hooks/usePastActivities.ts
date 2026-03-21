import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePastActivities = (userId: string | null) => {
  const [pastActivities, setPastActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPastActivities = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Calculate date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today

      // Fetch events user participated in within the last 30 days
      const { data: participantEvents, error } = await supabase
        .from('event_participants')
        .select(`
          status,
          events(
            id,
            title,
            description,
            date,
            time,
            location,
            category,
            status,
            max_attendees,
            image_url
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'attending');

      if (error) {
        console.error('Error fetching past activities:', error);
        return;
      }

      // Filter for past events within the last 30 days
      const pastEvents = (participantEvents || [])
        .map((p: any) => p.events)
        .filter((event: any) => {
          if (!event?.date) return false;
          
          const eventDate = new Date(event.date);
          // Add time if available
          if (event.time) {
            const [hours, minutes] = event.time.split(':');
            eventDate.setHours(parseInt(hours), parseInt(minutes));
          }
          
          // Event must be in the past (completed) and within last 30 days
          return eventDate < today && eventDate >= thirtyDaysAgo;
        })
        .map((event: any) => ({
          ...event,
          type: 'past_activity',
          attendees: event.max_attendees || 0
        }))
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Most recent first

      setPastActivities(pastEvents);
    } catch (error) {
      console.error('Error fetching past activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPastActivities();
  }, [userId]);

  return {
    pastActivities,
    loading,
    refetch: fetchPastActivities
  };
};