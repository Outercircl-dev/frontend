import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Star, User, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { usePostEventRating } from '@/hooks/usePostEventRating';
import { useRatingWindow } from '@/hooks/useRatingWindow';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Participant {
  id: string;
  name: string;
  avatar_url?: string;
}

interface PostEventRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  onRatingComplete: () => void;
}

export const PostEventRatingModal: React.FC<PostEventRatingModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  onRatingComplete
}) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const { submitRatings, isSubmitting } = usePostEventRating();
  const { canRate, timeRemaining, eventCompleted, loading: windowLoading, formatTimeRemaining } = useRatingWindow(eventId);

  useEffect(() => {
    if (isOpen && eventId) {
      fetchParticipants();
    }
  }, [isOpen, eventId]);

  const fetchParticipants = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: participants, error } = await supabase
        .from('event_participants')
        .select(`
          user_id,
          profiles!inner(id, name, avatar_url)
        `)
        .eq('event_id', eventId)
        .eq('status', 'attending')
        .neq('user_id', user.id);

      if (error) throw error;

      const formattedParticipants = participants?.map(p => ({
        id: p.profiles.id,
        name: p.profiles.name || 'Unknown',
        avatar_url: p.profiles.avatar_url
      })) || [];

      setParticipants(formattedParticipants);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast.error('Failed to load participants');
    }
  };

  const handleRating = (participantId: string, rating: number) => {
    setRatings(prev => ({
      ...prev,
      [participantId]: rating
    }));
  };

  const handleSubmit = async () => {
    const ratingsToSubmit = Object.entries(ratings).map(([participantId, rating]) => ({
      attendeeId: participantId,
      rating
    }));

    if (ratingsToSubmit.length !== participants.length) {
      toast.error('Please rate all participants before submitting');
      return;
    }

    const success = await submitRatings(eventId, ratingsToSubmit);
    if (success) {
      onRatingComplete();
      onClose();
    }
  };

  const renderStars = (participantId: string, currentRating: number) => {
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      return (
        <button
          key={index}
          type="button"
          onClick={() => handleRating(participantId, starValue)}
          className={`p-1 ${starValue <= currentRating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
        >
          <Star className="h-5 w-5 fill-current" />
        </button>
      );
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Rate Participants - {eventTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!eventCompleted ? (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-blue-700">
                This activity hasn't been completed yet. You can rate participants after the activity ends.
              </p>
            </div>
          ) : !canRate ? (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
              <Clock className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-700">
                The 24-hour rating window has expired. You can no longer rate participants for this activity.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Please rate your fellow participants to help improve our community. Your ratings are anonymous and help build trust.
              </p>
              {timeRemaining && formatTimeRemaining && (
                <div className="flex items-center gap-2 p-2 bg-orange-50 rounded border border-orange-200">
                  <Clock className="h-3 w-3 text-orange-600" />
                  <p className="text-xs text-orange-700">
                    {formatTimeRemaining} to submit ratings
                  </p>
                </div>
              )}
            </div>
          )}

          {!canRate || participants.length === 0 ? (
            <div className="text-center py-8">
              <User className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-gray-500">
                {!canRate ? 'Rating not available' : 'No other participants to rate'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {participants.map((participant) => (
                <div key={participant.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {participant.avatar_url ? (
                        <img
                          src={participant.avatar_url}
                          alt={participant.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-500" />
                        </div>
                      )}
                      <span className="font-medium">{participant.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {renderStars(participant.id, ratings[participant.id] || 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canRate || isSubmitting || participants.length === 0 || Object.keys(ratings).length !== participants.length}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Anonymous Ratings'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};