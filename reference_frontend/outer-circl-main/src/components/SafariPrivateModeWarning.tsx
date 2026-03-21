import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { safeLocalStorage, safeSessionStorage } from '@/utils/safeStorage';

/**
 * PHASE 4: Enhanced warning for Safari Private Mode and reload loops
 * Displays a dismissible warning banner when the app detects it's running
 * in Safari Private Mode or when reload loops are detected.
 * 
 * This informs users that some features may be limited but the app will work.
 */
export const SafariPrivateModeWarning = () => {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [reloadLoopDetected, setReloadLoopDetected] = useState(false);

  useEffect(() => {
    // Check if in Private Mode (localStorage unavailable) and not dismissed this session
    const isPrivateMode = !safeLocalStorage.isAvailable();
    
    // PHASE 4: Check for reload loops
    const reloadCount = parseInt(safeSessionStorage.getItem('app_reload_count') || '0');
    const hasReloadLoop = reloadCount > 10;
    
    setReloadLoopDetected(hasReloadLoop);
    
    if ((isPrivateMode || hasReloadLoop) && !dismissed) {
      setShow(true);
    }
  }, [dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    setShow(false);
  };

  const handleClearReloadLoop = () => {
    console.log('👤 User cleared reload loop counter from warning');
    safeSessionStorage.removeItem('app_reload_count');
    safeSessionStorage.removeItem('app_reload_timestamp');
    safeSessionStorage.removeItem('app_session_id');
    safeSessionStorage.removeItem('last_load_time');
    setReloadLoopDetected(false);
    setShow(false);
    // Just clear the state, don't reload - let app continue naturally
    console.log('✅ Reload counters cleared, app will continue');
  };

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4">
      <Alert className="bg-warning/10 border-warning/20">
        <AlertCircle className="h-4 w-4 text-warning" />
        <AlertDescription>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="text-sm text-foreground">
                {reloadLoopDetected ? (
                  <>
                    <strong>Reload loop detected!</strong> The app has reloaded multiple times. 
                    {!safeLocalStorage.isAvailable() && ' This might be caused by Private Mode.'}
                  </>
                ) : (
                  <>You're browsing in Private Mode. Some features may be limited, but the app will work!</>
                )}
              </div>
              {reloadLoopDetected && (
                <Button 
                  onClick={handleClearReloadLoop}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  Clear & Reload
                </Button>
              )}
            </div>
            <button 
              onClick={handleDismiss}
              className="text-warning hover:text-warning/80 transition-colors shrink-0"
              aria-label="Dismiss warning"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};
