import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Timer, TrendingUp } from 'lucide-react';
import { useSmartImagePreloader } from '@/hooks/useSmartImagePreloader';
import { optimizedStockImageService } from '@/services/optimizedStockImageService';

interface ImageLoadingOptimizerProps {
  activityTitle?: string;
  activityCategory?: string;
}

const ImageLoadingOptimizer: React.FC<ImageLoadingOptimizerProps> = ({
  activityTitle,
  activityCategory
}) => {
  const [cacheStats, setCacheStats] = useState({ cacheSize: 0, inFlightRequests: 0 });
  const [preloadStats, setPreloadStats] = useState({ preloadedCount: 0, queueLength: 0, isPreloading: false });
  const { getPreloadStats } = useSmartImagePreloader({ activityTitle, activityCategory });

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      setCacheStats(optimizedStockImageService.getCacheStats());
      setPreloadStats(getPreloadStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 2000);
    
    return () => clearInterval(interval);
  }, [getPreloadStats]);

  const clearCache = () => {
    optimizedStockImageService.clearCache();
    setCacheStats({ cacheSize: 0, inFlightRequests: 0 });
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-pink-100 p-3 space-y-2 max-w-xs">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-green-500" />
        <span className="text-xs font-medium text-gray-700">Performance</span>
      </div>
      
      <div className="space-y-1 text-xs text-gray-600">
        <div className="flex justify-between items-center">
          <span>Cache:</span>
          <Badge variant="outline" className="text-xs h-5">
            {cacheStats.cacheSize} images
          </Badge>
        </div>
        
        <div className="flex justify-between items-center">
          <span>Preloaded:</span>
          <Badge variant="outline" className="text-xs h-5 bg-blue-50 border-blue-200">
            {preloadStats.preloadedCount}
          </Badge>
        </div>
        
        {preloadStats.isPreloading && (
          <div className="flex items-center gap-1">
            <Timer className="h-3 w-3 animate-spin text-blue-500" />
            <span className="text-blue-600">Loading...</span>
          </div>
        )}
        
        {cacheStats.cacheSize > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={clearCache}
            className="w-full h-6 text-xs hover:bg-pink-50"
          >
            Clear Cache
          </Button>
        )}
      </div>
    </div>
  );
};

export default ImageLoadingOptimizer;