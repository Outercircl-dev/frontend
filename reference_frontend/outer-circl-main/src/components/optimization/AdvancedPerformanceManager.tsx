import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Database, 
  Image, 
  Wifi, 
  WifiOff, 
  Settings,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

import { CoreWebVitalsMonitor } from './CoreWebVitalsMonitor';
import { PerformanceTelemetry } from './PerformanceTelemetry';
import { useSafePerformanceBudget } from '@/hooks/useSafePerformanceBudget';
import { useDatabaseOptimization } from '@/hooks/useDatabaseOptimization';


interface ServiceWorkerStatus {
  isInstalled: boolean;
  isActivated: boolean;
  isControlling: boolean;
  cacheSize: number;
}

export const AdvancedPerformanceManager: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [swStatus, setSwStatus] = useState<ServiceWorkerStatus>({
    isInstalled: false,
    isActivated: false,
    isControlling: false,
    cacheSize: 0,
  });

  const { 
    violations, 
    getPerformanceSummary, 
    startMonitoring, 
    stopMonitoring, 
    isMonitoring,
    clearViolations,
    isPerformanceReady,
    performanceError
  } = useSafePerformanceBudget();

  const { getCacheStats, clearCache, config: dbConfig } = useDatabaseOptimization();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor Service Worker status
  useEffect(() => {
    const checkServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        
        if (registration) {
          const cacheNames = await caches.keys();
          let totalSize = 0;
          
          for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            totalSize += requests.length;
          }

          setSwStatus({
            isInstalled: !!registration.installing || !!registration.waiting || !!registration.active,
            isActivated: !!registration.active,
            isControlling: !!navigator.serviceWorker.controller,
            cacheSize: totalSize,
          });
        }
      }
    };

    checkServiceWorker();
    const interval = setInterval(checkServiceWorker, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleClearCache = async () => {
    // Clear database cache
    clearCache();
    
    // Clear browser cache
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
    
    // Force reload service worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    }
    
    window.location.reload();
  };

  const performanceSummary = getPerformanceSummary();
  const cacheStats = getCacheStats();

  const getStatusColor = (isGood: boolean) => isGood ? 'text-green-600' : 'text-red-600';
  const getStatusIcon = (isGood: boolean) => isGood ? CheckCircle : AlertTriangle;

  // Show error state if performance APIs are not available
  if (!isPerformanceReady) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Performance Manager Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {performanceError || 'Performance monitoring APIs are not available in this environment.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PerformanceTelemetry />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Advanced Performance Manager
            <Badge variant={performanceSummary.isHealthy ? "default" : "destructive"}>
              {performanceSummary.isHealthy ? "Healthy" : "Issues Detected"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="vitals">Web Vitals</TabsTrigger>
              <TabsTrigger value="cache">Cache</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Network Status */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      {isOnline ? (
                        <Wifi className={`w-5 h-5 ${getStatusColor(true)}`} />
                      ) : (
                        <WifiOff className={`w-5 h-5 ${getStatusColor(false)}`} />
                      )}
                      <div>
                        <div className="font-medium">Network</div>
                        <div className={`text-sm ${getStatusColor(isOnline)}`}>
                          {isOnline ? 'Online' : 'Offline'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Service Worker */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Settings className={`w-5 h-5 ${getStatusColor(swStatus.isControlling)}`} />
                      <div>
                        <div className="font-medium">Service Worker</div>
                        <div className={`text-sm ${getStatusColor(swStatus.isControlling)}`}>
                          {swStatus.isControlling ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Database Cache */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Database className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium">DB Cache</div>
                        <div className="text-sm text-muted-foreground">
                          {cacheStats.validEntries} entries
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Budget */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Activity className={`w-5 h-5 ${getStatusColor(performanceSummary.isHealthy)}`} />
                      <div>
                        <div className="font-medium">Budget</div>
                        <div className={`text-sm ${getStatusColor(performanceSummary.isHealthy)}`}>
                          {performanceSummary.errorCount === 0 ? 'Within Budget' : `${performanceSummary.errorCount} Violations`}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Violations */}
              {violations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      Recent Performance Issues
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {violations.slice(0, 5).map((violation, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium">{violation.type}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(violation.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                          <Badge variant={violation.severity === 'error' ? 'destructive' : 'secondary'}>
                            {violation.current.toFixed(0)} / {violation.budget.toFixed(0)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3" 
                      onClick={clearViolations}
                    >
                      Clear Violations
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Monitoring Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Monitoring</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={isMonitoring ? stopMonitoring : startMonitoring}
                      variant={isMonitoring ? "destructive" : "default"}
                    >
                      {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
                    </Button>
                    <Badge variant={isMonitoring ? "default" : "secondary"}>
                      {isMonitoring ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vitals">
              <CoreWebVitalsMonitor />
            </TabsContent>

            <TabsContent value="cache" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cache Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Database Cache</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Total Entries:</span>
                          <span>{cacheStats.totalSize}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Valid Entries:</span>
                          <span>{cacheStats.validEntries}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Hit Rate:</span>
                          <span>{(cacheStats.hitRate * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={cacheStats.hitRate * 100} className="mt-2" />
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Service Worker Cache</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Cached Resources:</span>
                          <span>{swStatus.cacheSize}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <Badge variant={swStatus.isControlling ? "default" : "secondary"}>
                            {swStatus.isControlling ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => clearCache()}
                      className="flex items-center gap-2"
                    >
                      <Database className="w-4 h-4" />
                      Clear DB Cache
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleClearCache}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Clear All Caches
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Optimization Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Database Optimization</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span>Query Cache:</span>
                          <Badge variant={dbConfig.enableQueryCache ? "default" : "secondary"}>
                            {dbConfig.enableQueryCache ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Real-time Updates:</span>
                          <Badge variant={dbConfig.enableRealTimeUpdates ? "default" : "secondary"}>
                            {dbConfig.enableRealTimeUpdates ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Query Batching:</span>
                          <Badge variant={dbConfig.enableBatchingQueries ? "default" : "secondary"}>
                            {dbConfig.enableBatchingQueries ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-3">Performance Features</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span>Cache Status:</span>
                          <Badge variant="default">
                            Active
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Monitoring:</span>
                          <Badge variant={isMonitoring ? "default" : "secondary"}>
                            {isMonitoring ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};