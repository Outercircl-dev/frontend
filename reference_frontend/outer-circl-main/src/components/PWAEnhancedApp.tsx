import React from 'react';
import PWAInstallPrompt from './pwa/PWAInstallPrompt';
import PullToRefresh from './pwa/PullToRefresh';
import { usePWAFeatures } from '@/hooks/usePWAFeatures';

interface PWAEnhancedAppProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
}

/**
 * Enhanced PWA wrapper that adds advanced mobile features
 */
const PWAEnhancedApp: React.FC<PWAEnhancedAppProps> = ({ children, onRefresh }) => {
  const { isOnline } = usePWAFeatures();

  const handleRefresh = async () => {
    if (onRefresh) {
      await onRefresh();
    } else {
      // Default refresh behavior
      window.location.reload();
    }
  };

  return (
    <>
      {/* Offline indicator */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm">
          You're offline. Some features may not be available.
        </div>
      )}

      {/* Pull-to-refresh wrapper */}
      <PullToRefresh onRefresh={handleRefresh}>
        {children}
      </PullToRefresh>

      {/* PWA install prompt */}
      <PWAInstallPrompt />
    </>
  );
};

export default PWAEnhancedApp;