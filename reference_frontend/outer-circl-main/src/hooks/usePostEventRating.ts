
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Attendee {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface EventInfo {
  id: string;
  title: string;
  date: string;
  imageUrl?: string;
}

interface RatingData {
  attendeeId: string;
  rating: number;
}

export const usePostEventRating = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitRatings = useCallback(async (eventId: string, ratings: RatingData[]) => {
    if (!eventId || ratings.length === 0) return false;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to submit ratings');
        return false;
      }

      // Insert ratings directly into the table
      const ratingsToInsert = ratings.map(rating => ({
        event_id: eventId,
        rated_user_id: rating.attendeeId,
        rating_user_id: user.id,
        rating: rating.rating
      }));

      const { error } = await supabase
        .from('user_ratings')
        .insert(ratingsToInsert);

      if (error) {
        console.error('Error submitting ratings:', error);
        toast.error('Failed to submit ratings');
        return false;
      }

      toast.success('Thank you for your ratings! This helps improve our community.');
      return true;
    } catch (error) {
      console.error('Unexpected error submitting ratings:', error);
      toast.error('An unexpected error occurred');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const getEventRatingStatus = useCallback(async (eventId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Check if user has already rated this event
      const { data, error } = await supabase
        .from('user_ratings')
        .select('id')
        .eq('event_id', eventId)
        .eq('rating_user_id', user.id)
        .limit(1);

      if (error) {
        console.error('Error checking rating status:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking rating status:', error);
      return false;
    }
  }, []);

  return {
    submitRatings,
    getEventRatingStatus,
    isSubmitting
  };
};
