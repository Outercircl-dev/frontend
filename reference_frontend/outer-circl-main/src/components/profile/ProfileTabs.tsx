import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Camera, Calendar, Users, History } from 'lucide-react';
import EnhancedProfileActivityCard from './EnhancedProfileActivityCard';
import PhotoGrid from '../PhotoGrid';
import FriendsList from './FriendsList';
import { getUserPhotos } from '@/utils/photoStorage';
import { EventData } from '../ActivityCard';
import { useFriends } from '@/hooks/useFriends';
import { useUserEvents } from '@/hooks/useUserEvents';
import { useUpcomingAttendedEvents } from '@/hooks/useUpcomingAttendedEvents';

interface ProfileTabsProps {
  isCurrentUser: boolean;
  userId: string;
}

const ProfileTabs: React.FC<ProfileTabsProps> = ({ isCurrentUser, userId }) => {
  const [activeTab, setActiveTab] = useState('activities');
  const { friends, loading: friendsLoading } = useFriends(userId);
  const { events: userEvents, loading: eventsLoading } = useUserEvents(userId);
  const { events: upcomingAttendedEvents, loading: attendedLoading } = useUpcomingAttendedEvents(userId);
  // Convert database events to EventData format for components
  const convertToEventData = (events: any[]): EventData[] => {
    return events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description || '',
      location: event.location || '',
      date: event.date,
      time: event.time || '',
      maxAttendees: event.max_attendees || 0,
      attendees: 0, // Would need to fetch participant count
      categories: event.category ? [event.category] : [],
      imageUrl: event.image_url || '',
      isPinned: false,
      host: {
        name: 'You',
        avatar: ''
      }
    }));
  };

  // Deduplicate events by ID (user might both host and attend the same event)
  const eventMap = new Map();
  
  // Add hosted events first (these take priority)
  userEvents.upcomingEvents.forEach(event => {
    eventMap.set(event.id, event);
  });
  
  // Add attended events only if not already in the map
  upcomingAttendedEvents.forEach(event => {
    if (!eventMap.has(event.id)) {
      eventMap.set(event.id, event);
    }
  });
  
  // Convert to array and sort by date
  const uniqueEvents = Array.from(eventMap.values());
  console.log(`[ProfileTabs] Total events before deduplication: ${userEvents.upcomingEvents.length + upcomingAttendedEvents.length}, after: ${uniqueEvents.length}`);
  
  const upcomingActivities = convertToEventData(uniqueEvents).sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  const past30DaysActivities = convertToEventData(userEvents.past30DaysEvents);

  // Combined loading state for both hosted and attended events
  const combinedEventsLoading = eventsLoading || attendedLoading;

  // Get user photos from localStorage - use the correct timestamp property
  const userPhotos = getUserPhotos().map(photo => ({
    id: photo.id,
    url: photo.url,
    caption: photo.caption,
    date: photo.timestamp || new Date().toISOString()
  }));

  const handlePinClick = (eventId: string, isPinned: boolean) => {
    console.log(`${isPinned ? 'Pinned' : 'Unpinned'} event ${eventId}`);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-none border-b">
          <TabsTrigger 
            value="activities" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Upcoming</span>
          </TabsTrigger>
          <TabsTrigger 
            value="past" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Past 30 Days</span>
          </TabsTrigger>
          <TabsTrigger 
            value="friends" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Friends</span>
          </TabsTrigger>
          <TabsTrigger 
            value="photos" 
            className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
          >
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Photos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activities" className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {isCurrentUser ? 'Upcoming Activities' : 'Upcoming Activities'}
            </h3>
            <span className="text-sm text-gray-500">{upcomingActivities.length} activities</span>
          </div>
          
          {combinedEventsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading activities...</p>
            </div>
          ) : upcomingActivities.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-600 mb-2">No upcoming activities</h4>
              <p className="text-gray-500">
                {isCurrentUser ? 'Create new activities to see them here' : 'This user has no upcoming activities'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingActivities.map((activity) => (
                <EnhancedProfileActivityCard
                  key={activity.id}
                  event={{
                    id: activity.id,
                    title: activity.title,
                    description: activity.description,
                    image_url: activity.imageUrl,
                    date: activity.date,
                    time: activity.time,
                    location: activity.location,
                    max_attendees: activity.maxAttendees,
                    category: activity.categories[0],
                    status: 'active'
                  }}
                  isLoggedIn={true}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Past 30 Days</h3>
            <span className="text-sm text-gray-500">{past30DaysActivities.length} activities</span>
          </div>
          
          {combinedEventsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading past activities...</p>
            </div>
          ) : past30DaysActivities.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-600 mb-2">No activities in past 30 days</h4>
              <p className="text-gray-500">
                {isCurrentUser ? 'Your activities from the past 30 days will appear here' : 'This user has no activities in the past 30 days'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {past30DaysActivities.map((activity) => (
                <EnhancedProfileActivityCard
                  key={activity.id}
                  event={{
                    id: activity.id,
                    title: activity.title,
                    description: activity.description,
                    image_url: activity.imageUrl,
                    date: activity.date,
                    time: activity.time,
                    location: activity.location,
                    max_attendees: activity.maxAttendees,
                    category: activity.categories[0],
                    status: 'completed'
                  }}
                  isLoggedIn={true}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="friends" className="p-6">
          <FriendsList 
            friends={friends}
            loading={friendsLoading}
            isCurrentUser={isCurrentUser}
          />
        </TabsContent>

        <TabsContent value="photos" className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Photos</h3>
            <span className="text-sm text-gray-500">{userPhotos.length} photos</span>
          </div>
          
          <PhotoGrid 
            photos={userPhotos}
            canView={true}
            isFriend={true}
            privacySetting="public"
            isCurrentUser={isCurrentUser}
          />
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default ProfileTabs;
