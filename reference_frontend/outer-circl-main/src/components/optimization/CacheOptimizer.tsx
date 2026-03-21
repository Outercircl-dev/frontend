import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  HardDrive, 
  Zap, 
  Trash2, 
  RefreshCw,
  TrendingUp,
  Activity
} from 'lucide-react';
import { useAdvancedCaching } from '@/hooks/useAdvancedCaching';
import { useToast } from '@/hooks/use-toast';

interface CacheOptimizerProps {
  className?: string;
}

export const CacheOptimizer: React.FC<CacheOptimizerProps> = ({ 
  className = '' 
}) => {
  const { 
    metrics, 
    cacheStats, 
    clear, 
    cleanup, 
    prefetch,
    invalidate 
  } = useAdvancedCaching();
  
  const { toast } = useToast();
  const [optimizing, setOptimizing] = useState(false);

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Auto-optimize cache
  const optimizeCache = async () => {
    setOptimizing(true);
    
    try {
      // Clean up expired entries
      cleanup();
      
      // Prefetch critical data
      await Promise.all([
        prefetch('events-today', async () => {
          // This would normally fetch today's events
          return { events: [] };
        }, { ttl: 5 * 60 * 1000 }), // 5 minutes
        
        prefetch('user-profile', async () => {
          // This would normally fetch user profile
          return { profile: {} };
        }, { ttl: 30 * 60 * 1000 }) // 30 minutes
      ]);

      toast({
        title: "Cache Optimized",
        description: "Cache has been cleaned and optimized for better performance.",
      });
    } catch (error) {
      toast({
        title: "Optimization Failed",
        description: "Could not optimize cache. Please try again.",
        variant: "destructive"
      });
    } finally {
      setOptimizing(false);
    }
  };

  // Calculate cache efficiency
  const totalRequests = cacheStats.hits + cacheStats.misses;
  const hitRate = totalRequests > 0 ? (cacheStats.hits / totalRequests) * 100 : 0;
  const efficiency = hitRate > 80 ? 'excellent' : hitRate > 60 ? 'good' : hitRate > 40 ? 'fair' : 'poor';

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Cache Performance
          </CardTitle>
          <CardDescription>
            Real-time cache metrics and optimization tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Cache Hit Rate */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Hit Rate</span>
                  <Badge variant={
                    efficiency === 'excellent' ? 'default' :
                    efficiency === 'good' ? 'secondary' :
                    efficiency === 'fair' ? 'outline' : 'destructive'
                  }>
                    {hitRate.toFixed(1)}%
                  </Badge>
                </div>
                <Progress value={hitRate} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Cache efficiency: {efficiency}
                </p>
              </div>

              {/* Storage Usage */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    <span className="text-xs text-muted-foreground">Size</span>
                  </div>
                  <p className="text-sm font-medium">{formatBytes(metrics.totalSize)}</p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    <span className="text-xs text-muted-foreground">Entries</span>
                  </div>
                  <p className="text-sm font-medium">{metrics.entries}</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={optimizeCache}
                  disabled={optimizing}
                  className="flex-1"
                >
                  {optimizing ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-2" />
                  )}
                  Optimize
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cleanup()}
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Cleanup
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-medium">Request Statistics</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hits:</span>
                      <span className="font-medium text-green-600">{cacheStats.hits}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Misses:</span>
                      <span className="font-medium text-red-600">{cacheStats.misses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="font-medium">{totalRequests}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Storage Details</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Size:</span>
                      <span className="font-medium">{formatBytes(metrics.totalSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Entries:</span>
                      <span className="font-medium">{metrics.entries}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hit Rate:</span>
                      <span className="font-medium">{metrics.hitRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {metrics.lastCleared && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Last cleared: {metrics.lastCleared.toLocaleTimeString()}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tools" className="space-y-4">
              <div className="grid gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    invalidate('events-.*');
                    toast({
                      title: "Events Cache Cleared",
                      description: "All event-related cache entries have been invalidated.",
                    });
                  }}
                  className="justify-start"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Events Cache
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    invalidate('user-.*');
                    toast({
                      title: "User Cache Cleared",
                      description: "All user-related cache entries have been invalidated.",
                    });
                  }}
                  className="justify-start"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear User Cache
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    clear();
                    toast({
                      title: "All Cache Cleared",
                      description: "All cache entries have been removed.",
                      variant: "destructive"
                    });
                  }}
                  className="justify-start"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Cache
                </Button>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Cache optimization improves app performance by storing frequently accessed data.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};