import React, { useEffect, useState } from 'react';
import { useMembership } from '@/components/OptimizedProviders';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

const LazyGoogleAutoAds: React.FC = () => {
  const { showAds, membershipTier } = useMembership();
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Defer ads loading until after initial page load
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!shouldLoad || !showAds) {
      if (!showAds) {
        console.log('🚫 Auto Ads: Premium user, not loading ads');
      }
      return;
    }

    console.log('📢 Auto Ads: Initializing for standard user (deferred)');

    // Safely initialize adsbygoogle with error handling
    try {
      if (!window.adsbygoogle) {
        window.adsbygoogle = [];
      }

      // Check if AdSense script loaded successfully
      const adsenseLoaded = document.querySelector('script[src*="adsbygoogle.js"]');
      if (!adsenseLoaded) {
        console.warn('⚠️ Auto Ads: AdSense script not found, skipping initialization');
        return;
      }

      // Enable auto ads with error boundary
      window.adsbygoogle.push({
        google_ad_client: "ca-pub-2506170791039308",
        enable_page_level_ads: true,
        overlays: {bottom: true}
      });
      console.log('✅ Auto Ads: Enabled successfully (deferred)');
    } catch (error) {
      console.warn('⚠️ Auto Ads: Failed to enable (non-critical):', error);
    }
  }, [shouldLoad, showAds, membershipTier]);

  // Don't render anything - auto ads are handled by Google
  return null;
};

export default LazyGoogleAutoAds;