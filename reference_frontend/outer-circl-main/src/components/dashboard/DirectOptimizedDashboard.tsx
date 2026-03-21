import React, { useState, useEffect, useMemo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAppContext } from '@/components/optimization/UltraMinimalProviders';
import Navbar from '@/components/Navbar';
import { PinterestDashboardSkeleton } from './PinterestDashboardSkeleton';
import DashboardFilters from './DashboardFilters';
import { EventGrid } from './EventGrid';
import { DashboardPerformanceMonitor } from './DashboardPerformanceMonitor';
import { MessageQueueMonitor } from './MessageQueueMonitor';
import ScrollToTopButton from './ScrollToTopButton';
import { ResourceHints } from './ResourceHints';
import { UnifiedEventData } from '@/hooks/useUnifiedDashboard';
import { CapacityFilterType } from './CapacityFilter';
import { loadAdSense } from '@/utils/adSenseLoader';
import { useFriends } from '@/hooks/useFriends';
import { supabase } from '@/integrations/supabase/client';

interface DirectOptimizedDashboardProps {
  userId: string;
  isMobile: boolean;
  events: UnifiedEventData[];
  savedEventIds: string[];
  isLoading: boolean;
  isInitialLoading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onAttendClick: (eventId: string) => Promise<void>;
  onSaveClick: (eventId: string, shouldSave: boolean) => Promise<void>;
  prefetchEventDetails?: (eventId: string) => Promise<void>;
}

/**
 * Phase 3: Direct dashboard component that receives data as props
 * No hooks, pure rendering component for better performance
 */
