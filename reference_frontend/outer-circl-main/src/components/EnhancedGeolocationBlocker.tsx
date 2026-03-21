import React, { useEffect, useState } from 'react';
import { AlertTriangle, Globe, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface GeolocationResult {
  allowed: boolean;
  country_code: string;
  country_name: string;
  ip: string;
  reason: string;
  error?: string;
}

interface EnhancedGeolocationBlockerProps {
  children: React.ReactNode;
}

const EnhancedGeolocationBlocker: React.FC<EnhancedGeolocationBlockerProps> = ({ children }) => {
  const [geolocationStatus, setGeolocationStatus] = useState<'checking' | 'allowed' | 'blocked'>('checking');
  const [locationData, setLocationData] = useState<GeolocationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkGeolocation = async () => {
      try {
        console.log('Starting geolocation check...');
        
        const { data, error } = await supabase.functions.invoke('check-geolocation', {
          method: 'GET'
        });

        if (error) {
          console.error('Error calling geolocation function:', error);
          setError('Failed to verify location');
          setGeolocationStatus('allowed'); // Allow access on error
          return;
        }

        console.log('Geolocation result:', data);
        setLocationData(data);
        
        if (data.allowed) {
          setGeolocationStatus('allowed');
        } else {
          setGeolocationStatus('blocked');
        }
      } catch (err) {
        console.error('Geolocation check failed:', err);
        setError('Location verification failed');
        setGeolocationStatus('allowed'); // Allow access on error to prevent lockouts
      }
    };

    checkGeolocation();
  }, []);

  // Show loading state while checking
  if (geolocationStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#E60023] mx-auto mb-4"></div>
          <Globe className="h-8 w-8 text-[#E60023] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Location</h2>
          <p className="text-gray-600">Please wait while we verify your location for security purposes...</p>
        </div>
      </div>
    );
  }

  // Show blocked message if not allowed
  if (geolocationStatus === 'blocked') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md mx-auto text-center p-6 bg-white rounded-lg shadow-lg">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Access Restricted</h1>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <span className="font-semibold text-red-700">Region Not Supported</span>
            </div>
            <p className="text-red-600 text-sm">
              Access to outercircl is currently restricted to users in the United States, United Kingdom, and European Union countries.
            </p>
          </div>

          {locationData && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-gray-700 mb-2">Location Information:</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Country:</strong> {locationData.country_name} ({locationData.country_code})</p>
                <p><strong>Reason:</strong> {locationData.reason}</p>
              </div>
            </div>
          )}

          <div className="text-center">
            <h3 className="font-semibold text-gray-700 mb-2">Supported Regions:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>🇺🇸 United States</p>
              <p>🇬🇧 United Kingdom</p>
              <p>🇪🇺 European Union Member States</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-600">
              If you believe this is an error or you're using a VPN, please try disabling your VPN and refreshing the page.
            </p>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="mt-6 w-full bg-[#E60023] text-white px-4 py-2 rounded-lg hover:bg-[#C1001D] transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Show children if allowed
  return <>{children}</>;
};

export default EnhancedGeolocationBlocker;