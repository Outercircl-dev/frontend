
import React, { useEffect, useState } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useIsMobile } from '@/hooks/use-mobile';
import { AlertTriangle, Globe } from 'lucide-react';

interface GeolocationBlockerProps {
  children: React.ReactNode;
}

const GeolocationBlocker: React.FC<GeolocationBlockerProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [skipGeocheck, setSkipGeocheck] = useState(false);
  const { isBlocked, isLoading, country, error } = useGeolocation();

  // Immediately skip on mobile - no conditions, just skip
  useEffect(() => {
    if (isMobile) {
      console.log('Mobile detected - bypassing all geolocation checks');
      setSkipGeocheck(true);
    }
  }, [isMobile]);

  // Always show content on mobile, regardless of geolocation state
  if (isMobile) {
    return <>{children}</>;
  }

  // Desktop only logic below this point
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying location...</p>
        </div>
      </div>
    );
  }

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

  if (error) {
    console.warn('Geolocation error:', error);
    // If we can't determine location, allow access but log the issue
  }

  return <>{children}</>;
};

export default GeolocationBlocker;
