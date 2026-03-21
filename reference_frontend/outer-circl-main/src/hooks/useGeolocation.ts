
import { useState, useEffect } from 'react';

interface GeolocationData {
  country: string;
  countryCode: string;
  isBlocked: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useGeolocation = () => {
  const [geoData, setGeoData] = useState<GeolocationData>({
    country: '',
    countryCode: '',
    isBlocked: false,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const checkGeolocation = async () => {
      // Check if mobile using window detection
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      
      if (isMobile) {
        // Immediately set to not loading on mobile - no geolocation check at all
        console.log('Mobile detected - completely skipping geolocation');
        setGeoData({
          country: 'Mobile User',
          countryCode: 'XX',
          isBlocked: false,
          isLoading: false,
          error: null
        });
        return;
      }

      // Desktop-only geolocation check with reduced timeout
      try {
        // Set a very short timeout for the request (1 second)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        
        const response = await fetch('https://ipapi.co/json/', {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        const countryCode = data.country_code?.toUpperCase();
        const country = data.country_name;
        
        // Block Russia (RU)
        const isBlocked = countryCode === 'RU';
        
        setGeoData({
          country: country || 'Unknown',
          countryCode: countryCode || 'XX',
          isBlocked,
          isLoading: false,
          error: null
        });
      } catch (error) {
        console.error('Geolocation check failed:', error);
        // On any error, default to allowing access
        setGeoData({
          country: 'Unknown',
          countryCode: 'XX',
          isBlocked: false, // Default to NOT blocked on error
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to determine location'
        });
      }
    };

    // Immediate execution on desktop, no delay needed
    checkGeolocation();
  }, []);

  return geoData;
};
