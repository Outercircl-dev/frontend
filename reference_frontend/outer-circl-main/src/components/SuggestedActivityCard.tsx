
import React from 'react';
import { Calendar, MapPin, Users, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge as BadgeComponent } from '@/components/ui/badge';
import { EventData } from '@/components/ActivityCard';

interface SuggestedActivityCardProps {
  event: EventData;
  onCreateFromSuggestion?: (event: EventData) => void;
}

const SuggestedActivityCard: React.FC<SuggestedActivityCardProps> = ({
  event,
  onCreateFromSuggestion,
}) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Check if this is a core activity (max 4 participants)
  const isCoreActivity = event.maxAttendees === 4;

  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white">
      <div className="relative">
        <img 
          src={event.imageUrl} 
          alt={event.title}
          className="w-full h-40 object-cover"
        />
        <div className="absolute top-2 right-2">
          <BadgeComponent className="bg-brand-purple/70 hover:bg-brand-purple text-white">
            AI Suggested
          </BadgeComponent>
        </div>
        
        {/* Core Activity Icon */}
        {isCoreActivity && (
          <div className="absolute top-2 left-2 h-6 w-6 rounded-full bg-[#E60023]/90 backdrop-blur-sm flex items-center justify-center">
            <Activity className="h-3 w-3 text-white" />
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-semibold text-lg">{event.title}</h3>
          {isCoreActivity && (
            <Activity className="h-3 w-3 text-[#E60023]" />
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {event.description}
        </p>
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            <span>{formatDate(event.date)} • {event.time}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mr-2" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="h-4 w-4 mr-2" />
            <span>Suggested attendees: {event.attendees || 0}</span>
            {isCoreActivity && (
              <span className="ml-1 text-[#E60023] font-medium">(Core)</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Avatar className="h-8 w-8 mr-2">
              <AvatarImage src={event.host.avatar} />
              <AvatarFallback>
                {event.host.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{event.host.name}</span>
          </div>
          {onCreateFromSuggestion && (
            <Button 
              size="sm" 
              className="bg-[#E60023] hover:bg-[#D50C22]"
              onClick={() => onCreateFromSuggestion(event)}
            >
              Create Activity
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuggestedActivityCard;