export const DirectOptimizedDashboard: React.FC<DirectOptimizedDashboardProps> = ({
  userId,
  isMobile,
  events,
  savedEventIds,
  isLoading,
  isInitialLoading,
  error,
  onRefresh,
  onAttendClick,
  onSaveClick,
  prefetchEventDetails
}) => {
  const { membershipTier, user } = useAppContext();
  const actualIsMobile = useIsMobile();
  
  // Phase 4: Performance Infrastructure - Track render performance
  const [renderCount, setRenderCount] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [capacityFilter, setCapacityFilter] = useState<CapacityFilterType>('all');
  const [showFriendsActivities, setShowFriendsActivities] = useState(false);

  // Friends data for filtering
  const { friends } = useFriends(userId);
  const [friendsParticipationData, setFriendsParticipationData] = useState<Record<string, string[]>>({});

  // Phase 4: Performance monitoring (Fixed: removed renderCount from deps to prevent infinite loop)
  useEffect(() => {
    const newCount = renderCount + 1;
    setRenderCount(newCount);
    console.log(`🎨 DirectDashboard render #${newCount}`, {
      eventsCount: events.length,
      isLoading,
      isInitialLoading,
      error,
      userId: userId?.substring(0, 8)
    });
  }, [events.length, isLoading, isInitialLoading, error, userId]);

  // Scroll to top functionality
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // PHASE 3 FIX: Load AdSense after dashboard renders
  useEffect(() => {
    // Wait for dashboard to be fully rendered before loading ads
    const adLoadTimer = setTimeout(() => {
      loadAdSense();
    }, 2000);

    return () => clearTimeout(adLoadTimer);
  }, []);

  // Fetch friends participation data when friends or events change
  useEffect(() => {
    const fetchFriendsParticipation = async () => {
      if (!friends.length || !events.length || !showFriendsActivities) return;

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

    if (showFriendsActivities) {
      fetchFriendsParticipation();
    }
  }, [friends, events, showFriendsActivities]);

  // Phase 3: Client-side data transformation and filtering (moved from server)
  const filteredAndTransformedEvents = useMemo(() => {
    console.log('🔄 Client-side event transformation and filtering started', events.length);
    const start = performance.now();
    
    // First transform the events
    const transformed = events.map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      imageUrl: event.imageUrl,
      date: event.date,
      time: event.time,
      location: event.location,
      attendees: event.attendees || 0, // Use actual attendees count, not maxAttendees
      maxAttendees: event.maxAttendees || 4, // Include maxAttendees for capacity checks
      category: event.categories?.[0] || 'other',
      host: {
        id: event.hostId,
        name: event.host?.name || 'Unknown Host',
        avatar: event.host?.avatar
      },
      isAttending: savedEventIds.includes(event.id),
      isPinned: false
    }));

    // Then apply client-side filtering
    let filtered = transformed;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.location.toLowerCase().includes(query)
      );
    }

    // Apply category filters
    if (categoryFilters.length > 0) {
      filtered = filtered.filter(event => 
        categoryFilters.includes(event.category)
      );
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      filtered = filtered.filter(event => {
        const eventDate = new Date(event.date);
        switch (dateFilter) {
          case 'today':
            return eventDate.toDateString() === today.toDateString();
          case 'tomorrow':
            return eventDate.toDateString() === tomorrow.toDateString();
          case 'this_week':
            return eventDate >= today && eventDate <= nextWeek;
          default:
            return true;
        }
      });
    }

    // Apply capacity filter
    if (capacityFilter !== 'all') {
      filtered = filtered.filter(event => {
        const maxAttendees = event.maxAttendees || Number.MAX_SAFE_INTEGER;
        const isFull = event.attendees >= maxAttendees;
        switch (capacityFilter) {
          case 'available':
            return !isFull;
          case 'full':
            return isFull;
          default:
            return true;
        }
      });
    }

    // Apply friends activities filter
    if (showFriendsActivities && friends.length > 0) {
      filtered = filtered.filter(event => {
        const friendIds = friends.map(friend => friend.id);
        
        // Check if any friend is the host
        const friendIsHost = event.host?.id && friendIds.includes(event.host.id);
        
        // Check if any friend is participating in this event
        const friendParticipants = friendsParticipationData[event.id] || [];
        const friendIsParticipating = friendParticipants.some(participantId => 
          friendIds.includes(participantId)
        );
        
        return friendIsHost || friendIsParticipating;
      });
      
      console.log(`👥 Friends filter applied: ${filtered.length} activities with friends`);
    }
    
    const duration = performance.now() - start;
    console.log(`⚡ Client transformation and filtering completed in ${duration.toFixed(2)}ms`, {
      original: events.length,
      filtered: filtered.length
    });
    
    return filtered;
  }, [events, savedEventIds, searchQuery, categoryFilters, dateFilter, capacityFilter, showFriendsActivities, friends, friendsParticipationData]);

  // Phase 8: Progressive render ONLY during active network fetch
  // If we have cached data, show it ALL immediately
  const shouldProgressiveRender = isLoading && !isInitialLoading;
  const [visibleEventCount, setVisibleEventCount] = useState(
    shouldProgressiveRender ? 12 : filteredAndTransformedEvents.length
  );
  
  useEffect(() => {
    // Only use progressive loading when actively fetching from network
    if (shouldProgressiveRender && filteredAndTransformedEvents.length > visibleEventCount) {
      const timer = setTimeout(() => {
        setVisibleEventCount(prev => Math.min(prev + 12, filteredAndTransformedEvents.length));
      }, 100);
      return () => clearTimeout(timer);
    } else if (!isLoading) {
      // Show all events immediately when not loading
      setVisibleEventCount(filteredAndTransformedEvents.length);
    }
  }, [filteredAndTransformedEvents.length, visibleEventCount, isLoading, shouldProgressiveRender]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleEventCount(12);
  }, [searchQuery, categoryFilters, dateFilter, capacityFilter]);

  const visibleEvents = filteredAndTransformedEvents.slice(0, visibleEventCount);
  const hasMoreEvents = visibleEventCount < filteredAndTransformedEvents.length;

  // Phase 8: Removed defensive timeout - trust the architecture

  // Phase 4: Show cached content immediately, skeleton only on true cold start
  if (isInitialLoading && events.length === 0) {
    return <PinterestDashboardSkeleton isMobile={actualIsMobile} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Phase 5: Resource hints for performance */}
      <ResourceHints />
      
      {/* Phase 4: Subtle loading indicator overlay for background refresh */}
      {isLoading && events.length > 0 && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-background/95 backdrop-blur-sm border border-border shadow-lg rounded-full px-4 py-2 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-muted-foreground">Updating...</span>
          </div>
        </div>
      )}
      {/* Beta Banner */}
      <div className="bg-primary text-background text-center py-1 text-xs font-medium">
        {membershipTier === 'premium' 
          ? 'Beta Version - Sign up to the Buzz for exclusive offers!' 
          : 'Beta Version - Sign up today for Premium Membership offers!'
        }
      </div>
      
      {/* Navbar with error boundary */}
      <div className="bg-background border-b">
        <Navbar 
          isLoggedIn={!!user} 
          username={user?.user_metadata?.username || user?.user_metadata?.name || 'User'}
          avatarUrl={user?.user_metadata?.avatar_url}
        />
      </div>
      
      {/* Main Content */}
      <main className={`flex-1 container mx-auto px-4 ${actualIsMobile ? 'py-4' : 'py-6'}`}>
        {/* Phase 4: Error Display with Fallback */}
        {error && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive text-sm">
              Unable to load some data: {error}
            </p>
            <button 
              onClick={onRefresh}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Filters Section */}
        <div className="mb-6">
          <DashboardFilters
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            categoryFilters={categoryFilters}
            setCategoryFilters={setCategoryFilters}
            capacityFilter={capacityFilter}
            setCapacityFilter={setCapacityFilter}
            showFriendsActivities={showFriendsActivities}
            setShowFriendsActivities={setShowFriendsActivities}
          />
        </div>

        {/* Friends filter feedback */}
        {showFriendsActivities && friends.length === 0 && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              You haven't added any friends yet. Add friends to see their activities!
            </p>
          </div>
        )}

        {showFriendsActivities && friends.length > 0 && filteredAndTransformedEvents.length === 0 && !isLoading && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              None of your {friends.length} friends are hosting or attending activities right now.
            </p>
          </div>
        )}
        
        {/* Header Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-foreground">
              Activities for you
            </h1>
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={onRefresh}
                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Refresh Data
              </button>
            )}
          </div>
        </div>

        {/* Events Grid with Partial Rendering */}
        {visibleEvents.length > 0 ? (
          <>
            <EventGrid
              events={visibleEvents}
              onAttendClick={onAttendClick}
              onSaveClick={onSaveClick}
              isLoggedIn={true}
              currentUserId={userId}
              prefetchEventDetails={prefetchEventDetails}
            />
            
            {/* Phase 8: Only show loading for network fetches, not cached data */}
            {hasMoreEvents && isLoading && (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Loading more activities...</span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {isLoading ? 'Loading activities...' : 'No activities found'}
            </p>
            {!isLoading && (
              <button
                onClick={() => {
                  try {
                    window.location.href = '/create-event';
                  } catch (error) {
                    console.error('Navigation error:', error);
                  }
                }}
                className="bg-primary text-primary-foreground px-6 py-2 rounded-full hover:bg-primary/90 transition-colors"
              >
                Create Your First Activity
              </button>
            )}
          </div>
        )}

        {/* Phase 4-6: Performance Debug Info (Development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 space-y-4">
            <DashboardPerformanceMonitor 
              isLoading={isLoading}
              error={error}
              eventCount={events.length}
              onRefresh={onRefresh}
            />
            <MessageQueueMonitor />
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              Renders: {renderCount} | Events: {events.length} | Filtered: {filteredAndTransformedEvents.length} | Visible: {visibleEventCount}
            </div>
          </div>
        )}
      </main>

      {/* Scroll to Top Button */}
      {showScrollTop && <ScrollToTopButton visible={showScrollTop} />}
    </div>
  );
};