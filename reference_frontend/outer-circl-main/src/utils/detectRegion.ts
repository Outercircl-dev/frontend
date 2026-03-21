import { type Region } from "@/components/OptimizedProviders";
import { mapCountryToRegion } from "./mapCountryToRegion";

/**
 * Detects user's region from IP geolocation
 * Reuses the same API endpoint as useOptimizedGeolocation
 * Non-blocking with short timeout for fast initial render
 */
export async function detectRegion(): Promise<Region> {
  // Check localStorage for user preference first
  const storedRegion = localStorage.getItem('preferred_region');
  if (storedRegion) {
    return storedRegion as Region;
  }
  
  // Check if mobile - skip geolocation on mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  if (isMobile) {
    return 'us';
  }
  
  try {
    // Use same API and timeout as existing geolocation hook
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
      return 'us';
    }
    
    const data = await response.json();
    const countryCode = data.country_code?.toUpperCase();
    
    if (!countryCode) {
      return 'us';
    }
    
    const region = mapCountryToRegion(countryCode);
    
    // Save to localStorage for future visits
    localStorage.setItem('preferred_region', region);
    
    return region;
  } catch (error) {
    console.log('Region detection skipped:', error);
    return 'us';
  }
}
