import React, { Suspense } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import Profile from '@/pages/Profile';

/**
 * Simplified profile wrapper - removed problematic ReactSafetyWrapper
 */
const SafeProfile: React.FC = () => {
  return (
    <ErrorBoundary>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-foreground mb-2">Loading Profile</h3>
            <p className="text-muted-foreground">Preparing your profile information...</p>
          </div>
        </div>
      }>
        <Profile />
      </Suspense>
    </ErrorBoundary>
  );
};

export default SafeProfile;