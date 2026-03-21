
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/components/optimization/UltraMinimalProviders';
import { useUnifiedDashboard } from '@/hooks/useUnifiedDashboard';
import UnifiedSEO from '@/components/UnifiedSEO';
import { DashboardErrorBoundary } from '@/components/dashboard/DashboardErrorBoundary';
import { OptimizedDashboardSkeleton } from '@/components/dashboard/OptimizedDashboardSkeleton';
import { DirectOptimizedDashboard } from '@/components/dashboard/DirectOptimizedDashboard';

const Dashboard: React.FC = React.memo(() => {
  // Phase 1: AppBootstrap guarantees context is ready
  const { user } = useAppContext();
  
  // Phase 3 Data Flow Simplification: Use useUnifiedDashboard directly
  const { 
    events, 
    savedEventIds, 
    isLoading, 
    isInitialLoading, 
    error,
    refreshEvents,
    handleAttendClick,
    handleSaveClick,
    prefetchEventDetails
  } = useUnifiedDashboard(user?.id);

  // PHASE 5: No redirect logic needed - handled at router level

  // Debug logging
  React.useEffect(() => {
    console.log('📊 Dashboard render state:', {
      hasUser: !!user,
      isInitialLoading,
      eventsCount: events.length,
      isLoading
    });
  }, [user, isInitialLoading, events.length, isLoading]);

  // PHASE 5: Trust router-level auth - no blocking needed here
  console.log('✅ Dashboard: Rendering main content', { eventsCount: events.length });

  return (
    <>
      <UnifiedSEO 
        title="Dashboard - Your Activities | outercircl"
        description="Discover and join amazing activities in your area. Connect with like-minded people and explore new experiences."
        keywords="activities, events, social, meetups, dashboard, outercircl"
        canonicalUrl="/dashboard"
      />
      <DashboardErrorBoundary>
        <DirectOptimizedDashboard 
          userId={user?.id || ''} 
          isMobile={false}
          events={events}
          savedEventIds={savedEventIds}
          isLoading={isLoading}
          isInitialLoading={isInitialLoading}
          error={error}
          onRefresh={refreshEvents}
          onAttendClick={handleAttendClick}
          onSaveClick={handleSaveClick}
          prefetchEventDetails={prefetchEventDetails}
        />
      </DashboardErrorBoundary>
    </>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
