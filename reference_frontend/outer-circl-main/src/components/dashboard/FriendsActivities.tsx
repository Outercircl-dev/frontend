
import React from 'react';
import { Users, Calendar, Circle } from 'lucide-react';
import { Badge as BadgeComponent } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { EventData } from '@/components/ActivityCard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { FriendActivitySkeleton } from '@/components/ui/loading-skeleton';
import { LoadingIndicator } from '@/components/ui/loading-indicator';

interface FriendsActivitiesProps {
  events: (EventData & {
    friendsAttending?: {
      name: string;
      avatar?: string;
    }[];
  })[];
  membershipTier?: 'standard' | 'premium';
  isLoading?: boolean;
}

const FriendsActivities: React.FC<FriendsActivitiesProps> = ({ 
  events, 
  membershipTier = 'standard',
  isLoading = false
}) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Filter events - only premium users can see friends' activities
  const filteredEvents = membershipTier === 'premium' ? events : [];

  if (isLoading) {
    return (
      <div className="space-y-4 bg-[#F9F9F9] p-5 rounded-xl">
        <h3 className="font-semibold text-lg flex items-center">
          <Users className="h-5 w-5 mr-2 text-[#E60023]" />
          Friends' Activities
        </h3>
        <div className="flex flex-col space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <FriendActivitySkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }
  
  if (!events || events.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center">
        <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-muted-foreground">No friend activities to display</p>
      </div>
    );
  }
  
  if (filteredEvents.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center">
        {membershipTier === 'standard' ? (
          <>
            <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-muted-foreground">Friends' activities available with Premium</p>
            <p className="text-xs text-gray-500 mt-2">
              Upgrade to Premium to see activities your friends will attend
            </p>
          </>
        ) : (
          <>
            <Users className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-muted-foreground">No friend activities to display</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 bg-[#F9F9F9] p-5 rounded-xl">
      <h3 className="font-semibold text-lg flex items-center">
        <Users className="h-5 w-5 mr-2 text-[#E60023]" />
        Friends' Activities
      </h3>
      
      <div className="flex flex-col space-y-6">
        {filteredEvents.map((event) => {
          // Check if this is a core activity (max 5 participants)
          const isCoreActivity = event.maxAttendees === 5;
          
          return (
            <Link to={`/event/${event.id}`} key={event.id} className="block">
              <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
                <div className="relative">
                  <AspectRatio ratio={4/3} className="w-full">
                    <img
                      src={event.imageUrl || '/placeholder.svg'}
                      alt={event.title}
                      className="w-full h-full object-cover hover:brightness-95 transition-all"
                    />
                  </AspectRatio>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <BadgeComponent className="bg-[#E60023] border-none text-white text-xs">
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
                
                <div className="p-4 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-base">{event.title}</h4>
                    {isCoreActivity && (
                      <Circle className="h-3 w-3 text-[#E60023] fill-current" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{event.location}</p>
                  
                  <div className="hidden sm:block">
                    <BadgeComponent className="bg-[#E60023] border-none text-white text-xs mb-2">
                      {formatDate(event.date)} at {event.time}
                    </BadgeComponent>
                  </div>
                  
                  {event.friendsAttending && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 mb-1">Friends attending:</p>
                      <div className="flex -space-x-2 overflow-hidden">
                        {event.friendsAttending.slice(0, 4).map((friend, idx) => (
                          <Avatar key={idx} className="h-6 w-6 border-2 border-white">
                            <AvatarImage src={friend.avatar} />
                            <AvatarFallback className="bg-gray-200 text-gray-600 text-xs">
                              {friend.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {event.friendsAttending.length > 4 && (
                          <div className="h-6 w-6 rounded-full bg-gray-200 text-gray-600 text-xs flex items-center justify-center border-2 border-white">
                            +{event.friendsAttending.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
      
      {membershipTier === 'standard' && (
        <div className="mt-4 p-3 bg-gradient-to-r from-pink-50 to-red-50 rounded-lg text-center">
          <p className="text-sm text-gray-700">
            Upgrade to Premium to see activities your friends will attend
          </p>
        </div>
      )}
    </div>
  );
};

export default FriendsActivities;
