import React from 'react';
import { SafeProfileWrapper } from '@/components/safety/SafeProfileWrapper';
import { checkReactAvailability, useSafeState, useSafeEffect } from '@/components/safety/EnhancedReactSafety';

// Import the original Profile component
import Profile from './Profile';

/**
 * Ultra-safe Profile component that prevents React initialization race conditions
 * This component ensures React is fully available before any hook calls
 */
const UltraSafeProfile: React.FC = () => {
  // Immediate React availability check
  const reactCheck = checkReactAvailability();
  
  if (!reactCheck.available) {
    console.error('UltraSafeProfile: React not available:', reactCheck.reason);
    
    // Return early loading screen without hooks
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 max-w-md mx-4 border border-white/20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E60023] mx-auto mb-6"></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-serif">Loading Profile</h2>
            <p className="text-gray-600 mb-4">Initializing your profile experience...</p>
            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-pulse bg-[#E60023]/20 rounded-full h-2 w-8"></div>
                <div className="animate-pulse bg-[#E60023]/40 rounded-full h-2 w-12 delay-75"></div>
                <div className="animate-pulse bg-[#E60023]/20 rounded-full h-2 w-6 delay-150"></div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">React Status: {reactCheck.reason}</p>
          </div>
        </div>
      </div>
    );
  }

  // React is available, but let's add an additional safety layer with hooks
  return <SafeProfileWithHooks />;
};

/**
 * Component that uses safe hooks to ensure React is stable
 */
const SafeProfileWithHooks: React.FC = () => {
  // Use safe state that won't crash if React hooks aren't ready
  const readyState = useSafeState(false);
  
  if (!readyState) {
    // If safe hooks aren't working, fall back to direct Profile rendering
    console.warn('SafeProfileWithHooks: Safe hooks not available, using direct Profile');
    return (
      <SafeProfileWrapper>
        <Profile />
      </SafeProfileWrapper>
    );
  }
  
  const [isReady, setIsReady] = readyState;
  
  // Use safe effect to initialize
  useSafeEffect(() => {
    // Small delay to ensure React is fully stabilized
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!isReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 max-w-md mx-4 border border-white/20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E60023] mx-auto mb-6"></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-serif">Preparing Profile</h2>
            <p className="text-gray-600">Setting up your personalized experience...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Now it's safe to render the Profile component
  return (
    <SafeProfileWrapper>
      <Profile />
    </SafeProfileWrapper>
  );
};

export default UltraSafeProfile;