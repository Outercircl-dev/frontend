
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import { toast } from 'sonner';

interface Attendee {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface RateAttendeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventName: string;
  attendees: Attendee[];
  onRatingSubmit: (attendeeId: string, rating: number) => void;
}

const RateAttendeeModal: React.FC<RateAttendeeModalProps> = ({
  isOpen,
  onClose,
  eventName,
  attendees,
  onRatingSubmit
}) => {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [hoveredRatings, setHoveredRatings] = useState<Record<string, number>>({});
  const [currentAttendeeIndex, setCurrentAttendeeIndex] = useState(0);

  const handleStarClick = (attendeeId: string, rating: number) => {
    setRatings(prev => ({ ...prev, [attendeeId]: rating }));
  };

  const handleStarHover = (attendeeId: string, rating: number) => {
    setHoveredRatings(prev => ({ ...prev, [attendeeId]: rating }));
  };

  const handleStarLeave = (attendeeId: string) => {
    setHoveredRatings(prev => {
      const newRatings = { ...prev };
      delete newRatings[attendeeId];
      return newRatings;
    });
  };

  const handleNext = () => {
    const attendeeId = attendees[currentAttendeeIndex].id;
    const rating = ratings[attendeeId] || 0;
    
    if (rating === 0) {
      toast.error("Please select a rating before continuing");
      return;
    }
    
    onRatingSubmit(attendeeId, rating);
    
    if (currentAttendeeIndex < attendees.length - 1) {
      setCurrentAttendeeIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handleSkip = () => {
    if (currentAttendeeIndex < attendees.length - 1) {
      setCurrentAttendeeIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const currentAttendee = attendees[currentAttendeeIndex];
  const displayRating = hoveredRatings[currentAttendee?.id] || ratings[currentAttendee?.id] || 0;

  if (!currentAttendee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center mb-2">Rate Attendees</DialogTitle>
          <DialogDescription className="text-center">
            Thank you for participating in <span className="font-semibold">{eventName}</span>! 
            <br />Please rate the reliability of the other attendees.
          </DialogDescription>
        </DialogHeader>
        
        <div className="my-6 flex flex-col items-center">
          <Avatar className="h-20 w-20 mb-4">
            <AvatarImage src={currentAttendee.avatarUrl} alt={currentAttendee.name} />
            <AvatarFallback className="bg-brand-purple text-white">
              {currentAttendee.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <h3 className="font-medium text-lg mb-1">{currentAttendee.name}</h3>
          <p className="text-sm text-muted-foreground mb-6">How would you rate their reliability?</p>
          
          <div className="flex gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="focus:outline-none transition-transform hover:scale-110"
                onClick={() => handleStarClick(currentAttendee.id, star)}
                onMouseEnter={() => handleStarHover(currentAttendee.id, star)}
                onMouseLeave={() => handleStarLeave(currentAttendee.id)}
              >
                <Star 
                  size={32} 
                  className={`${star <= displayRating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`} 
                />
              </button>
            ))}
          </div>
          
          <p className="text-sm font-medium h-5">
            {displayRating > 0 ? (
              <>
                {displayRating === 1 && "Poor reliability"}
                {displayRating === 2 && "Below average reliability"}
                {displayRating === 3 && "Average reliability"}
                {displayRating === 4 && "Good reliability"}
                {displayRating === 5 && "Excellent reliability"}
              </>
            ) : null}
          </p>
          
          <div className="mt-8 flex gap-3 w-full">
            <Button variant="outline" onClick={handleSkip} className="flex-1">
              Skip
            </Button>
            <Button onClick={handleNext} className="flex-1 bg-brand-purple hover:bg-brand-light-purple">
              {currentAttendeeIndex < attendees.length - 1 ? "Next" : "Finish"}
            </Button>
          </div>
          
          <div className="mt-4 text-center text-xs text-muted-foreground">
            Attendee {currentAttendeeIndex + 1} of {attendees.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RateAttendeeModal;
