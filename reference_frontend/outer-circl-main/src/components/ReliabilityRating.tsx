import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Star, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useRatingWindow } from '@/hooks/useRatingWindow';
import { toast } from 'sonner';

interface ReliabilityRatingProps {
  eventId: string;
  participants: Array<{
    id: string;
    name: string;
  }>;
  onRatingsSubmitted?: () => void;
}

const ReliabilityRating: React.FC<ReliabilityRatingProps> = ({
  eventId,
  participants,
  onRatingsSubmitted
}) => {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { canRate, timeRemaining, eventCompleted, formatTimeRemaining } = useRatingWindow(eventId);

  const handleRatingChange = (participantId: string, rating: number) => {
    setRatings(prev => ({
      ...prev,
      [participantId]: rating
    }));
  };

  const handleSubmitRatings = async () => {
    if (Object.keys(ratings).length === 0) {
      toast.error('Please rate at least one participant');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in to submit ratings');
        return;
      }

      // Prepare ratings data
      const ratingsData = Object.entries(ratings).map(([participantId, rating]) => ({
        event_id: eventId,
        rated_user_id: participantId,
        rating_user_id: user.id,
        rating: rating,
        created_at: new Date().toISOString()
      }));

      // Call the database function to insert ratings and update reliability scores
      const { error } = await supabase.rpc('insert_user_ratings', {
        ratings_data: ratingsData
      });

      if (error) {
        console.error('Error submitting ratings:', error);
        toast.error('Failed to submit ratings. Please try again.');
        return;
      }

      toast.success('Reliability ratings submitted successfully!');
      setSubmitted(true);
      onRatingsSubmitted?.();

    } catch (error) {
      console.error('Error submitting ratings:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="p-4 bg-green-50 border-green-200">
        <div className="text-center">
          <div className="text-green-600 font-medium mb-2">
            ✅ Ratings Submitted Successfully!
          </div>
          <p className="text-sm text-green-700">
            Thank you for helping build our community's reliability system.
          </p>
        </div>
      </Card>
    );
  }

  if (!eventCompleted) {
    return (
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <p className="text-sm text-blue-700">
            This activity hasn't been completed yet. You can rate participants after the activity ends.
          </p>
        </div>
      </Card>
    );
  }

  if (!canRate) {
    return (
      <Card className="p-4 bg-red-50 border-red-200">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-red-600" />
          <p className="text-sm text-red-700">
            The 24-hour rating window has expired. You can no longer rate participants for this activity.
          </p>
        </div>
      </Card>
    );
  }

  if (participants.length === 0) {
    return (
      <Card className="p-4 bg-gray-50">
        <p className="text-center text-gray-600">
          No other participants to rate for this activity.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="text-center">
        <h3 className="font-medium text-gray-900 mb-2">
          Rate Your Fellow Participants
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          Help build our community's reliability system (optional). Your ratings are anonymous.
        </p>
        {timeRemaining && formatTimeRemaining && (
          <div className="flex items-center gap-2 p-2 bg-orange-50 rounded border border-orange-200 mb-4">
            <Clock className="h-3 w-3 text-orange-600" />
            <p className="text-xs text-orange-700">
              {formatTimeRemaining} to submit ratings
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {participants.map((participant) => (
          <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="font-medium text-gray-900">
              {participant.name}
            </span>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRatingChange(participant.id, star)}
                  className="p-1 hover:scale-110 transition-transform"
                  type="button"
                >
                  <Star
                    className={`h-5 w-5 ${
                      ratings[participant.id] >= star
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300 hover:text-yellow-400'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex space-x-2 pt-2">
        <Button
          onClick={handleSubmitRatings}
          disabled={!canRate || isSubmitting || Object.keys(ratings).length === 0}
          className="flex-1"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Anonymous Ratings'}
        </Button>
        <Button
          variant="outline"
          onClick={() => setSubmitted(true)}
          className="flex-1"
        >
          Skip for Now
        </Button>
      </div>
    </Card>
  );
};

export default ReliabilityRating;