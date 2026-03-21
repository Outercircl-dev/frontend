import { useState, useEffect } from 'react';

interface GeolocationData {
  country: string;
  countryCode: string;
  isBlocked: boolean;
  isLoading: boolean;
  error: string | null;
}

// Non-blocking geolocation hook with immediate rendering
export const useOptimizedGeolocation = () => {
  const [geoData, setGeoData] = useState<GeolocationData>({
    country: '',
    countryCode: '',
    isBlocked: false,
    isLoading: false, // Start as false to allow immediate rendering
    error: null
  });

  useEffect(() => {
    const checkGeolocation = async () => {
      // Check if mobile - skip entirely
      const isMobile = typeof window !== 'undefined' && (
        window.innerWidth < 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent)
      );
      
      if (isMobile) {
        console.log('📱 Mobile detected - skipping geolocation completely');
        setGeoData({
          country: 'Mobile User',
          countryCode: 'XX',
          isBlocked: false,
          isLoading: false,
          error: null
        });
        return;
      }

      // For desktop, run geolocation check in background (non-blocking)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 500); // Very short timeout
        
        const response = await fetch('https://ipapi.co/json/', {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        const countryCode = data.country_code?.toUpperCase();
        const country = data.country_name;
        const isBlocked = countryCode === 'RU';
        
        setGeoData({
          country: country || 'Unknown',
          countryCode: countryCode || 'XX',
          isBlocked,
          isLoading: false,
          error: null
        });
      } catch (error) {
        console.warn('Geolocation check failed (non-critical):', error);
        // Always default to allowing access on error
        setGeoData({
          country: 'Unknown',
          countryCode: 'XX',
          isBlocked: false,
          isLoading: false,
          error: null
        });
      }
    };

    // Run check in background without blocking initial render
    setTimeout(checkGeolocation, 0);
  }, []);

  return geoData;
};