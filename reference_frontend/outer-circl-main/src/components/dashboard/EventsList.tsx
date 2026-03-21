
import React from 'react';
import { Calendar, Plus, Users, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ActivityCard, { EventData } from '@/components/ActivityCard';
import SuggestedActivityCard from '@/components/SuggestedActivityCard';

import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Badge as BadgeComponent } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';

interface ActivitiesListProps {
  events: EventData[];
  suggestedEvents: EventData[];
  showSuggestedEvents: boolean;
  showAds: boolean;
  isLoggedIn: boolean;
  categoryFilters: string[];
  friendsActivities?: (EventData & {
    friendsAttending?: {
      name: string;
      avatar?: string;
    }[];
  })[];
  isPremium?: boolean;
  membershipTier?: 'standard' | 'premium';
  onAttendClick: (eventId: string) => void;
  onPinClick?: (eventId: string, isPinned: boolean) => void;
  onCreateEventClick: () => void;
  onCreateFromSuggestion: (event: EventData) => void;
}

const EventsList: React.FC<ActivitiesListProps> = ({
  events,
  suggestedEvents,
  showSuggestedEvents,
  showAds,
  isLoggedIn,
  categoryFilters,
  friendsActivities = [],
  isPremium = false,
  membershipTier = 'standard',
  onAttendClick,
  onPinClick,
  onCreateEventClick,
  onCreateFromSuggestion
}) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Check if user can see friends' activities
  const canSeeFriendsActivities = membershipTier === 'premium';

  // Mobile-first Pinterest-style layout with responsive columns
  const renderMobileOptimizedGrid = () => {
    // Combine regular events with friends' activities for Pinterest style layout
    let allItems = [...events];
    
    // Insert friends' activities into the event feed if premium or higher tier
    if (canSeeFriendsActivities && friendsActivities.length > 0) {
      const combinedItems: (EventData | (EventData & { isFriendActivity?: boolean }))[] = [];
      
      // Spread events first
      events.forEach((event, index) => {
        combinedItems.push(event);
        
        // After every few events, add a friend activity if available
        if (index % 3 === 2 && friendsActivities[Math.floor(index/3) % friendsActivities.length]) {
          combinedItems.push({
            ...friendsActivities[Math.floor(index/3) % friendsActivities.length],
            isFriendActivity: true
          });
        }
      });
      
      // Add any remaining friend activities
      if (events.length < 3 && friendsActivities.length > 0) {
        combinedItems.push({
          ...friendsActivities[0],
          isFriendActivity: true
        });
      }
      
      allItems = combinedItems;
    }
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        {allItems.map((item, index) => {
          const isFriendActivity = 'isFriendActivity' in item && item.isFriendActivity;
          
          if (isFriendActivity) {
            // Render friend activity card with mobile optimizations
            const event = item as EventData & { 
              friendsAttending?: { name: string; avatar?: string }[];
              isFriendActivity?: boolean;
            };
            
            // Check if this is a core activity (max 4 participants)
            const isCoreActivity = event.maxAttendees === 4;
            
            return (
              <div key={`friend-${event.id}`} className="h-full">
                <Link to={`/event/${event.id}`} className="block h-full">
                  <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col h-full">
                    <div className="relative">
                      <AspectRatio ratio={4/3} className="w-full">
                        <img
                          src={event.imageUrl || '/placeholder.svg'}
                          alt={event.title}
                          className="w-full h-full object-cover hover:brightness-95 transition-all"
                        />
                      </AspectRatio>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <BadgeComponent className="bg-brand-salmon border-none text-white text-xs">
                          {formatDate(event.date)}
                        </BadgeComponent>
                      </div>
                      
                      {/* Core Activity Icon */}
                      {isCoreActivity && (
                        <div className="absolute top-2 left-2 h-6 w-6 rounded-full bg-[#E60023]/90 backdrop-blur-sm flex items-center justify-center">
                          <Circle className="h-3 w-3 text-white fill-current" />
                        </div>
                      )}
                    </div>
                    
                    <div className="p-3 sm:p-4 flex-1">
                      <div className="flex items-center mb-2">
                        <Users className="h-4 w-4 mr-2 text-brand-salmon" />
                        <span className="text-sm font-medium text-brand-salmon">Friends' Activity</span>
                        {isCoreActivity && (
                          <Circle className="h-3 w-3 ml-2 text-[#E60023] fill-current" />
                        )}
                      </div>
                      
                      <h4 className="font-medium text-sm sm:text-base mb-2 line-clamp-2">{event.title}</h4>
                      <p className="text-xs sm:text-sm text-gray-500 mb-2 line-clamp-1">{event.location}</p>
                      
                      <div className="hidden sm:block">
                        <BadgeComponent className="bg-gray-100 border-none text-gray-700 text-xs mb-2">
                          {formatDate(event.date)} at {event.time}
                        </BadgeComponent>
                      </div>
                      
                      {event.friendsAttending && (
                        <div className="mt-2 sm:mt-3">
                          <p className="text-xs text-gray-600 mb-1">Friends attending:</p>
                          <div className="flex -space-x-1 sm:-space-x-2 overflow-hidden">
                            {event.friendsAttending.slice(0, 4).map((friend, idx) => (
                              <Avatar key={idx} className="h-5 w-5 sm:h-6 sm:w-6 border-2 border-white">
                                <AvatarImage src={friend.avatar} />
                                <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                                  {friend.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {event.friendsAttending.length > 4 && (
                              <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-gray-200 text-gray-600 text-xs flex items-center justify-center border-2 border-white">
                                +{event.friendsAttending.length - 4}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            );
          } else {
            // Render regular event card
            return (
              <div key={item.id} className="h-full">
                <ActivityCard 
                  key={item.id} 
                  event={item} 
                  onAttendClick={onAttendClick}
                  isLoggedIn={isLoggedIn}
                  className="h-full"
                />
              </div>
            );
          }
        })}
        
        {/* Auto ads will handle in-feed ad placement automatically */}
      </div>
    );
  };

  return (
    <>
      {events.length > 0 ? (
        renderMobileOptimizedGrid()
      ) : showSuggestedEvents ? (
        <>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium flex items-center">
              <Calendar className="mr-2 h-5 w-5 text-brand-salmon" />
              <span className="text-sm sm:text-lg">Suggested Activities for {categoryFilters.join(", ")}</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4">
            {suggestedEvents.map((event) => (
              <SuggestedActivityCard 
                key={event.id} 
                event={event} 
                onCreateFromSuggestion={onCreateFromSuggestion}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8 sm:py-12 px-4">
          <Calendar className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg sm:text-xl font-medium mb-2">No activities found</h3>
          <p className="text-sm sm:text-base text-muted-foreground mb-4 px-2">
            Try adjusting your search or filters, or create a new activity.
          </p>
          <Button
            onClick={onCreateEventClick}
            className="mt-4 bg-brand-salmon hover:bg-brand-dark-salmon px-6 py-2 text-sm"
            variant="pinterest"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Activity
          </Button>
        </div>
      )}
    </>
  );
};

export default EventsList;
