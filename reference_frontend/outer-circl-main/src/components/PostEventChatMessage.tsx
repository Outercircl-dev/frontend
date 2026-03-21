
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Calendar } from 'lucide-react';
import RateAttendeeModal from './RateAttendeeModal';
import { usePostEventRating } from '@/hooks/usePostEventRating';

interface EventInfo {
  id: string;
  title: string;
  date: string;
  imageUrl?: string;
}

interface Attendee {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface PostEventChatMessageProps {
  event: EventInfo;
  attendees: Attendee[];
  hostName: string;
  hostAvatar?: string;
  onRatingComplete?: (eventId: string) => void;
}

const PostEventChatMessage: React.FC<PostEventChatMessageProps> = ({
  event,
  attendees,
  hostName,
  hostAvatar,
  onRatingComplete
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ratings, setRatings] = useState<{attendeeId: string, rating: number}[]>([]);
  const [hasRated, setHasRated] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  
  const { submitRatings, getEventRatingStatus, isSubmitting } = usePostEventRating();

  // Check if user has already rated this event
  useEffect(() => {
    const checkRatingStatus = async () => {
      setIsCheckingStatus(true);
      const alreadyRated = await getEventRatingStatus(event.id);
      setHasRated(alreadyRated);
      setIsCheckingStatus(false);
    };
    
    checkRatingStatus();
  }, [event.id, getEventRatingStatus]);

  const handleRateClick = () => {
    setIsModalOpen(true);
  };

  const handleRatingSubmit = (attendeeId: string, rating: number) => {
    setRatings(prev => {
      const existingIndex = prev.findIndex(r => r.attendeeId === attendeeId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { attendeeId, rating };
        return updated;
      }
      return [...prev, { attendeeId, rating }];
    });
  };

  const handleModalClose = async () => {
    setIsModalOpen(false);
    
    if (ratings.length > 0) {
      const success = await submitRatings(event.id, ratings);
      if (success) {
        setHasRated(true);
        setRatings([]);
        if (onRatingComplete) {
          onRatingComplete(event.id);
        }
      }
    }
  };

  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  if (isCheckingStatus) {
    return (
      <Card className="mb-4 overflow-hidden border-brand-salmon">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-4 overflow-hidden border-brand-salmon shadow-lg">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-brand-salmon/10 to-pink-100 p-3 border-b flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={hostAvatar} />
              <AvatarFallback className="bg-brand-purple text-white">
                {hostName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="text-sm font-medium">{hostName}</span>
              <span className="text-xs text-muted-foreground ml-2">Host</span>
            </div>
          </div>
          
          <div className="p-4">
            <div className="flex items-center mb-3">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{formattedDate}</span>
            </div>
            
            <p className="text-sm mb-4">
              Thank you for attending <span className="font-semibold text-brand-salmon">{event.title}</span>! We hope you had a great time. 
              Please take a moment to rate the reliability of the other attendees.
            </p>
            
            <div className="grid grid-cols-4 gap-2 mb-4">
              {attendees.slice(0, 4).map((attendee) => (
                <div key={attendee.id} className="flex flex-col items-center">
                  <Avatar className="h-12 w-12 mb-1">
                    <AvatarImage src={attendee.avatarUrl} />
                    <AvatarFallback className="bg-brand-purple/20 text-brand-purple">
                      {attendee.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs truncate w-full text-center">{attendee.name}</span>
                </div>
              ))}
              {attendees.length > 4 && (
                <div className="text-xs text-muted-foreground text-center mt-1">
                  +{attendees.length - 4} more
                </div>
              )}
            </div>
            
            {!hasRated ? (
              <Button 
                onClick={handleRateClick} 
                className="w-full bg-brand-salmon hover:bg-brand-dark-salmon transition-colors"
                disabled={isSubmitting}
              >
                <Star className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Submitting...' : 'Rate Attendees'}
              </Button>
            ) : (
              <div className="text-center text-sm text-green-600 py-2 bg-green-50 rounded-lg">
                ✅ Thanks for rating! Your feedback helps the community.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <RateAttendeeModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        eventName={event.title}
        attendees={attendees}
        onRatingSubmit={handleRatingSubmit}
      />
    </>
  );
};

export default PostEventChatMessage;
