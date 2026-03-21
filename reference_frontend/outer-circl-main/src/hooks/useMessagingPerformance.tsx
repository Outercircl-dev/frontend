import React, { useState, useEffect, useCallback } from 'react';
import { MessagingCache } from '@/services/MessagingCache';
import { MessageQueue } from '@/services/MessageQueue';
import { realtimeManager } from '@/services/RealtimeSubscriptionManager';

/**
 * Phase 3: Performance monitoring hook for unified messaging system
 * Tracks cache hit rates, queue metrics, and real-time latency
 */
export interface MessagingPerformanceMetrics {
  // Cache metrics
  cacheStats: {
    total: number;
    valid: number;
    expired: number;
    hits: number;
    misses: number;
    hitRate: string;
    memoryUsage: number;
    avgEntrySize: string;
  };
  
  // Queue metrics
  queueStats: {
    size: number;
    pending: number;
    processing: number;
    failed: number;
    pollInterval: number;
    isIdle: boolean;
    idleTime: number;
  };
  
  // Realtime metrics
  realtimeStats: {
    totalChannels: number;
    connectedChannels: number;
    errorChannels: number;
    activeRetries: number;
    connectionQuality: string;
    avgMessageLatency: string;
    messagesReceived: number;
  };
  
  // Overall health score (0-100)
  healthScore: number;
  
  // Performance grade
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export const useMessagingPerformance = () => {
  const [metrics, setMetrics] = useState<MessagingPerformanceMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const cache = MessagingCache.getInstance();
  const queue = MessageQueue.getInstance();
  
  // Calculate health score based on metrics
  const calculateHealthScore = useCallback((data: Partial<MessagingPerformanceMetrics>) => {
    let score = 100;
    
    // Cache performance (30 points)
    const hitRate = parseFloat(data.cacheStats?.hitRate || '0');
    if (hitRate < 50) score -= 30;
    else if (hitRate < 70) score -= 15;
    else if (hitRate < 85) score -= 5;
    
    // Queue health (30 points)
    const queueSize = data.queueStats?.size || 0;
    const failedCount = data.queueStats?.failed || 0;
    if (queueSize > 50) score -= 15;
    else if (queueSize > 20) score -= 5;
    if (failedCount > 10) score -= 15;
    else if (failedCount > 5) score -= 5;
    
    // Realtime connectivity (40 points)
    const quality = data.realtimeStats?.connectionQuality || 'poor';
    if (quality === 'poor') score -= 40;
    else if (quality === 'good') score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }, []);
  
  // Get performance grade
  const getGrade = useCallback((score: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }, []);
  
  // Collect all metrics
  const collectMetrics = useCallback(() => {
    const cacheStats = cache.getPerformanceMetrics();
    const queueMetrics = queue.getMetrics();
    const queueStatus = queue.getStatus();
    const realtimeStats = realtimeManager.getPerformanceMetrics();
    
    const metricsData: MessagingPerformanceMetrics = {
      cacheStats,
      queueStats: {
        size: queueStatus.total,
        pending: queueStatus.pending,
        processing: queueStatus.processing,
        failed: queueStatus.failed,
        pollInterval: queueMetrics.pollInterval,
        isIdle: queueMetrics.isIdle,
        idleTime: queueMetrics.idleTime
      },
      realtimeStats,
      healthScore: 0,
      grade: 'F'
    };
    
    // Calculate health score and grade
    metricsData.healthScore = calculateHealthScore(metricsData);
    metricsData.grade = getGrade(metricsData.healthScore);
    
    return metricsData;
  }, [cache, queue, calculateHealthScore, getGrade]);
  
  // Start monitoring
  const startMonitoring = useCallback((intervalMs: number = 5000) => {
    if (isMonitoring) return;
    
    console.log('📊 Starting performance monitoring');
    setIsMonitoring(true);
    
    // Initial collection
    setMetrics(collectMetrics());
    
    // Periodic updates
    const timer = setInterval(() => {
      setMetrics(collectMetrics());
    }, intervalMs);
    
    // Cleanup
    return () => {
      clearInterval(timer);
      setIsMonitoring(false);
    };
  }, [isMonitoring, collectMetrics]);
  
  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    console.log('📊 Stopped performance monitoring');
  }, []);
  
  // Reset metrics (clear session storage counters)
  const resetMetrics = useCallback(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('cache_hits');
      sessionStorage.removeItem('cache_misses');
      sessionStorage.removeItem('rt_avg_latency');
      sessionStorage.removeItem('rt_message_count');
    }
    
    setMetrics(null);
    console.log('📊 Performance metrics reset');
  }, []);
  
  // Get snapshot without starting monitoring
  const getSnapshot = useCallback(() => {
    return collectMetrics();
  }, [collectMetrics]);
  
  // Auto-start monitoring on mount (optional)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('debug=perf')) {
      const cleanup = startMonitoring(3000); // 3s interval for debug mode
      return cleanup;
    }
  }, [startMonitoring]);
  
  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    resetMetrics,
    getSnapshot
  };
};

/**
 * Performance debugging component (optional)
 * Add ?debug=perf to URL to show metrics overlay
 */
export const PerformanceMonitor: React.FC = () => {
  const { metrics, startMonitoring, stopMonitoring } = useMessagingPerformance();
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('debug=perf')) {
      setIsVisible(true);
      const cleanup = startMonitoring(2000);
      return cleanup;
    }
  }, [startMonitoring]);
  
  useEffect(() => {
    if (!isVisible) {
      stopMonitoring();
    }
  }, [isVisible, stopMonitoring]);
  
  if (!isVisible || !metrics) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg p-4 shadow-lg z-50 max-w-md text-xs">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">📊 Performance Monitor</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2">
        <div>
          <span className="font-medium">Health Score: </span>
          <span className={`font-bold ${
            metrics.grade === 'A' ? 'text-green-500' :
            metrics.grade === 'B' ? 'text-blue-500' :
            metrics.grade === 'C' ? 'text-yellow-500' :
            'text-red-500'
          }`}>
            {metrics.healthScore}{'/100 ('}{metrics.grade}{')'}
          </span>
        </div>
        
        <div>
          <span className="font-medium">Cache: </span>
          {metrics.cacheStats.hitRate} hit rate, {metrics.cacheStats.total} entries
        </div>
        
        <div>
          <span className="font-medium">Queue: </span>
          {metrics.queueStats.size} items ({metrics.queueStats.failed} failed)
        </div>
        
        <div>
          <span className="font-medium">Realtime: </span>
          {metrics.realtimeStats.connectedChannels}{'/'}{metrics.realtimeStats.totalChannels} channels
        </div>
      </div>
    </div>
  );
};
