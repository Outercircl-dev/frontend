import React from 'react';
import ActivityCard, { EventData } from '@/components/ActivityCard';

interface EventGridProps {
  events: EventData[];
  onAttendClick?: (eventId: string) => void;
  onSaveClick?: (eventId: string, isSaved: boolean) => Promise<void>;
  isLoggedIn?: boolean;
  currentUserId?: string;
  className?: string;
  prefetchEventDetails?: (eventId: string) => void;
}

export const EventGrid: React.FC<EventGridProps> = ({
  events,
  onAttendClick,
  onSaveClick,
  isLoggedIn = false,
  currentUserId,
  className = "",
  prefetchEventDetails
}) => {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className={`columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4 ${className}`}>
      {events.map((event) => (
        <div 
          key={event.id} 
          className="break-inside-avoid mb-4"
          onMouseEnter={() => prefetchEventDetails?.(event.id)}
        >
          <ActivityCard 
            event={event} 
            onAttendClick={onAttendClick}
            onSaveClick={onSaveClick}
            isLoggedIn={isLoggedIn}
            currentUserId={currentUserId}
          />
        </div>
      ))}
    </div>
  );
};