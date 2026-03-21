import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMembership, useLanguage } from '@/components/optimization/UltraMinimalProviders';
import { PinterestDashboardSkeleton } from './PinterestDashboardSkeleton';
import Navbar from '@/components/Navbar';
import DashboardFilters from './DashboardFilters';
import DashboardHeader from './DashboardHeader';
import ScrollToTopButton from './ScrollToTopButton';
import { DashboardPerformanceMonitor } from './DashboardPerformanceMonitor';
import { DashboardAnalytics } from './DashboardAnalytics';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { CapacityFilterType } from './CapacityFilter';
import { useConsolidatedDashboard } from '@/hooks/useConsolidatedDashboard';
import { EventGrid } from './EventGrid';
import { EventData } from '@/components/ActivityCard';
import AdDebugInfo from '@/components/ads/AdDebugInfo';

interface OptimizedDashboardProps {
  userId: string;
  isMobile: boolean;
}

export const OptimizedDashboard: React.FC<OptimizedDashboardProps> = ({ 
  userId, 
  isMobile 
}) => {
  const navigate = useNavigate();
  const { membershipTier, showAds } = useMembership();
  const { t } = useLanguage();
  
  // Dashboard filters state - initialize with defaults for faster loading
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState('all');
  const [capacityFilter, setCapacityFilter] = useState<CapacityFilterType>('all');
  const [showFriendsActivities, setShowFriendsActivities] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Load events using consolidated dashboard hook
  const {
    events: consolidatedEvents,
    savedEventIds,
    isLoading,
    isInitialLoading,
    error,
    refreshEvents,
    handleAttendClick,
    handleSaveClick
  } = useConsolidatedDashboard(userId);

  // Transform events to ActivityCard format
  const events: EventData[] = consolidatedEvents.map(event => ({
    id: event.id,
    title: event.title,
    description: event.description,
    imageUrl: event.image_url,
    date: event.date,
    time: event.time,
    location: event.location,
    attendees: event.attendees.length,
    maxAttendees: event.capacity,
    category: event.category,
    host: {
      name: 'Host', // TODO: Get from event data
      avatar: undefined
    },
    hostId: event.created_by,
    isAttending: false, // TODO: Get from user data
    isSaved: savedEventIds.has(event.id)
  }));

  // Handle scroll for back to top button - debounced for performance
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setShowBackToTop(window.scrollY > 400);
      }, 100); // Debounce scroll events
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, []);

  // Simplified performance tracking
  const loadingStartTime = React.useRef<number>(Date.now());

  useEffect(() => {
    if (!isLoading && !isInitialLoading) {
      const loadTime = Date.now() - loadingStartTime.current;
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎯 Dashboard loaded in ${loadTime}ms`);
      }
    }
  }, [isLoading, isInitialLoading]);

  // Show Pinterest-style skeleton while loading
  if (isInitialLoading) {
    return <PinterestDashboardSkeleton isMobile={isMobile} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Beta Banner */}
      <div className="bg-primary text-background text-center py-1 text-xs font-medium">
        {membershipTier === 'premium' 
          ? 'Beta Version - Sign up to the Buzz for exclusive offers!' 
          : 'Beta Version - Sign up today for Premium Membership offers!'
        }
      </div>
      
      {/* Navbar */}
      <Navbar 
        isLoggedIn={true} 
        username="User" // This should come from profile data
      />
      
      {/* Main Content */}
      <main className={`flex-1 container mx-auto px-4 ${isMobile ? 'py-4' : 'py-6'}`}>
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
        
        {/* Header Section */}
        <div className="mb-6">
          <DashboardHeader
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isLoggedIn={true}
            onCreateEventClick={() => navigate('/create-event')}
          />
        </div>

        {/* Search Results Info */}
        {searchQuery.trim() && (
          <div className="mb-4 px-2">
            <p className="text-sm text-muted-foreground">
              Search results for "{searchQuery}"
            </p>
          </div>
        )}
        
        {/* Event Grid */}
        {events.length > 0 ? (
          <EventGrid
            events={events}
            onAttendClick={handleAttendClick}
            onSaveClick={handleSaveClick}
            isLoggedIn={true}
            currentUserId={userId}
          />
        ) : (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">Welcome to outercircl!</h2>
            <p className="text-muted-foreground mb-8">Find amazing activities and connect with your community</p>
            <Button 
              onClick={() => navigate('/create-event')}
              className="bg-primary hover:bg-primary/90"
            >
              Create Your First Activity
            </Button>
          </div>
        )}
      </main>
      
      {/* Scroll to Top Button */}
      <ScrollToTopButton visible={showBackToTop} />
      
      {/* Development Tools */}
      {process.env.NODE_ENV === 'development' && (
        <>
          {/* Manual refresh button */}
          <div className="fixed bottom-20 right-4 z-40">
            <Button
              onClick={refreshEvents}
              variant="outline"
              size="sm"
              className="gap-2 shadow-lg"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh ({events.length})
            </Button>
          </div>
          
          {/* Simplified Analytics */}
          <div className="fixed bottom-32 right-4 bg-background border rounded p-2 text-xs">
            Events: {events.length}
          </div>
          
          {/* Performance Monitor */}
          <DashboardPerformanceMonitor
            isLoading={isLoading || isInitialLoading}
            error={error}
            eventCount={events.length}
            onRefresh={refreshEvents}
            loadingStartTime={loadingStartTime.current}
          />
        </>
      )}
      
      {/* Ad Debug Info */}
      <AdDebugInfo />
    </div>
  );
};