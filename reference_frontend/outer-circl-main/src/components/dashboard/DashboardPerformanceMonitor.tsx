import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Zap, Shield } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { isDeveloperMode } from '@/utils/developerMode';

interface DashboardPerformanceMonitorProps {
  isLoading: boolean;
  error: string | null;
  eventCount: number;
  onRefresh: () => void;
  loadingStartTime?: number;
}

export const DashboardPerformanceMonitor: React.FC<DashboardPerformanceMonitorProps> = ({
  isLoading,
  error,
  eventCount,
  onRefresh,
  loadingStartTime
}) => {
  const [loadingTime, setLoadingTime] = useState<number>(0);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const { isAdmin } = useUserRole();

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    let timeoutWarning: NodeJS.Timeout | null = null;

    if (isLoading && loadingStartTime) {
      // Update loading time every 100ms
      interval = setInterval(() => {
        const elapsed = Date.now() - loadingStartTime;
        setLoadingTime(elapsed);
      }, 100);

      // Show warning after 5 seconds
      timeoutWarning = setTimeout(() => {
        setShowTimeoutWarning(true);
      }, 5000);
    } else {
      setShowTimeoutWarning(false);
      setLoadingTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (timeoutWarning) clearTimeout(timeoutWarning);
    };
  }, [isLoading, loadingStartTime]);

  // Only show in developer mode or for admins
  if (!isDeveloperMode(isAdmin)) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-64 z-50 bg-background/95 backdrop-blur-sm border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs flex items-center gap-2">
          <Zap className="h-3 w-3" />
          Dashboard Performance
          <span className="text-xs bg-orange-200 text-orange-800 px-1 py-0.5 rounded-full">
            {isAdmin ? 'ADMIN' : 'DEV'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs space-y-1">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className={isLoading ? 'text-yellow-500' : error ? 'text-red-500' : 'text-green-500'}>
              {isLoading ? 'Loading...' : error ? 'Error' : 'Ready'}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span>Events:</span>
            <span className="font-mono">{eventCount}</span>
          </div>
          
          {isLoading && (
            <div className="flex justify-between">
              <span>Time:</span>
              <span className={`font-mono ${loadingTime > 3000 ? 'text-yellow-500' : ''}`}>
                {(loadingTime / 1000).toFixed(1)}s
              </span>
            </div>
          )}
          
          {error && (
            <div className="text-xs text-red-500 mt-2">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              {error}
            </div>
          )}
          
          {showTimeoutWarning && (
            <div className="text-xs text-yellow-600 mt-2 p-2 bg-yellow-50 rounded border">
              <AlertTriangle className="h-3 w-3 inline mr-1" />
              Loading is taking longer than expected
            </div>
          )}
        </div>
        
        <Button 
          onClick={onRefresh} 
          size="sm" 
          variant="outline" 
          className="w-full h-6 text-xs"
          disabled={isLoading}
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardContent>
    </Card>
  );
};