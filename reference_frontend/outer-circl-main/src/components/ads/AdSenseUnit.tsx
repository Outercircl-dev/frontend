import React, { useEffect, useRef, useState } from 'react';
import { useMembership } from '@/components/OptimizedProviders';

interface AdSenseUnitProps {
  slot: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  style?: React.CSSProperties;
  className?: string;
  responsive?: boolean;
  debug?: boolean;
}

interface AdLoadingState {
  scriptLoaded: boolean;
  adRequested: boolean;
  adLoaded: boolean;
  error: string | null;
}
declare global {
  interface Window {
    adsbygoogle: any[];
  }
}
const AdSenseUnit: React.FC<AdSenseUnitProps> = ({
  slot,
  format = 'auto',
  style = {},
  className = '',
  responsive = true,
  debug = false
}) => {
  const { showAds, membershipTier } = useMembership();
  const adRef = useRef<HTMLModElement>(null);
  const hasLoadedRef = useRef(false);
  const [loadingState, setLoadingState] = useState<AdLoadingState>({
    scriptLoaded: false,
    adRequested: false,
    adLoaded: false,
    error: null
  });

  useEffect(() => {
    const logPrefix = `🔍 AdSense[${slot}]:`;
    
    console.log(`${logPrefix} Initial state`, {
      showAds,
      membershipTier,
      slot,
      hasSlot: !!slot,
      windowAdsByGoogle: !!window.adsbygoogle
    });

    if (!showAds) {
      console.log(`${logPrefix} Premium user (${membershipTier}), not loading ads`);
      setLoadingState(prev => ({ ...prev, error: 'Premium user - ads disabled' }));
      return;
    }
    
    if (!slot) {
      const error = 'No ad slot provided';
      console.warn(`${logPrefix} ${error}`);
      setLoadingState(prev => ({ ...prev, error }));
      return;
    }

    setLoadingState(prev => ({ ...prev, error: null }));

    const loadAd = () => {
      try {
        console.log(`${logPrefix} Attempting to load ad`);
        
        // Initialize adsbygoogle if not present
        if (!window.adsbygoogle) {
          console.log(`${logPrefix} Initializing adsbygoogle array`);
          window.adsbygoogle = [];
        }

        setLoadingState(prev => ({ ...prev, scriptLoaded: true }));

        // Only push once per component instance
        if (!hasLoadedRef.current && adRef.current) {
          console.log(`${logPrefix} Pushing ad request to adsbygoogle`);
          
          setLoadingState(prev => ({ ...prev, adRequested: true }));
          
          // Check if this is a test slot
          const isTestSlot = /^[0-9]+$/.test(slot);
          if (isTestSlot) {
            console.warn(`${logPrefix} Using test slot ID: ${slot}. Replace with real ad slot from Google AdSense!`);
          }
          
          window.adsbygoogle.push({});
          hasLoadedRef.current = true;
          
          // Monitor for ad loading
          setTimeout(() => {
            const adElement = adRef.current;
            if (adElement) {
              const hasAdContent = adElement.innerHTML.length > 100;
              const hasAdChild = adElement.children.length > 0;
              
              console.log(`${logPrefix} Ad status check`, {
                hasContent: hasAdContent,
                hasChildren: hasAdChild,
                innerHTML: adElement.innerHTML.substring(0, 200)
              });
              
              setLoadingState(prev => ({ 
                ...prev, 
                adLoaded: hasAdContent || hasAdChild,
                error: hasAdContent || hasAdChild ? null : 'Ad may not have loaded - check console for errors'
              }));
            }
          }, 2000);
          
        } else {
          console.log(`${logPrefix} Ad already requested or element not ready`, {
            hasLoaded: hasLoadedRef.current,
            hasElement: !!adRef.current
          });
        }
      } catch (error) {
        const errorMsg = `Failed to load ad: ${error}`;
        console.error(`${logPrefix} ${errorMsg}`, error);
        setLoadingState(prev => ({ ...prev, error: errorMsg }));
      }
    };

    // Wait for AdSense script to be available
    if (window.adsbygoogle) {
      console.log(`${logPrefix} AdSense script already loaded`);
      setLoadingState(prev => ({ ...prev, scriptLoaded: true }));
      loadAd();
    } else {
      console.log(`${logPrefix} Waiting for AdSense script to load`);
      
      // Wait for script to load
      const checkScript = setInterval(() => {
        if (window.adsbygoogle) {
          console.log(`${logPrefix} AdSense script loaded`);
          clearInterval(checkScript);
          setLoadingState(prev => ({ ...prev, scriptLoaded: true }));
          loadAd();
        }
      }, 200);

      // Cleanup if script never loads
      const timeout = setTimeout(() => {
        clearInterval(checkScript);
        if (!window.adsbygoogle) {
          const error = 'AdSense script did not load within timeout';
          console.error(`${logPrefix} ${error}`);
          setLoadingState(prev => ({ ...prev, error }));
        }
      }, 10000);

      return () => {
        clearInterval(checkScript);
        clearTimeout(timeout);
      };
    }
  }, [showAds, slot, membershipTier]);

  // Don't render anything for premium users
  if (!showAds) {
    return null;
  }

  const defaultStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    height: format === 'rectangle' ? '250px' : format === 'horizontal' ? '90px' : 'auto',
    ...style
  };

  return (
    <div className={`adsense-container ${className}`} style={{ textAlign: 'center', margin: '0' }}>
      {debug && (
        <div className="ad-debug-info bg-muted p-2 text-xs mb-2 rounded border">
          <strong>Ad Debug Info:</strong><br/>
          Slot: {slot}<br/>
          Membership: {membershipTier}<br/>
          Show Ads: {showAds.toString()}<br/>
          Script Loaded: {loadingState.scriptLoaded.toString()}<br/>
          Ad Requested: {loadingState.adRequested.toString()}<br/>
          Ad Loaded: {loadingState.adLoaded.toString()}<br/>
          {loadingState.error && <span className="text-red-600">Error: {loadingState.error}</span>}
        </div>
      )}
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={defaultStyle}
        data-ad-client="ca-pub-2506170791039308"
        data-ad-slot={slot}
        data-ad-format={responsive ? 'auto' : format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
};
export default AdSenseUnit;