import React, { useState, useEffect } from 'react';
import { useMembership } from '@/components/OptimizedProviders';

declare global {
  interface Window {
    adsbygoogle: any[];
    adSenseAutoAdsEnabled?: boolean;
    adSenseConfig?: any;
  }
}

interface AdSenseStatus {
  scriptLoaded: boolean;
  autoAdsEnabled: boolean;
  queueLength: number;
  configPresent: boolean;
  scriptTags: number;
  domain: string;
  errors: string[];
}

const AdDebugInfo: React.FC = () => {
  const { membershipTier, showAds } = useMembership();
  const [adStatus, setAdStatus] = useState<AdSenseStatus | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const checkAdSenseStatus = () => {
      const errors: string[] = [];
      
      // Check for common issues
      if (!showAds) {
        errors.push('Premium user - ads disabled');
      }
      
      const scriptTags = document.querySelectorAll('script[src*="adsbygoogle"], script[src*="googlesyndication"]');
      if (scriptTags.length === 0) {
        errors.push('AdSense script not found in DOM');
      }
      
      if (!window.adsbygoogle) {
        errors.push('window.adsbygoogle not available');
      } else if (!Array.isArray(window.adsbygoogle)) {
        errors.push('window.adsbygoogle is not an array');
      }
      
      // Check domain configuration
      const domain = window.location.hostname;
      if (domain === 'localhost' || domain.includes('127.0.0.1')) {
        errors.push('Running on localhost - ads may not serve');
      }
      
      const status: AdSenseStatus = {
        scriptLoaded: !!window.adsbygoogle && Array.isArray(window.adsbygoogle),
        autoAdsEnabled: !!window.adSenseAutoAdsEnabled,
        queueLength: window.adsbygoogle?.length || 0,
        configPresent: !!window.adSenseConfig,
        scriptTags: scriptTags.length,
        domain,
        errors
      };
      
      setAdStatus(status);
    };

    // Initial check
    checkAdSenseStatus();
    
    // Periodic updates
    const interval = setInterval(checkAdSenseStatus, 2000);
    
    return () => clearInterval(interval);
  }, [showAds]);

  // Only show in development
  if (process.env.NODE_ENV !== 'development' || !adStatus) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-black/90 text-white p-3 rounded-lg text-xs font-mono z-50 max-w-sm">
      <div 
        className="cursor-pointer flex items-center gap-2 mb-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>{isExpanded ? '🔽' : '▶️'}</span>
        <div className="font-bold">AdSense Debug Info</div>
      </div>
      
      <div className="space-y-1">
        <div>Membership: {membershipTier}</div>
        <div>Show Ads: {showAds ? '✅ Yes' : '❌ No'}</div>
        <div>Domain: {adStatus.domain}</div>
        <div>Script Loaded: {adStatus.scriptLoaded ? '✅ Yes' : '❌ No'}</div>
        <div>Auto Ads Enabled: {adStatus.autoAdsEnabled ? '✅ Yes' : '❌ No'}</div>
        <div>Script Tags: {adStatus.scriptTags}</div>
        <div>Queue Length: {adStatus.queueLength}</div>
        
        {isExpanded && (
          <>
            <div className="border-t border-gray-600 pt-2 mt-2">
              <div className="font-semibold mb-1">Configuration:</div>
              <div>Config Present: {adStatus.configPresent ? '✅ Yes' : '❌ No'}</div>
              {window.adSenseConfig && (
                <div className="text-green-300">
                  Publisher: {window.adSenseConfig.google_ad_client}
                </div>
              )}
            </div>
            
            {adStatus.errors.length > 0 && (
              <div className="border-t border-gray-600 pt-2 mt-2">
                <div className="font-semibold text-yellow-300 mb-1">Issues:</div>
                {adStatus.errors.map((error, index) => (
                  <div key={index} className="text-yellow-300">⚠️ {error}</div>
                ))}
              </div>
            )}
            
            <div className="border-t border-gray-600 pt-2 mt-2">
              <div className="font-semibold text-blue-300 mb-1">Troubleshooting:</div>
              <div className="text-blue-200 text-xs leading-relaxed">
                • Ensure AdSense account is approved<br/>
                • Verify domain is added to AdSense<br/>
                • Check that Auto ads are enabled<br/>
                • Ads may take 24-48h to appear<br/>
                • Test with standard (non-premium) account
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdDebugInfo;