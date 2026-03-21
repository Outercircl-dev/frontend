import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, Wifi, WifiOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface PerformanceAlert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  details?: string;
  timestamp: number;
  persistent?: boolean;
}

const PerformanceAlertsManager: React.FC = () => {
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Monitor network status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor performance issues
    const checkPerformanceIssues = () => {
      // Check for slow navigation
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation && navigation.loadEventEnd - navigation.fetchStart > 5000) {
        addAlert({
          id: 'slow-load',
          type: 'warning',
          message: 'Slow page load detected',
          details: `Page took ${Math.round((navigation.loadEventEnd - navigation.fetchStart) / 1000)}s to load`,
          timestamp: Date.now()
        });
      }

      // Check for memory issues
      if ('memory' in performance && (performance as any).memory) {
        const memory = (performance as any).memory;
        if (memory.usedJSHeapSize / memory.totalJSHeapSize > 0.9) {
          addAlert({
            id: 'high-memory',
            type: 'warning',
            message: 'High memory usage detected',
            details: 'Consider refreshing the page to free up memory',
            timestamp: Date.now()
          });
        }
      }
    };

    // Check performance on load and periodically
    const interval = setInterval(checkPerformanceIssues, 30000); // Every 30 seconds
    checkPerformanceIssues();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const addAlert = (alert: Omit<PerformanceAlert, 'id'> & { id?: string }) => {
    const newAlert: PerformanceAlert = {
      id: alert.id || `alert-${Date.now()}`,
      ...alert
    };

    setAlerts(prev => {
      // Remove existing alert with same ID
      const filtered = prev.filter(a => a.id !== newAlert.id);
      return [...filtered, newAlert];
    });

    // Auto-remove non-persistent alerts after 10 seconds
    if (!alert.persistent) {
      setTimeout(() => {
        removeAlert(newAlert.id);
      }, 10000);
    }
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const getAlertIcon = (type: PerformanceAlert['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAlertVariant = (type: PerformanceAlert['type']) => {
    return type === 'error' ? 'destructive' : 'default';
  };

  // Network status alert
  useEffect(() => {
    if (!isOnline) {
      addAlert({
        id: 'offline',
        type: 'error',
        message: 'No internet connection',
        details: 'Some features may not work properly',
        timestamp: Date.now(),
        persistent: true
      });
    } else {
      removeAlert('offline');
    }
  }, [isOnline]);

  if (alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {!isOnline && (
        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>You're offline</span>
          </AlertDescription>
        </Alert>
      )}
      
      {alerts.slice(-3).map((alert) => ( // Show only last 3 alerts
        <Alert 
          key={alert.id} 
          variant={getAlertVariant(alert.type)}
          className="relative"
        >
          <div className="flex items-start space-x-2">
            {getAlertIcon(alert.type)}
            <div className="flex-1">
              <AlertDescription>
                <div className="font-medium">{alert.message}</div>
                {alert.details && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {alert.details}
                  </div>
                )}
              </AlertDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => removeAlert(alert.id)}
            >
              <XCircle className="h-3 w-3" />
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  );
};

export default PerformanceAlertsManager;