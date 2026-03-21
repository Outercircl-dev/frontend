import React, { useEffect, useRef } from 'react';
import { useMembership } from '@/components/OptimizedProviders';

declare global {
  interface Window {
    adsbygoogle: any[];
    adSenseAutoAdsEnabled?: boolean;
    adSenseConfig?: any;
  }
}

interface AdSenseManagerProps {
  children?: React.ReactNode;
}

const AdSenseManager: React.FC<AdSenseManagerProps> = ({ children }) => {
  const { showAds } = useMembership();
  const initializeRef = useRef(false);

  useEffect(() => {
    // Don't initialize ads for premium users
    if (!showAds) {
      console.log('🚫 AdSense: Premium user, not loading ads');
      return;
    }

    // Check if auto ads are already enabled this session
    if (window.adSenseAutoAdsEnabled) {
      console.log('🔄 AdSense: Auto ads already enabled this session');
      return;
    }

    // Prevent duplicate initialization in this component instance
    if (initializeRef.current) {
      console.log('🔄 AdSense: Already initialized in this component');
      return;
    }

    console.log('🚀 AdSense: Starting initialization for standard user');
    initializeRef.current = true;

    const initializeAdSense = async () => {
      try {
        let attempts = 0;
        const maxAttempts = 30; // Increased attempts
        
        const waitForAdSense = () => {
          attempts++;
          
          // Check if AdSense script is loaded and functional
          if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
            console.log('📢 AdSense: Script loaded, enabling auto ads');
            
            try {
              // Store the configuration for debugging
              const adConfig = {
                google_ad_client: "ca-pub-2506170791039308",
                enable_page_level_ads: true,
                overlays: { bottom: true },
                page_level_ads: {
                  enabled: true
                }
              };
              
              window.adSenseConfig = adConfig;
              
              // Initialize auto ads
              window.adsbygoogle.push(adConfig);
              
              // Mark as enabled for this session
              window.adSenseAutoAdsEnabled = true;
              
              console.log('✅ AdSense: Auto ads configuration pushed successfully');
              console.log('📊 AdSense: Config:', adConfig);
              
              // Additional verification after a short delay
              setTimeout(() => {
                if (window.adsbygoogle && window.adsbygoogle.length > 0) {
                  console.log('✅ AdSense: Auto ads queue verified');
                } else {
                  console.warn('⚠️ AdSense: Queue appears empty after initialization');
                }
              }, 2000);
              
            } catch (error) {
              console.error('❌ AdSense: Failed to push configuration:', error);
            }
          } else if (attempts < maxAttempts) {
            console.log(`⏳ AdSense: Waiting for script (attempt ${attempts}/${maxAttempts})`);
            setTimeout(waitForAdSense, 300);
          } else {
            console.error('❌ AdSense: Script failed to load after maximum attempts');
            console.error('🔍 AdSense: Debug info:');
            console.error('  - window.adsbygoogle exists:', !!window.adsbygoogle);
            console.error('  - adsbygoogle is array:', Array.isArray(window.adsbygoogle));
            console.error('  - Script tags:', document.querySelectorAll('script[src*="adsbygoogle"]').length);
          }
        };
        
        // Start checking immediately
        waitForAdSense();
      } catch (error) {
        console.error('⚠️ AdSense initialization failed:', error);
      }
    };

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeAdSense);
    } else {
      // Immediate initialization with small delay for script loading
      setTimeout(initializeAdSense, 200);
    }

    return () => {
      document.removeEventListener('DOMContentLoaded', initializeAdSense);
    };
  }, [showAds]);

  return <>{children}</>;
};

export default AdSenseManager;