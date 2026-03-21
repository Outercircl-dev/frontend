import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, Clock, Database, TrendingUp, RefreshCw } from 'lucide-react';
import { progressiveImageLoader } from '@/services/progressiveImageLoader';
import { optimizedStockImageService } from '@/services/optimizedStockImageService';

const ImageLoadingDebugger: React.FC = () => {
  const [progressiveStats, setProgressiveStats] = useState({
    batchesLoaded: 0,
    totalBatches: 0,
    totalImages: 0,
    loadingProgress: 0
  });
  
  const [cacheStats, setCacheStats] = useState({
    cacheSize: 0,
    inFlightRequests: 0
  });
  
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      setProgressiveStats(progressiveImageLoader.getLoadingStats());
      setCacheStats(optimizedStockImageService.getCacheStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const clearAllCaches = () => {
    optimizedStockImageService.clearCache();
    setCacheStats({ cacheSize: 0, inFlightRequests: 0 });
  };

  if (!isVisible) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 z-50 bg-white/90 backdrop-blur-sm border-pink-200"
      >
        <Zap className="h-4 w-4 mr-1" />
        Debug
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 left-4 z-50 w-80 bg-white/95 backdrop-blur-sm border-pink-200 shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-green-500" />
            Image Loading Performance
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsVisible(false)}
            className="h-6 w-6 p-0"
          >
            ×
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3 text-xs">
        {/* Progressive Loading Stats */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-medium">
            <TrendingUp className="h-3 w-3 text-blue-500" />
            Progressive Loading
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Progress:</span>
              <Badge variant="outline" className="text-xs h-5">
                {Math.round(progressiveStats.loadingProgress)}%
              </Badge>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Images:</span>
              <Badge variant="outline" className="text-xs h-5 bg-green-50 border-green-200">
                {progressiveStats.totalImages}
              </Badge>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Batches:</span>
              <Badge variant="outline" className="text-xs h-5">
                {progressiveStats.batchesLoaded}/{progressiveStats.totalBatches}
              </Badge>
            </div>
          </div>
        </div>

        {/* Cache Statistics */}
        <div className="space-y-2 border-t pt-2">
          <div className="flex items-center gap-2 font-medium">
            <Database className="h-3 w-3 text-purple-500" />
            Cache Performance
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cached:</span>
              <Badge variant="outline" className="text-xs h-5 bg-purple-50 border-purple-200">
                {cacheStats.cacheSize}
              </Badge>
            </div>
            
            <div className="flex justify-between">
              <span className="text-muted-foreground">Loading:</span>
              <Badge variant="outline" className="text-xs h-5">
                {cacheStats.inFlightRequests}
              </Badge>
            </div>
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="space-y-2 border-t pt-2">
          <div className="flex items-center gap-2 font-medium">
            <Clock className="h-3 w-3 text-orange-500" />
            Performance Status
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Cache Hit Rate:</span>
              <Badge 
                variant="outline" 
                className={`text-xs h-5 ${
                  cacheStats.cacheSize > 10 
                    ? 'bg-green-50 border-green-200 text-green-700' 
                    : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                }`}
              >
                {cacheStats.cacheSize > 10 ? 'Good' : 'Building...'}
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Loading Strategy:</span>
              <Badge variant="outline" className="text-xs h-5 bg-blue-50 border-blue-200">
                Progressive
              </Badge>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={clearAllCaches}
            className="w-full h-7 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Clear Cache
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImageLoadingDebugger;