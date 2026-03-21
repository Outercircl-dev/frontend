import React from 'react';
import { useMembership } from '@/components/OptimizedProviders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BannerAd, SidebarAd, PinterestStyleAd, AdDebugger } from '@/components/ads';
import AdSenseDebugPanel from '@/components/ads/AdSenseDebugPanel';
import { useUserRole } from '@/hooks/useUserRole';
import { isDeveloperMode } from '@/utils/developerMode';
import { Shield } from 'lucide-react';

const AdTestingPanel: React.FC = () => {
  const { showAds } = useMembership();
  const { isAdmin } = useUserRole();

  // Only show this panel in developer mode
  if (!isDeveloperMode(isAdmin)) {
    return null;
  }

  if (!showAds) {
    return (
      <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Ad Testing Panel - Premium User 
            <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
              {isAdmin ? 'ADMIN' : 'DEV'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Ads are disabled for premium users. This panel is only visible for standard membership users in developer mode.</p>
        </CardContent>
      </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <AdSenseDebugPanel />
      <AdDebugger />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Ad Testing - Standard User (Debug Mode)
            <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
              {isAdmin ? 'ADMIN' : 'DEV'}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div>
            <h3 className="font-medium mb-2">Banner Ad Test</h3>
            <BannerAd slot="1234567890" className="border border-dashed border-gray-300" debug={true} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Sidebar Ad Test</h3>
              <SidebarAd slot="9876543210" className="border border-dashed border-gray-300" debug={true} />
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium mb-2">Pinterest-Style Ads</h3>
              <PinterestStyleAd slot="5432198765" size="small" className="border border-dashed border-gray-300" debug={true} />
              <PinterestStyleAd slot="6543219876" size="medium" className="border border-dashed border-gray-300" debug={true} />
            </div>
          </div>

          <div className="text-sm text-muted-foreground bg-orange-50 p-3 rounded">
            <p className="font-medium text-orange-800 mb-2">🚨 Critical Issue: Using Test Ad Slot IDs</p>
            <p className="mb-2">The current implementation uses placeholder slot IDs that will never show real ads:</p>
            <ul className="list-disc list-inside mt-1 space-y-1 text-orange-700">
              <li><strong>Test slots like "1234567890" won't display ads</strong></li>
              <li>You need to create real ad units in your Google AdSense account</li>
              <li>Replace test slot IDs with the real ones from AdSense dashboard</li>
              <li>Ensure your AdSense account is approved and ads are enabled</li>
            </ul>
          </div>

          <div className="text-sm text-muted-foreground">
            <p><strong>Debugging Steps:</strong></p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Check that AdSense script is loaded (see debug panels above)</li>
              <li>Ensure you're using a standard membership account</li>
              <li>Verify ads.txt file is properly configured</li>
              <li>Content Security Policy allows AdSense domains (✓ already configured)</li>
              <li>Look for detailed logs in browser console</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdTestingPanel;