import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMembership } from '@/components/OptimizedProviders';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, RefreshCw, AlertTriangle, CheckCircle, XCircle, Shield } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { isDeveloperMode } from '@/utils/developerMode';

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

interface AdSlotInfo {
  element: HTMLElement;
  slot: string;
  hasContent: boolean;
  dimensions: { width: number; height: number };
  innerHTML: string;
}

const AdSenseDebugPanel: React.FC = () => {
  const { membershipTier, showAds } = useMembership();
  const { isAdmin } = useUserRole();
  const [adSlots, setAdSlots] = useState<AdSlotInfo[]>([]);
  const [scriptStatus, setScriptStatus] = useState<'loading' | 'loaded' | 'failed'>('loading');
  const [isOpen, setIsOpen] = useState(false);
  const [networkRequests, setNetworkRequests] = useState<string[]>([]);

  // Only show in developer mode
  if (!isDeveloperMode(isAdmin)) {
    return null;
  }

  useEffect(() => {
    checkAdSenseScript();
    scanAdSlots();
    monitorNetworkRequests();
    
    const interval = setInterval(scanAdSlots, 3000);
    return () => clearInterval(interval);
  }, []);

  const checkAdSenseScript = () => {
    if (window.adsbygoogle) {
      setScriptStatus('loaded');
    } else {
      const checkInterval = setInterval(() => {
        if (window.adsbygoogle) {
          setScriptStatus('loaded');
          clearInterval(checkInterval);
        }
      }, 500);

      setTimeout(() => {
        if (!window.adsbygoogle) {
          setScriptStatus('failed');
        }
        clearInterval(checkInterval);
      }, 10000);
    }
  };

  const scanAdSlots = () => {
    const adElements = document.querySelectorAll('.adsbygoogle');
    const slots: AdSlotInfo[] = [];

    adElements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const slot = htmlElement.getAttribute('data-ad-slot') || 'unknown';
      const hasContent = htmlElement.innerHTML.length > 100 || htmlElement.children.length > 0;
      const rect = htmlElement.getBoundingClientRect();
      
      slots.push({
        element: htmlElement,
        slot,
        hasContent,
        dimensions: { width: rect.width, height: rect.height },
        innerHTML: htmlElement.innerHTML.substring(0, 300)
      });
    });

    setAdSlots(slots);
  };

  const monitorNetworkRequests = () => {
    // Simple network monitoring for AdSense requests
    const requests: string[] = [];
    
    // Check for existing script tags
    const scripts = document.querySelectorAll('script[src*="googlesyndication"]');
    scripts.forEach(script => {
      requests.push(`Script: ${script.getAttribute('src')}`);
    });

    setNetworkRequests(requests);
  };

  const refreshAds = () => {
    if (window.adsbygoogle && window.adsbygoogle.length > 0) {
      try {
        // Clear existing ads
        const adElements = document.querySelectorAll('.adsbygoogle');
        adElements.forEach(element => {
          const htmlElement = element as HTMLElement;
          htmlElement.innerHTML = '';
        });

        // Request new ads
        adElements.forEach(() => {
          window.adsbygoogle.push({});
        });

        console.log('🔄 AdSense: Manually refreshed all ads');
        setTimeout(scanAdSlots, 2000);
      } catch (error) {
        console.error('❌ AdSense: Failed to refresh ads', error);
      }
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getScriptStatusBadge = () => {
    switch (scriptStatus) {
      case 'loaded':
        return <Badge variant="default" className="bg-green-500">Loaded</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Loading...</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                AdSense Debug Panel
                <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
                  {isAdmin ? 'ADMIN' : 'DEV'}
                </span>
                {!showAds && <AlertTriangle className="w-4 h-4 text-orange-500" />}
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Membership Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Membership:</span>
                <Badge variant={membershipTier === 'premium' ? 'default' : 'secondary'}>
                  {membershipTier}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Show Ads:</span>
                {getStatusIcon(showAds)}
              </div>
            </div>

            {/* Script Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">AdSense Script:</span>
              {getScriptStatusBadge()}
            </div>

            {/* Ad Slots Summary */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Ad Slots Found:</span>
              <Badge variant="outline">{adSlots.length}</Badge>
            </div>

            {/* Ad Slots Details */}
            {adSlots.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Ad Slots Details:</h4>
                {adSlots.map((slot, index) => (
                  <div key={index} className="p-2 border rounded text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Slot: {slot.slot}</span>
                      {getStatusIcon(slot.hasContent)}
                    </div>
                    <div className="text-muted-foreground">
                      Dimensions: {Math.round(slot.dimensions.width)}x{Math.round(slot.dimensions.height)}
                    </div>
                    {slot.hasContent && (
                      <div className="text-green-600">✓ Ad content loaded</div>
                    )}
                    {!slot.hasContent && (
                      <div className="text-orange-600">⚠ No ad content detected</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Network Requests */}
            {networkRequests.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Network Requests:</h4>
                <div className="text-xs space-y-1">
                  {networkRequests.map((request, index) => (
                    <div key={index} className="text-muted-foreground truncate">
                      {request}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button 
                onClick={refreshAds} 
                variant="outline" 
                size="sm"
                disabled={!showAds || scriptStatus !== 'loaded'}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh Ads
              </Button>
              <Button 
                onClick={scanAdSlots} 
                variant="outline" 
                size="sm"
              >
                Re-scan Slots
              </Button>
            </div>

            {/* Instructions */}
            <div className="text-xs text-muted-foreground space-y-1">
              <div>• Use debug=true prop on AdSenseUnit components for detailed logging</div>
              <div>• Check browser console for detailed AdSense messages</div>
              <div>• Ensure you're using a standard membership account to see ads</div>
              {adSlots.some(slot => /^[0-9]+$/.test(slot.slot)) && (
                <div className="text-orange-600">
                  ⚠ Warning: Test ad slot IDs detected. Replace with real Google AdSense slots!
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default AdSenseDebugPanel;