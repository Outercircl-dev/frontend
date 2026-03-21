import React, { Suspense } from 'react';
import Profile from './Profile';

/**
 * Simplified Safe Profile - removed nested ErrorBoundary to prevent Router context corruption
 * EnhancedRouterErrorBoundary in App.tsx handles all routing errors
 */
const SafeProfile: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#E60023] border-t-transparent mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Profile</h3>
          <p className="text-gray-600">Preparing your profile information...</p>
        </div>
      </div>
    }>
      <Profile />
    </Suspense>
  );
};

export default SafeProfile;
