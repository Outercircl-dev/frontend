import React, { useState, useEffect } from 'react';
import { useOptimizedGeolocation } from '@/hooks/useOptimizedGeolocation';
import { useIsMobile } from '@/hooks/use-mobile';
import { AlertTriangle, Globe } from 'lucide-react';

interface OptimizedGeolocationBlockerProps {
  children: React.ReactNode;
}

// Non-blocking geolocation blocker that allows immediate rendering
const OptimizedGeolocationBlocker: React.FC<OptimizedGeolocationBlockerProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const { isBlocked, country } = useOptimizedGeolocation();
  const [showContent, setShowContent] = useState(false);

  // Allow immediate rendering, check blocking in background
  useEffect(() => {
    if (isMobile) {
      console.log('📱 Mobile detected - immediate rendering');
      setShowContent(true);
    } else {
      // For desktop, show content immediately and handle blocking if detected later
      setShowContent(true);
    }
  }, [isMobile]);

  // Always show content on mobile
  if (isMobile) {
    return <>{children}</>;
  }

  // Show content immediately, but replace with block message if user is blocked
  if (showContent && !isBlocked) {
    return <>{children}</>;
  }

  // Only show blocking message if user is actually blocked (not during loading)
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-red-200 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-pink-600 p-6 text-center">
            <AlertTriangle className="h-16 w-16 text-white mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white">Access Restricted</h1>
          </div>
          
          <div className="p-6 text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <Globe className="h-5 w-5" />
              <span>Location: {country}</span>
            </div>
            
            <p className="text-gray-700 leading-relaxed">
              We're sorry, but our service is currently not available in your region due to local regulations and compliance requirements.
            </p>
            
            <div className="bg-gray-50 rounded-xl p-4 mt-6">
              <p className="text-sm text-gray-600">
                If you believe this is an error, please contact our support team.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: show content (this covers loading states and unknown states)
  return <>{children}</>;
};

export default OptimizedGeolocationBlocker;