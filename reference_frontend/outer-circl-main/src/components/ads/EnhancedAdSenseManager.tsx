import React, { useEffect, useRef, useState } from 'react';
import { useMembership } from '@/components/OptimizedProviders';

declare global {
  interface Window {
    adsbygoogle: any[];
    adSenseAutoAdsEnabled?: boolean;
    adSenseConfig?: any;
    adSenseDebugData?: {
      impressions: number;
      requests: number;
      errors: string[];
      lastRequest: Date | null;
      adServerResponses: any[];
    };
  }
}

interface EnhancedAdSenseManagerProps {
  children?: React.ReactNode;
  enableDetailedLogging?: boolean;
}

const EnhancedAdSenseManager: React.FC<EnhancedAdSenseManagerProps> = ({ 
  children, 
  enableDetailedLogging = false 
}) => {
  const { showAds } = useMembership();
  const initializeRef = useRef(false);
  const [adDebugData, setAdDebugData] = useState({
    impressions: 0,
    requests: 0,
    errors: [] as string[],
    lastRequest: null as Date | null,
    adServerResponses: [] as any[]
  });

  // Initialize debug data on window
  useEffect(() => {
    if (!window.adSenseDebugData) {
      window.adSenseDebugData = {
        impressions: 0,
        requests: 0,
        errors: [],
        lastRequest: null,
        adServerResponses: []
      };
    }
  }, []);

  // Enhanced logging function
  const logAdSenseEvent = (event: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] 📢 AdSense ${event}`;
    
    if (enableDetailedLogging || process.env.NODE_ENV === 'development') {
      console.log(logMessage, data || '');
    }

    // Update debug data
    const updatedData = {
      ...window.adSenseDebugData!,
      lastRequest: new Date(),
      requests: window.adSenseDebugData!.requests + 1
    };

    if (event.includes('error') || event.includes('failed')) {
      updatedData.errors.push(`${event}: ${JSON.stringify(data)}`);
    }

    window.adSenseDebugData = updatedData;
    setAdDebugData(updatedData);
  };

  // Monitor ad performance
  const monitorAdPerformance = () => {
    // Check for ad elements periodically
    const checkAdElements = () => {
      const adElements = document.querySelectorAll('.adsbygoogle');
      let visibleAds = 0;
      let loadedAds = 0;

      adElements.forEach((ad) => {
        const rect = ad.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        const hasContent = ad.children.length > 0 || ad.innerHTML.trim().length > 0;

        if (isVisible) visibleAds++;
        if (hasContent) loadedAds++;
      });

      if (window.adSenseDebugData) {
        window.adSenseDebugData.impressions = loadedAds;
        setAdDebugData({ ...window.adSenseDebugData });
      }

      if (enableDetailedLogging) {
        logAdSenseEvent('Performance Check', {
          totalSlots: adElements.length,
          visibleAds,
          loadedAds,
          fillRate: adElements.length > 0 ? (loadedAds / adElements.length * 100).toFixed(1) + '%' : '0%'
        });
      }
    };

    // Check immediately and then every 10 seconds
    checkAdElements();
    const interval = setInterval(checkAdElements, 10000);
    return () => clearInterval(interval);
  };

  useEffect(() => {
    // Don't initialize ads for premium users
    if (!showAds) {
      logAdSenseEvent('Disabled', 'Premium user detected');
      return;
    }

    // Check if auto ads are already enabled this session
    if (window.adSenseAutoAdsEnabled) {
      logAdSenseEvent('Already Enabled', 'Auto ads active this session');
      // Still monitor performance even if already enabled
      return monitorAdPerformance();
    }

    // Prevent duplicate initialization in this component instance
    if (initializeRef.current) {
      logAdSenseEvent('Duplicate Prevention', 'Already initialized in this component');
      return;
    }

    logAdSenseEvent('Initialization Started', 'Standard user detected');
    initializeRef.current = true;

    const initializeAdSense = async () => {
      try {
        let attempts = 0;
        const maxAttempts = 30;
        
        const waitForAdSense = () => {
          attempts++;
          logAdSenseEvent('Loading Check', `Attempt ${attempts}/${maxAttempts}`);
          
          // Check if AdSense script is loaded and functional
          if (window.adsbygoogle && Array.isArray(window.adsbygoogle)) {
            logAdSenseEvent('Script Loaded', 'Enabling auto ads');
            
            try {
              // Enhanced configuration for better Pinterest integration
              const adConfig = {
                google_ad_client: "ca-pub-2506170791039308",
                enable_page_level_ads: true,
                overlays: { bottom: true },
                page_level_ads: {
                  enabled: true
                },
                // Enhanced settings for Pinterest-style layout
                tag_partner: "pinterest_style",
                data_ad_frequency_hint: "30s"
              };
              
              window.adSenseConfig = adConfig;
              
              // Initialize auto ads
              window.adsbygoogle.push(adConfig);
              
              // Mark as enabled for this session
              window.adSenseAutoAdsEnabled = true;
              
              logAdSenseEvent('Configuration Pushed', adConfig);
              
              // Start performance monitoring
              const cleanup = monitorAdPerformance();
              
              // Additional verification after delay
              setTimeout(() => {
                if (window.adsbygoogle && window.adsbygoogle.length > 0) {
                  logAdSenseEvent('Queue Verified', `Queue length: ${window.adsbygoogle.length}`);
                } else {
                  logAdSenseEvent('Queue Warning', 'Queue appears empty after initialization');
                }
              }, 2000);
              
              return cleanup;
              
            } catch (error) {
              logAdSenseEvent('Configuration Error', error);
            }
          } else if (attempts < maxAttempts) {
            setTimeout(waitForAdSense, 300);
          } else {
            logAdSenseEvent('Max Attempts Reached', {
              adsbygoogleExists: !!window.adsbygoogle,
              isArray: Array.isArray(window.adsbygoogle),
              scriptTags: document.querySelectorAll('script[src*="adsbygoogle"]').length
            });
          }
        };
        
        // Start checking immediately
        return waitForAdSense();
      } catch (error) {
        logAdSenseEvent('Initialization Failed', error);
      }
    };

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeAdSense);
      return () => document.removeEventListener('DOMContentLoaded', initializeAdSense);
    } else {
      // Immediate initialization with small delay for script loading
      const cleanup = setTimeout(initializeAdSense, 200);
      return () => clearTimeout(cleanup);
    }
  }, [showAds, enableDetailedLogging]);

  // Expose debug data for development
  if (process.env.NODE_ENV === 'development') {
    (window as any).getAdSenseDebugData = () => adDebugData;
  }

  return <>{children}</>;
};

export default EnhancedAdSenseManager;