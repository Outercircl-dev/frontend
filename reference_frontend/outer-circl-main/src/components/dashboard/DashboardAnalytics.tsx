import React, { useEffect, useState } from 'react';
import { performanceTracker, getMemoryUsage, getConnectionInfo } from '@/utils/performanceOptimizations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Wifi, Cpu, Clock } from 'lucide-react';
import { isDeveloperMode } from '@/utils/developerMode';
import { useUserRole } from '@/hooks/useUserRole';

interface DashboardAnalyticsProps {
  eventsCount: number;
  cacheHitRate: number;
  lastFetchTime?: number;
}

export const DashboardAnalytics: React.FC<DashboardAnalyticsProps> = ({
  eventsCount,
  cacheHitRate,
  lastFetchTime
}) => {
  const [performanceData, setPerformanceData] = useState<any>({});
  const [memoryUsage, setMemoryUsage] = useState<any>(null);
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const { isAdmin } = useUserRole();

  useEffect(() => {
    // Update performance data every 5 seconds
    const updatePerformanceData = () => {
      setPerformanceData(performanceTracker.getPerformanceReport());
      setMemoryUsage(getMemoryUsage());
      setConnectionInfo(getConnectionInfo());
    };

    updatePerformanceData();
    const interval = setInterval(updatePerformanceData, 5000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getPerformanceColor = (value: number, thresholds: { good: number; poor: number }) => {
    if (value <= thresholds.good) return 'bg-green-100 text-green-800';
    if (value <= thresholds.poor) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  // Only show in developer mode for admins
  if (!isDeveloperMode(isAdmin)) return null;

  return (
    <Card className="fixed top-20 left-4 w-80 z-50 bg-background/95 backdrop-blur-sm border-border shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Dashboard Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        {/* Core Metrics */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Events:</span>
              <Badge variant="secondary">{eventsCount}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cache Hit:</span>
              <Badge className={getPerformanceColor(100 - cacheHitRate, { good: 10, poor: 30 })}>
                {cacheHitRate.toFixed(0)}%
              </Badge>
            </div>
          </div>
          
          {lastFetchTime && (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Fetch:</span>
                <Badge variant="outline">
                  {formatTime(Date.now() - lastFetchTime)} ago
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        {Object.keys(performanceData).length > 0 && (
          <div className="border-t pt-3">
            <h4 className="font-medium mb-2 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Performance
            </h4>
            <div className="space-y-1">
              {Object.entries(performanceData).slice(0, 4).map(([operation, data]: [string, any]) => (
                <div key={operation} className="flex justify-between">
                  <span className="text-muted-foreground">{operation}:</span>
                  <Badge 
                    className={getPerformanceColor(data.average, { good: 100, poor: 1000 })}
                  >
                    {formatTime(data.average)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Memory Usage */}
        {memoryUsage && (
          <div className="border-t pt-3">
            <h4 className="font-medium mb-2 flex items-center gap-1">
              <Cpu className="h-3 w-3" />
              Memory
            </h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Used:</span>
                <Badge 
                  className={getPerformanceColor(memoryUsage.used, { good: 50, poor: 100 })}
                >
                  {memoryUsage.used}MB
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <Badge variant="outline">{memoryUsage.total}MB</Badge>
              </div>
            </div>
          </div>
        )}

        {/* Connection Info */}
        {connectionInfo && (
          <div className="border-t pt-3">
            <h4 className="font-medium mb-2 flex items-center gap-1">
              <Wifi className="h-3 w-3" />
              Connection
            </h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <Badge variant="outline">{connectionInfo.effectiveType}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Speed:</span>
                <Badge variant="outline">{connectionInfo.downlink} Mbps</Badge>
              </div>
              {connectionInfo.saveData && (
                <Badge className="w-full bg-blue-100 text-blue-800">
                  Data Saver Mode
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};