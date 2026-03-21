// PHASE 6: Mobile-specific loading screen with Pinterest-style UX
// FOUNDATIONAL FIX: Non-destructive emergency escape, connection-aware timeouts
import { useEffect, useState } from 'react';
import { ApplicationController } from '@/core/ApplicationController';

interface MobileLoadingScreenProps {
  message?: string;
  showProgressBar?: boolean;
  progress?: number; // Actual progress from initialization
  step?: string; // e.g. "1/3", "2/3"
  startTime?: number; // When initialization started
  'data-loading-screen'?: string; // PHASE 1: DOM selector for emergency fallback
}

export const MobileLoadingScreen: React.FC<MobileLoadingScreenProps> = ({ 
  message = 'Loading...', 
  showProgressBar = true,
  progress: actualProgress,
  step,
  startTime,
  'data-loading-screen': dataLoadingScreen
}) => {
  const [displayProgress, setDisplayProgress] = useState(actualProgress || 0);
  const [showRefresh, setShowRefresh] = useState(false);
  const [showEmergencyEscape, setShowEmergencyEscape] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // PHASE 5: Faster emergency escape timeout for production
  const getEmergencyTimeout = () => {
    const connectionType = ApplicationController.getConnectionType();
    const isMobile = ApplicationController.isMobileDevice();
    
    // PRODUCTION: Show escape faster for better UX
    if (!isMobile) return 8000; // Desktop: 8s (was 12s)
    
    switch (connectionType) {
      case '4g': return 10000; // Mobile 4G: 10s (was 15s)
      case '3g': return 15000; // Mobile 3G: 15s (was 25s)
      case '2g':
      case 'slow-2g': return 25000; // Mobile 2G: 25s (was 45s)
      default: return 10000; // Default mobile: 10s (was 15s)
    }
  };

  useEffect(() => {
    // Update display progress when actual progress is provided
    if (actualProgress !== undefined) {
      setDisplayProgress(actualProgress);
    }
  }, [actualProgress]);

  useEffect(() => {
    // Track elapsed time for transparency
    if (!startTime) return;
    
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  useEffect(() => {
    if (!showProgressBar) return;

    // Only show fake progress if no actual progress provided
    if (actualProgress === undefined) {
      const interval = setInterval(() => {
        setDisplayProgress(p => {
          if (p >= 90) return p; // Stop at 90% and wait for actual load
          return Math.min(p + Math.random() * 15, 90);
        });
      }, 300);

      return () => clearInterval(interval);
    }
  }, [showProgressBar, actualProgress]);

  useEffect(() => {
    // PHASE 1 FIX: Connection-aware timeouts
    const emergencyTimeout = getEmergencyTimeout();
    const refreshTimeout = Math.max(8000, emergencyTimeout - 5000);
    
    const refreshTimer = setTimeout(() => setShowRefresh(true), refreshTimeout);
    const emergencyTimer = setTimeout(() => setShowEmergencyEscape(true), emergencyTimeout);

    return () => {
      clearTimeout(refreshTimer);
      clearTimeout(emergencyTimer);
    };
  }, []);

  // PHASE 1 FIX: Non-destructive emergency escape
  const handleEmergencyEscape = () => {
    console.warn('🚨 User requested emergency continue');
    
    // Don't clear cache - try to continue with what we have
    try {
      // Check if we have cached session
      const cachedSession = localStorage.getItem('sb-rqdslxqmpmyiafptpqyx-auth-token');
      
      if (cachedSession) {
        console.log('📦 Continuing with cached session');
        window.location.href = '/dashboard'; // Navigate with cache
      } else {
        console.log('🏠 No cache - going to landing page');
        window.location.href = '/'; // Go to public landing page
      }
    } catch (e) {
      console.error('Emergency continue failed:', e);
      // Last resort: reload
      ApplicationController.requestReload('Emergency continue failed', 'temporary' as any);
    }
  };

  return (
    <div 
      className="min-h-screen bg-background flex flex-col items-center justify-center p-4"
      data-loading-screen={dataLoadingScreen}
    >
      {/* Pinterest-style logo/icon */}
      <div className="w-16 h-16 mb-6 bg-primary rounded-full animate-pulse" />
      
      {/* Brand name */}
      <h2 className="text-xl font-bold text-foreground mb-2">outercircl</h2>
      
      {/* PHASE 2 FIX: Progressive loading transparency */}
      <div className="text-center mb-4">
        {step && <p className="text-xs text-muted-foreground mb-1">{step}</p>}
        <p className="text-muted-foreground">{message}</p>
        {elapsedTime > 0 && (
          <p className="text-xs text-muted-foreground/60 mt-1">{elapsedTime}s elapsed</p>
        )}
      </div>
      
      {/* Progress bar with actual progress */}
      {showProgressBar && (
        <div className="w-64 space-y-2">
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out" 
              style={{ width: `${displayProgress}%` }}
            />
          </div>
          {actualProgress !== undefined && (
            <p className="text-xs text-center text-muted-foreground">{Math.round(displayProgress)}%</p>
          )}
        </div>
      )}
      
      {/* Network status indicator */}
      {!navigator.onLine && (
        <div className="mt-4 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">📴 You appear to be offline</p>
        </div>
      )}
      
      {/* Connection type indicator for transparency */}
      {ApplicationController.isMobileDevice() && (
        <p className="mt-2 text-xs text-muted-foreground/60">
          Network: {ApplicationController.getConnectionType() || 'unknown'}
        </p>
      )}
      
      {/* Refresh button after timeout */}
      {showRefresh && (
        <button 
          onClick={() => ApplicationController.requestReload('User requested refresh', 'temporary' as any)}
          className="mt-6 text-primary underline hover:no-underline text-sm font-medium"
        >
          Taking longer than usual? Tap to refresh
        </button>
      )}
      
      {/* PHASE 1 FIX: Non-destructive emergency escape */}
      {showEmergencyEscape && (
        <button 
          onClick={handleEmergencyEscape}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium"
        >
          Continue anyway
        </button>
      )}
    </div>
  );
};

export default MobileLoadingScreen;
