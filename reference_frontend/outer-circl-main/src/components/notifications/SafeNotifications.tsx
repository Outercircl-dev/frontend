import React, { Suspense } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { SafeNavigationWrapper } from '@/components/SafeNavigationWrapper';
import { SafeMessagingProvider } from '@/contexts/SafeMessagingContext';
import Notifications from '@/pages/Notifications';

/**
 * Simplified notifications wrapper - removed problematic ReactSafetyWrapper
 */
const SafeNotifications: React.FC = () => {
  return (
    <SafeMessagingProvider>
      <ErrorBoundary>
        <SafeNavigationWrapper>
          <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E60023]"></div>
            </div>
          }>
            <Notifications />
          </Suspense>
        </SafeNavigationWrapper>
      </ErrorBoundary>
    </SafeMessagingProvider>
  );
};

export default SafeNotifications;