import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RatingWindowStatus {
  canRate: boolean;
  timeRemaining: number | null;
  eventCompleted: boolean;
}

export const useRatingWindow = (eventId: string) => {
  const [status, setStatus] = useState<RatingWindowStatus>({
    canRate: false,
    timeRemaining: null,
    eventCompleted: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    const checkRatingWindow = async () => {
      try {
        const { data: event, error } = await supabase
          .from('events')
          .select('status, completed_at')
          .eq('id', eventId)
          .single();

        if (error) {
          console.error('Error checking event status:', error);
          setLoading(false);
          return;
        }

        if (!event || event.status !== 'completed') {
          setStatus({
            canRate: false,
            timeRemaining: null,
            eventCompleted: false
          });
          setLoading(false);
          return;
        }

        if (!event.completed_at) {
          // Event is completed but no completed_at timestamp - allow rating
          setStatus({
            canRate: true,
            timeRemaining: null,
            eventCompleted: true
          });
          setLoading(false);
          return;
        }

        const completedAt = new Date(event.completed_at);
        const now = new Date();
        const hoursElapsed = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60);
        const timeRemaining = Math.max(0, 24 - hoursElapsed);

        setStatus({
          canRate: timeRemaining > 0,
          timeRemaining: timeRemaining,
          eventCompleted: true
        });
      } catch (error) {
        console.error('Error checking rating window:', error);
      } finally {
        setLoading(false);
      }
    };

    checkRatingWindow();
    
    // Refresh every minute to update time remaining
    const interval = setInterval(checkRatingWindow, 60000);
    
    return () => clearInterval(interval);
  }, [eventId]);

  const formatTimeRemaining = (hours: number): string => {
    if (hours >= 1) {
      return `${Math.floor(hours)} hour${Math.floor(hours) !== 1 ? 's' : ''} remaining`;
    } else {
      const minutes = Math.floor(hours * 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
    }
  };

  return {
    ...status,
    loading,
    formatTimeRemaining: status.timeRemaining ? formatTimeRemaining(status.timeRemaining) : null
  };
};