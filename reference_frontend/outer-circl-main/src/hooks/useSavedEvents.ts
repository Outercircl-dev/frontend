import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SavedEvent {
  id: string;
  user_id: string;
  event_id: string;
  created_at: string;
}

export const useSavedEvents = (userId?: string) => {
  const [savedEvents, setSavedEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchSavedEvents();
  }, [userId]);

  const fetchSavedEvents = async () => {
    if (!userId) return;

    console.log('useSavedEvents: fetching for userId:', userId);

    try {
      const { data, error } = await supabase
        .from('saved_events')
        .select('event_id')
        .eq('user_id', userId);

      if (error) throw error;

      const eventIds = data?.map(item => item.event_id) || [];
      console.log('useSavedEvents: found saved event IDs:', eventIds);
      setSavedEvents(eventIds);
    } catch (error) {
      console.error('Error fetching saved events:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveEvent = async (eventId: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('saved_events')
        .insert({
          user_id: userId,
          event_id: eventId
        });

      if (error) throw error;

      setSavedEvents(prev => [...prev, eventId]);
      toast.success('Activity saved');
      return true;
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save activity');
      return false;
    }
  };

  const unsaveEvent = async (eventId: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('saved_events')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId);

      if (error) throw error;

      setSavedEvents(prev => prev.filter(id => id !== eventId));
      toast.success('Activity removed from saved');
      return true;
    } catch (error) {
      console.error('Error unsaving event:', error);
      toast.error('Failed to remove saved activity');
      return false;
    }
  };

  const toggleSaveEvent = async (eventId: string) => {
    const isSaved = savedEvents.includes(eventId);
    return isSaved ? await unsaveEvent(eventId) : await saveEvent(eventId);
  };

  const isSaved = (eventId: string) => savedEvents.includes(eventId);

  return {
    savedEvents,
    loading,
    saveEvent,
    unsaveEvent,
    toggleSaveEvent,
    isSaved,
    refetch: fetchSavedEvents
  };
};