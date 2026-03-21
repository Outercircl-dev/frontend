import React, { Suspense } from 'react';
import { SimpleSafetyWrapper } from '@/components/safety/SimpleSafetyWrapper';
import { SafeNavigationWrapper } from '@/components/SafeNavigationWrapper';
import Profile from '@/pages/Profile';

/**
 * Ultra-safe Profile wrapper that prevents React context initialization errors
 * This component ensures Profile only renders when React Router context is ready
 */
const SafeRouterProfile: React.FC = () => {
  return (
    <SimpleSafetyWrapper
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E60023] mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      }
    >
      <SafeNavigationWrapper>
        <Suspense fallback={
          <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E60023]"></div>
          </div>
        }>
          <Profile />
        </Suspense>
      </SafeNavigationWrapper>
    </SimpleSafetyWrapper>
  );
};

export default SafeRouterProfile;