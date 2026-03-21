import React from 'react';
import Navbar from '@/components/Navbar';
import { useMembership, useLanguage } from '@/components/OptimizedProviders';
import { useAppContext } from '@/components/OptimizedProviders';
import { TimeoutAwareLoadingIndicator } from '@/components/ui/loading-indicator';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';

// Import unified dashboard hook
import { useDashboard } from '@/hooks/useDashboard';
import DashboardContainer from '@/components/dashboard/DashboardContainer';
import DashboardFilters from '@/components/dashboard/DashboardFilters';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import SimplifiedDashboardEvents from '@/components/dashboard/SimplifiedDashboardEvents';
import DashboardEventFiltering from '@/components/dashboard/DashboardEventFiltering';
import DashboardTabs from '@/components/dashboard/DashboardTabs';
import ScrollToTopButton from '@/components/dashboard/ScrollToTopButton';

import { DashboardPerformanceMonitor } from '@/components/dashboard/DashboardPerformanceMonitor';

const DesktopDashboard: React.FC = () => {
  // Phase 1: AppBootstrap guarantees context is ready
  const { user } = useAppContext();
  const navigate = useNavigate();

  console.log('💻 DesktopDashboard: Rendering for user:', user?.id);

  // If no user, show loading while redirect happens
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E60023] mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // ALL HOOKS MUST BE CALLED AFTER EARLY RETURNS
  const { membershipTier, showAds } = useMembership();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  
  // All hooks must be called unconditionally at the top - UNIFIED HOOK
  const {
    events,
    setEvents,
    savedEventIds,
    setSavedEventIds,
    isLoading,
    error,
    refreshEvents
  } = useDashboard(user?.id);

  console.log('💻 DesktopDashboard: After all hooks - rendering full desktop dashboard');

  const handleLoadingTimeout = () => {
    console.log('Loading timeout reached on mobile:', isMobile);
    refreshEvents();
  };

  try {
    return (
      <DashboardContainer>
        {(state) => {
          if (isLoading) {
            return (
              <div className="min-h-screen flex flex-col bg-gray-50">
                <Navbar isLoggedIn={true} username={user?.email?.split('@')[0] || "User"} />
                <main className="flex-1 container py-6">
                  <TimeoutAwareLoadingIndicator 
                    onTimeout={handleLoadingTimeout}
                    text={t('loading.activities')}
                    timeout={10000}
                  />
                </main>
              </div>
            );
          }

          return (
            <div className="min-h-screen flex flex-col bg-gray-50">
              {/* Beta Banner */}
              <div className="bg-[#E60023] text-white text-center py-1 text-xs font-medium">
                {membershipTier === 'premium' ? 'Beta Version - Sign up to the Buzz for exclusive offers!' : 'Beta Version - Sign up today for Premium Membership offers!'}
              </div>
              
              <Navbar isLoggedIn={true} username={user?.email?.split('@')[0] || "User"} />
              
              <main className="flex-1 container py-6">
                <div className="flex gap-6">
                  <div className="flex-1">
                    <div className="mb-8">
                      <DashboardFilters
                        dateFilter={state.dateFilter}
                        setDateFilter={state.setDateFilter}
                        categoryFilters={state.categoryFilters}
                        setCategoryFilters={state.setCategoryFilters}
                        capacityFilter={state.capacityFilter}
                        setCapacityFilter={state.setCapacityFilter}
                        showFriendsActivities={state.showFriendsActivities}
                        setShowFriendsActivities={state.setShowFriendsActivities}
                      />
                    </div>
                    
                    {/* Desktop header */}
                    <div className="mb-4">
                      <DashboardHeader
                        searchQuery={state.searchQuery}
                        setSearchQuery={state.setSearchQuery}
                        isLoggedIn={true}
                        onCreateEventClick={() => navigate('/create-event')}
                      />
                    </div>
                
                {/* Show search results info */}
                {state.searchQuery.trim() && (
                  <div className="mb-4 px-2">
                    <p className="text-sm text-muted-foreground">
                      {t('dashboard.searchResults')} "{state.searchQuery}"
                    </p>
                  </div>
                )}
                
                <SimplifiedDashboardEvents
                  events={events}
                  setEvents={setEvents}
                  currentUserId={user.id}
                  isLoggedIn={true}
                  savedEventIds={savedEventIds}
                  setSavedEventIds={setSavedEventIds}
                >
                  {({ handleAttendClick, handleSaveEvent, handleCreateEventClick, handleCreateFromSuggestion }) => (
                    <DashboardEventFiltering
                      events={events}
                      activeTab={state.activeTab}
                      searchQuery={state.searchQuery}
                      categoryFilters={state.categoryFilters}
                      dateFilter={state.dateFilter}
                      showFriendsActivities={state.showFriendsActivities}
                      capacityFilter={state.capacityFilter}
                      
                      setShowSuggestedEvents={state.setShowSuggestedEvents}
                      setSuggestedEvents={state.setSuggestedEvents}
                    >
                      {(finalFilteredEvents) => (
                        <DashboardTabs
                          activeTab={state.activeTab}
                          setActiveTab={state.setActiveTab}
                          filteredEvents={finalFilteredEvents}
                          showSuggestedEvents={state.showSuggestedEvents}
                          suggestedEvents={state.suggestedEvents}
                          categoryFilters={state.categoryFilters}
                          searchQuery={state.searchQuery}
                          showAds={showAds}
                          isLoggedIn={true}
                  onAttendClick={handleAttendClick}
                  onSaveClick={handleSaveEvent}
                          onCreateEventClick={() => navigate('/create-event')}
                          onCreateFromSuggestion={handleCreateFromSuggestion}
                        />
                      )}
                    </DashboardEventFiltering>
                  )}
                </SimplifiedDashboardEvents>
                  </div>
                  
                  {/* Auto ads will handle sidebar placement */}
                  {/* Auto ads will handle sidebar placement automatically */}
                </div>
              </main>
              
              <ScrollToTopButton visible={state.showBackToTop} />
              
              
              {/* Manual refresh button for debugging */}
              {(process.env.NODE_ENV === 'development' || !events?.length) && (
                <div className="fixed bottom-4 right-4 z-50">
                  <button 
                    onClick={refreshEvents} 
                    className="bg-[#E60023] text-white px-4 py-2 rounded-full shadow-lg hover:bg-[#D50C22] transition-colors"
                  >
                    {isLoading ? 'Loading...' : `Refresh Activities (${events?.length || 0})`}
                  </button>
                </div>
              )}
              
              {/* Performance monitoring - admin/dev only */}
              <DashboardPerformanceMonitor
                isLoading={isLoading}
                error={error}
                eventCount={events?.length || 0}
                onRefresh={refreshEvents}
              />
            </div>
          );
        }}
      </DashboardContainer>
    );
  } catch (error) {
    console.error('🔥 DesktopDashboard render error:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[#E60023] mb-4">outercircl</h2>
          <p className="text-gray-600 mb-4">Dashboard temporarily unavailable</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-[#E60023] text-white px-6 py-3 rounded-full font-medium"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
};

export default DesktopDashboard;