import { useEffect, useRef } from 'react';

interface PerformanceMetrics {
  messageLoadTime: number;
  threadGroupingTime: number;
  virtualizationRenderTime: number;
  cacheHitRate: number;
  totalMessages: number;
  timestamp: number;
}

/**
 * Phase 7: Performance monitoring for messaging system
 * Dev-only metrics for monitoring messaging performance
 */
class MessagingPerformanceMonitor {
  private static instance: MessagingPerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private readonly MAX_METRICS = 100;

  private constructor() {}

  static getInstance(): MessagingPerformanceMonitor {
    if (!MessagingPerformanceMonitor.instance) {
      MessagingPerformanceMonitor.instance = new MessagingPerformanceMonitor();
    }
    return MessagingPerformanceMonitor.instance;
  }

  recordMetric(metric: Partial<PerformanceMetrics>) {
    if (process.env.NODE_ENV !== 'development') return;

    const fullMetric: PerformanceMetrics = {
      messageLoadTime: metric.messageLoadTime || 0,
      threadGroupingTime: metric.threadGroupingTime || 0,
      virtualizationRenderTime: metric.virtualizationRenderTime || 0,
      cacheHitRate: metric.cacheHitRate || 0,
      totalMessages: metric.totalMessages || 0,
      timestamp: Date.now()
    };

    this.metrics.push(fullMetric);
    
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // Log in dev console
    console.log('📊 Messaging Performance:', {
      loadTime: `${fullMetric.messageLoadTime.toFixed(2)}ms`,
      grouping: `${fullMetric.threadGroupingTime.toFixed(2)}ms`,
      render: `${fullMetric.virtualizationRenderTime.toFixed(2)}ms`,
      cacheHit: `${(fullMetric.cacheHitRate * 100).toFixed(1)}%`,
      messages: fullMetric.totalMessages
    });
  }

  getAverageMetrics(): PerformanceMetrics | null {
    if (this.metrics.length === 0) return null;

    const sum = this.metrics.reduce((acc, metric) => ({
      messageLoadTime: acc.messageLoadTime + metric.messageLoadTime,
      threadGroupingTime: acc.threadGroupingTime + metric.threadGroupingTime,
      virtualizationRenderTime: acc.virtualizationRenderTime + metric.virtualizationRenderTime,
      cacheHitRate: acc.cacheHitRate + metric.cacheHitRate,
      totalMessages: acc.totalMessages + metric.totalMessages,
      timestamp: metric.timestamp
    }), {
      messageLoadTime: 0,
      threadGroupingTime: 0,
      virtualizationRenderTime: 0,
      cacheHitRate: 0,
      totalMessages: 0,
      timestamp: 0
    });

    const count = this.metrics.length;
    return {
      messageLoadTime: sum.messageLoadTime / count,
      threadGroupingTime: sum.threadGroupingTime / count,
      virtualizationRenderTime: sum.virtualizationRenderTime / count,
      cacheHitRate: sum.cacheHitRate / count,
      totalMessages: Math.round(sum.totalMessages / count),
      timestamp: Date.now()
    };
  }

  clearMetrics() {
    this.metrics = [];
  }

  printSummary() {
    if (process.env.NODE_ENV !== 'development') return;

    const avg = this.getAverageMetrics();
    if (!avg) {
      console.log('📊 No messaging metrics available');
      return;
    }

    console.log('📊 Messaging Performance Summary:');
    console.table({
      'Avg Load Time': `${avg.messageLoadTime.toFixed(2)}ms`,
      'Avg Thread Grouping': `${avg.threadGroupingTime.toFixed(2)}ms`,
      'Avg Render Time': `${avg.virtualizationRenderTime.toFixed(2)}ms`,
      'Cache Hit Rate': `${(avg.cacheHitRate * 100).toFixed(1)}%`,
      'Avg Messages': avg.totalMessages,
      'Samples': this.metrics.length
    });
  }
}

/**
 * Hook to track messaging performance
 */
export const useMessagingPerformance = (
  messageCount: number,
  isLoading: boolean
) => {
  const monitor = MessagingPerformanceMonitor.getInstance();
  const startTimeRef = useRef<number>(0);
  const loadingRef = useRef<boolean>(false);

  useEffect(() => {
    if (isLoading && !loadingRef.current) {
      startTimeRef.current = performance.now();
      loadingRef.current = true;
    } else if (!isLoading && loadingRef.current) {
      const loadTime = performance.now() - startTimeRef.current;
      monitor.recordMetric({
        messageLoadTime: loadTime,
        totalMessages: messageCount
      });
      loadingRef.current = false;
    }
  }, [isLoading, messageCount, monitor]);

  return {
    recordMetric: (metric: Partial<PerformanceMetrics>) => 
      monitor.recordMetric(metric),
    printSummary: () => monitor.printSummary(),
    getAverage: () => monitor.getAverageMetrics()
  };
};

export default MessagingPerformanceMonitor;
