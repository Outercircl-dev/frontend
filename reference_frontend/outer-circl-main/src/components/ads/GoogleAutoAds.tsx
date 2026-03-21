import React, { useEffect } from 'react';
import { useMembership } from '@/components/OptimizedProviders';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

const GoogleAutoAds: React.FC = () => {
  const { showAds, membershipTier } = useMembership();

  useEffect(() => {
    if (!showAds) {
      console.log('🚫 Auto Ads: Premium user, not loading ads');
      return;
    }

    console.log('📢 Auto Ads: Initializing for standard user');

    // Initialize adsbygoogle if not present
    if (!window.adsbygoogle) {
      window.adsbygoogle = [];
    }

    // Enable auto ads
    try {
      window.adsbygoogle.push({
        google_ad_client: "ca-pub-2506170791039308",
        enable_page_level_ads: true,
        overlays: {bottom: true}
      });
      console.log('✅ Auto Ads: Enabled successfully');
    } catch (error) {
      console.error('❌ Auto Ads: Failed to enable', error);
    }
  }, [showAds, membershipTier]);

  // Don't render anything - auto ads are handled by Google
  return null;
};

export default GoogleAutoAds;