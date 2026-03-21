import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface TimeoutAwareLoadingIndicatorProps {
  timeout?: number; // milliseconds
  onTimeout?: () => void;
  message?: string;
  showTimeoutWarning?: boolean;
}

const TimeoutAwareLoadingIndicator: React.FC<TimeoutAwareLoadingIndicatorProps> = ({
  timeout = 8000,
  onTimeout,
  message = 'Loading...',
  showTimeoutWarning = true
}) => {
  const [showWarning, setShowWarning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const startTime = performance.now();
    
    // Update elapsed time
    const interval = setInterval(() => {
      setElapsedTime(performance.now() - startTime);
    }, 100);

    // Show warning after timeout
    let warningTimer: NodeJS.Timeout;
    if (showTimeoutWarning) {
      warningTimer = setTimeout(() => {
        setShowWarning(true);
      }, timeout);
    }

    return () => {
      clearInterval(interval);
      clearTimeout(warningTimer);
    };
  }, [timeout, showTimeoutWarning]);

  const handleRetry = () => {
    setShowWarning(false);
    setElapsedTime(0);
    onTimeout?.();
  };

  const formatTime = (ms: number) => {
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (showWarning) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="p-6 max-w-md w-full text-center">
          <div className="mb-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Taking longer than expected</h3>
            <p className="text-muted-foreground text-sm mb-4">
              This is taking longer than usual ({formatTime(elapsedTime)}). 
              This might be due to network conditions or server load.
            </p>
          </div>
          
          <div className="space-y-3">
            <Button onClick={handleRetry} className="w-full">
              Try Again
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              Refresh Page
            </Button>
          </div>
          
          <div className="mt-4 text-xs text-muted-foreground">
            <p>Tips for better performance:</p>
            <ul className="text-left mt-2 space-y-1">
              <li>• Check your internet connection</li>
              <li>• Close unnecessary browser tabs</li>
              <li>• Try refreshing the page</li>
            </ul>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-lg font-medium mb-2">{message}</p>
        <p className="text-sm text-muted-foreground">
          {formatTime(elapsedTime)}
        </p>
        
        {/* Connection status hint */}
        <div className="mt-4 text-xs text-muted-foreground">
          {navigator.onLine ? (
            <span className="flex items-center justify-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              Connected
            </span>
          ) : (
            <span className="flex items-center justify-center text-orange-500">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
              Connection issues detected
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeoutAwareLoadingIndicator;