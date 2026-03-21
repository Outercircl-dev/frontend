import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Activity, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useMembership } from '@/components/OptimizedProviders';

declare global {
  interface Window {
    adSenseDebugData?: {
      impressions: number;
      requests: number;
      errors: string[];
      lastRequest: Date | null;
      adServerResponses: any[];
    };
  }
}

const ProductionAdSenseDebugger: React.FC = () => {
  const { showAds, membershipTier } = useMembership();
  const [isOpen, setIsOpen] = useState(false);
  const [debugData, setDebugData] = useState({
    impressions: 0,
    requests: 0,
    errors: [],
    lastRequest: null,
    adServerResponses: []
  });
  const [adSlots, setAdSlots] = useState<any[]>([]);
  const [isProduction, setIsProduction] = useState(false);

  useEffect(() => {
    // Check if we're in production
    setIsProduction(window.location.hostname !== 'localhost');
    
    // Update debug data from global window object
    const updateDebugData = () => {
      if (window.adSenseDebugData) {
        setDebugData({ ...window.adSenseDebugData });
      }
    };

    // Scan for ad slots
    const scanAdSlots = () => {
      const slots = Array.from(document.querySelectorAll('.adsbygoogle')).map((element, index) => {
        const rect = element.getBoundingClientRect();
        return {
          id: index,
          element,
          visible: rect.width > 0 && rect.height > 0,
          hasContent: element.children.length > 0 || element.innerHTML.trim().length > 0,
          dimensions: `${rect.width}x${rect.height}`,
          slot: element.getAttribute('data-ad-slot') || 'unknown'
        };
      });
      setAdSlots(slots);
    };

    updateDebugData();
    scanAdSlots();

    // Update periodically
    const interval = setInterval(() => {
      updateDebugData();
      scanAdSlots();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Only show in development or for admin users on production
  const shouldShow = process.env.NODE_ENV === 'development' || 
    (isProduction && window.location.search.includes('debug=ads'));

  if (!shouldShow) return null;

  const fillRate = debugData.requests > 0 ? 
    ((debugData.impressions / debugData.requests) * 100).toFixed(1) : '0';

  const getStatusColor = () => {
    if (!showAds) return 'secondary';
    if (debugData.errors.length > 0) return 'destructive';
    if (debugData.impressions > 0) return 'default';
    return 'secondary';
  };

  const getStatusIcon = () => {
    if (!showAds) return <AlertCircle className="w-4 h-4" />;
    if (debugData.errors.length > 0) return <AlertCircle className="w-4 h-4" />;
    if (debugData.impressions > 0) return <CheckCircle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <Card className="shadow-lg border-2">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <CardTitle className="text-sm">AdSense Monitor</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusColor()} className="gap-1">
                    {getStatusIcon()}
                    {!showAds ? 'Premium' : debugData.impressions > 0 ? 'Active' : 'Loading'}
                  </Badge>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="pt-0">
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="text-lg font-bold text-primary">{debugData.requests}</div>
                  <div className="text-xs text-muted-foreground">Requests</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="text-lg font-bold text-green-600">{debugData.impressions}</div>
                  <div className="text-xs text-muted-foreground">Served</div>
                </div>
                <div className="text-center p-2 bg-muted/50 rounded">
                  <div className="text-lg font-bold text-blue-600">{fillRate}%</div>
                  <div className="text-xs text-muted-foreground">Fill Rate</div>
                </div>
              </div>

              {/* Status Information */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Environment:</span>
                  <Badge variant={isProduction ? 'default' : 'secondary'}>
                    {isProduction ? 'Production' : 'Development'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Membership:</span>
                  <Badge variant={showAds ? 'secondary' : 'default'}>
                    {membershipTier || 'Standard'}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ad Slots Found:</span>
                  <Badge>{adSlots.length}</Badge>
                </div>
              </div>

              {/* Ad Slots Status */}
              {adSlots.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Ad Slots
                  </h4>
                  <div className="space-y-1">
                    {adSlots.map((slot) => (
                      <div key={slot.id} className="flex justify-between items-center text-xs bg-muted/30 p-2 rounded">
                        <span>Slot {slot.slot}</span>
                        <div className="flex gap-1">
                          <Badge variant={slot.visible ? 'default' : 'secondary'} className="text-xs">
                            {slot.visible ? 'Visible' : 'Hidden'}
                          </Badge>
                          <Badge variant={slot.hasContent ? 'default' : 'outline'} className="text-xs">
                            {slot.hasContent ? 'Loaded' : 'Empty'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {debugData.errors.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2 text-destructive">Recent Errors</h4>
                  <div className="text-xs text-muted-foreground bg-destructive/10 p-2 rounded max-h-20 overflow-y-auto">
                    {debugData.errors.slice(-3).map((error, index) => (
                      <div key={index} className="mb-1">{error}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Last Activity */}
              {debugData.lastRequest && (
                <div className="text-xs text-muted-foreground text-center">
                  Last activity: {new Date(debugData.lastRequest).toLocaleTimeString()}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => window.location.reload()}
                >
                  Refresh
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => console.log('AdSense Debug Data:', debugData)}
                >
                  Log Data
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};

export default ProductionAdSenseDebugger;