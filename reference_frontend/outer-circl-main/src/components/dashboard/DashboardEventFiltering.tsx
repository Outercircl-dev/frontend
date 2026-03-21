import React, { useEffect, useMemo, useState } from 'react';
import { EventData } from '@/components/ActivityCard';
import { getSuggestedEvents } from '@/utils/eventSuggestions';
import { CapacityFilterType } from './CapacityFilter';
import { useFriends } from '@/hooks/useFriends';
import { supabase } from '@/integrations/supabase/client';

interface DashboardEventFilteringProps {
  events: EventData[];
  activeTab: string;
  searchQuery: string;
  categoryFilters: string[];
  dateFilter: string | null;
  showFriendsActivities: boolean;
  capacityFilter: CapacityFilterType;
  setShowSuggestedEvents: (show: boolean) => void;
  setSuggestedEvents: (events: EventData[]) => void;
  children: (filteredEvents: EventData[]) => React.ReactNode;
}

const DashboardEventFiltering: React.FC<DashboardEventFilteringProps> = ({
  events,
  activeTab,
  searchQuery,
  categoryFilters,
  dateFilter,
  showFriendsActivities,
  capacityFilter,
  setShowSuggestedEvents,
  setSuggestedEvents,
  children
}) => {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [friendsParticipationData, setFriendsParticipationData] = useState<Record<string, string[]>>({});
  const { friends } = useFriends(currentUserId || undefined);

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Fetch friends participation data when friends or events change
  useEffect(() => {
    const fetchFriendsParticipation = async () => {
      if (!friends.length || !events.length) return;

      const friendIds = friends.map(friend => friend.id);
      const eventIds = events.map(event => event.id);

      try {
        const { data: participantsData } = await supabase
          .from('event_participants')
          .select('event_id, user_id')
          .in('user_id', friendIds)
          .in('event_id', eventIds)
          .eq('status', 'attending');

        if (participantsData) {
          const participationMap: Record<string, string[]> = {};
          participantsData.forEach(participant => {
            if (!participationMap[participant.event_id]) {
              participationMap[participant.event_id] = [];
            }
            participationMap[participant.event_id].push(participant.user_id);
          });
          setFriendsParticipationData(participationMap);
        }
      } catch (error) {
        console.error('Error fetching friends participation:', error);
      }
    };

    fetchFriendsParticipation();
  }, [friends, events]);

  // Use events directly since pin feature is removed
  const eventsWithPinned = events;

  // Memoize the filtering logic for better performance
  const filteredEvents = useMemo(() => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let filtered = eventsWithPinned.filter(event => {
      // Additional client-side filtering to ensure no past events show up
      if (event.date) {
        const eventDateTime = new Date(event.date);
        if (event.time && event.time !== '00:00') {
          const [hours, minutes] = event.time.split(':');
          eventDateTime.setHours(parseInt(hours), parseInt(minutes));
        } else {
          // For events without specific time, consider them valid if on today or future dates
          eventDateTime.setHours(23, 59, 59, 999);
        }
        
        // Skip events that have already passed
        if (eventDateTime < now) return false;
      }
      
      // Search filter
      if (searchQuery.trim() !== '') {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = 
          event.title.toLowerCase().includes(searchLower) || 
          event.description.toLowerCase().includes(searchLower) ||
          event.location.toLowerCase().includes(searchLower) ||
          (event.category && event.category.toLowerCase().includes(searchLower)) ||
          (event.categories && event.categories.some(cat => cat.toLowerCase().includes(searchLower)));
        
        if (!matchesSearch) return false;
      }
      
      // Category filters - check both single category and categories array
      if (categoryFilters.length > 0) {
        const hasMatchingCategory = 
          (event.category && categoryFilters.includes(event.category)) ||
          (event.categories && event.categories.some(cat => categoryFilters.includes(cat)));
        if (!hasMatchingCategory) return false;
      }
      
      // Date filter
      if (dateFilter) {
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);
        
        if (dateFilter === 'today') {
          if (eventDate.getTime() !== today.getTime()) return false;
        } else if (dateFilter === 'tomorrow') {
          if (eventDate.getTime() !== tomorrow.getTime()) return false;
        } else if (dateFilter === 'upcoming') {
          if (eventDate.getTime() <= tomorrow.getTime()) return false;
        }
      }
      
      // Capacity filter
      if (capacityFilter !== 'all') {
        const maxAttendees = event.maxAttendees || Number.MAX_SAFE_INTEGER;
        const isFull = event.attendees >= maxAttendees;
        
        if (capacityFilter === 'available' && isFull) return false;
        if (capacityFilter === 'full' && !isFull) return false;
      }
      
      // Tab filter
      if (activeTab === 'attending') {
        return event.isAttending === true;
      } else if (activeTab === 'saved') {
        return event.isSaved === true;
      }
      
      return activeTab === 'all';
    });

    // Friends activities filter
    if (showFriendsActivities && friends.length > 0) {
      // Filter events where friends are either hosting or participating
      filtered = filtered.filter(event => {
        const friendIds = friends.map(friend => friend.id);
        
        // Check if any friend is the host (using host_id from event data)
        const friendIsHost = event.hostId && friendIds.includes(event.hostId);
        
        // Check if any friend is participating in this event
        const friendParticipants = friendsParticipationData[event.id] || [];
        const friendIsParticipating = friendParticipants.some(participantId => 
          friendIds.includes(participantId)
        );
        
        return friendIsHost || friendIsParticipating;
      });
    }

    return filtered;
  }, [eventsWithPinned, activeTab, searchQuery, categoryFilters, dateFilter, capacityFilter, showFriendsActivities, friends, friendsParticipationData]);

  // Memoize sorted events to avoid re-sorting unnecessarily
  const sortedFilteredEvents = useMemo(() => {
    if (dateFilter === 'upcoming') {
      return [...filteredEvents].sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        return dateA.getTime() - dateB.getTime();
      });
    }
    return filteredEvents;
  }, [filteredEvents, dateFilter]);

  // Disable suggested events - no longer showing sample data
  useEffect(() => {
    setShowSuggestedEvents(false);
  }, [setShowSuggestedEvents]);

  return <>{children(sortedFilteredEvents)}</>;
};

export default React.memo(DashboardEventFiltering);