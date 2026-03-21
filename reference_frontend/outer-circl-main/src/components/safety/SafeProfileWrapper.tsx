import React from 'react';
import { ReactSafeWrapper, checkReactAvailability } from './EnhancedReactSafety';

interface SafeProfileWrapperProps {
  children: React.ReactNode;
}

/**
 * Special wrapper for Profile component that handles React initialization issues
 * This addresses the specific "Cannot read properties of null (reading 'useState')" error
 */
export const SafeProfileWrapper: React.FC<SafeProfileWrapperProps> = ({ children }) => {
  // Immediate React check before any rendering
  const reactStatus = checkReactAvailability();
  
  if (!reactStatus.available) {
    console.error('SafeProfileWrapper: React not available for Profile:', reactStatus.reason);
    
    // Return a Pinterest-style loading screen without using React hooks
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 max-w-md mx-4 border border-white/20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E60023] mx-auto mb-6"></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Loading Profile</h2>
            <p className="text-gray-600 mb-4">Please wait while we prepare your profile...</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div className="bg-[#E60023] h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
            <p className="text-xs text-gray-500">Initializing React components</p>
          </div>
        </div>
      </div>
    );
  }

  // React is available, wrap with additional safety
  return (
    <ReactSafeWrapper
      componentName="Profile"
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 max-w-md mx-4 border border-white/20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E60023] mx-auto mb-6"></div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Profile Loading</h2>
              <p className="text-gray-600">Preparing your profile experience...</p>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </ReactSafeWrapper>
  );
};

export default SafeProfileWrapper;