import React, { useState, useEffect } from 'react';
import { useMembership } from '@/components/OptimizedProviders';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserRole } from '@/hooks/useUserRole';
import { isDeveloperMode } from '@/utils/developerMode';
import { Shield } from 'lucide-react';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

const AdDebugger: React.FC = () => {
  const { showAds, membershipTier } = useMembership();
  const { isAdmin } = useUserRole();
  const [adsbyGoogleLoaded, setAdsbyGoogleLoaded] = useState(false);
  const [adSlots, setAdSlots] = useState<NodeListOf<Element> | null>(null);

  // Only show in developer mode
  if (!isDeveloperMode(isAdmin)) {
    return null;
  }

  useEffect(() => {
    // Check if AdSense script is loaded
    const checkAdSense = () => {
      setAdsbyGoogleLoaded(!!window.adsbygoogle);
      setAdSlots(document.querySelectorAll('.adsbygoogle'));
    };

    checkAdSense();
    const interval = setInterval(checkAdSense, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const refreshAds = () => {
    if (window.adsbygoogle) {
      try {
        // Clear existing ads
        const ads = document.querySelectorAll('.adsbygoogle');
        ads.forEach(ad => {
          if (ad.getAttribute('data-adsbygoogle-status') !== 'done') {
            window.adsbygoogle.push({});
          }
        });
        console.log('🔄 AdSense: Attempted to refresh ads');
      } catch (error) {
        console.error('❌ AdSense: Error refreshing ads', error);
      }
    }
  };

  if (!showAds) {
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle>AdSense Debug - Premium User</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="outline" className="mb-2">Premium Member</Badge>
          <p className="text-sm text-muted-foreground">Ads are disabled for premium users.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          AdSense Debug Panel
          <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
            {isAdmin ? 'ADMIN' : 'DEV'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Badge variant={showAds ? "default" : "secondary"}>
              Ads Enabled: {showAds ? 'Yes' : 'No'}
            </Badge>
          </div>
          <div>
            <Badge variant={membershipTier === 'standard' ? "default" : "secondary"}>
              Membership: {membershipTier}
            </Badge>
          </div>
          <div>
            <Badge variant={adsbyGoogleLoaded ? "default" : "destructive"}>
              AdSense Script: {adsbyGoogleLoaded ? 'Loaded' : 'Not Loaded'}
            </Badge>
          </div>
          <div>
            <Badge variant={adSlots && adSlots.length > 0 ? "default" : "secondary"}>
              Ad Slots: {adSlots?.length || 0}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Ad Slot Details:</h4>
          {adSlots && adSlots.length > 0 ? (
            Array.from(adSlots).map((slot, index) => {
              const element = slot as Element;
              const status = element.getAttribute('data-adsbygoogle-status');
              const slotId = element.getAttribute('data-ad-slot');
              
              return (
                <div key={index} className="p-2 bg-muted rounded text-sm">
                  <div>Slot ID: {slotId}</div>
                  <div>Status: <Badge variant={status === 'done' ? 'default' : 'secondary'}>{status || 'pending'}</Badge></div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No ad slots found</p>
          )}
        </div>

        <div className="flex gap-2">
          <Button onClick={refreshAds} size="sm">
            Refresh Ads
          </Button>
          <Button 
            onClick={() => {
              console.log('AdSense Debug Info:', {
                showAds,
                membershipTier,
                adsbyGoogleLoaded,
                adSlotsCount: adSlots?.length,
                window: {
                  adsbygoogle: window.adsbygoogle?.length
                }
              });
            }} 
            variant="outline" 
            size="sm"
          >
            Log Debug Info
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdDebugger;