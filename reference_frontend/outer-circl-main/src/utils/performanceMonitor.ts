// Phase 4: Comprehensive performance monitoring infrastructure

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();
  private maxMetrics = 100; // Keep last 100 metrics

  startTimer(name: string, metadata?: Record<string, any>) {
    const timestamp = performance.now();
    this.timers.set(name, timestamp);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ Timer started: ${name}`, metadata);
    }
  }

  endTimer(name: string, metadata?: Record<string, any>) {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`⚠️ Timer ${name} was not started`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Store metric
    const metric: PerformanceMetric = {
      name,
      duration,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    this.timers.delete(name);

    if (process.env.NODE_ENV === 'development') {
      const status = duration > 1000 ? '🐌' : duration > 500 ? '⚠️' : '⚡';
      console.log(`${status} Timer ended: ${name} - ${duration.toFixed(2)}ms`, metadata);
    }

    return duration;
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getAverageTime(name: string): number {
    const relevantMetrics = this.metrics.filter(m => m.name === name);
    if (relevantMetrics.length === 0) return 0;
    
    const total = relevantMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / relevantMetrics.length;
  }

  getSlowQueries(threshold = 1000): PerformanceMetric[] {
    return this.metrics.filter(m => m.duration > threshold);
  }

  clear() {
    this.metrics = [];
    this.timers.clear();
  }

  // Track loading states
  trackLoadingState(component: string, isLoading: boolean, metadata?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development') {
      const emoji = isLoading ? '🔄' : '✅';
      console.log(`${emoji} Loading state: ${component} - ${isLoading ? 'Loading' : 'Complete'}`, metadata);
    }
  }

  // Track cache performance
  trackCacheHit(key: string, hit: boolean, metadata?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development') {
      const emoji = hit ? '⚡' : '💾';
      console.log(`${emoji} Cache ${hit ? 'HIT' : 'MISS'}: ${key}`, metadata);
    }
  }

  // Track errors with context
  trackError(error: Error, context: string, metadata?: Record<string, any>) {
    console.error(`🚨 Error in ${context}:`, error, metadata);
    
    // Store as metric for analysis
    this.metrics.push({
      name: `error_${context}`,
      duration: 0,
      timestamp: Date.now(),
      metadata: {
        error: error.message,
        ...metadata
      }
    });
  }

  // Get performance summary
  getSummary() {
    const recent = this.metrics.filter(m => Date.now() - m.timestamp < 60000); // Last minute
    const avgTime = recent.length > 0 ? 
      recent.reduce((sum, m) => sum + m.duration, 0) / recent.length : 0;
    
    return {
      totalMetrics: this.metrics.length,
      recentMetrics: recent.length,
      averageTime: Math.round(avgTime),
      slowQueries: this.getSlowQueries().length,
      activeTimers: this.timers.size
    };
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Enhanced performance tracker for dashboard operations
export const dashboardPerformanceTracker = {
  startTimer: (name: string, metadata?: Record<string, any>) => {
    performanceMonitor.startTimer(`dashboard_${name}`, metadata);
  },
  
  endTimer: (name: string, metadata?: Record<string, any>) => {
    return performanceMonitor.endTimer(`dashboard_${name}`, metadata);
  },
  
  trackDataFetch: (source: string, recordCount: number, fromCache: boolean) => {
    const emoji = fromCache ? '⚡' : '🔄';
    console.log(`${emoji} Data fetch: ${source} - ${recordCount} records ${fromCache ? '(cached)' : '(fresh)'}`);
  },
  
  trackRender: (component: string, renderTime: number, props?: Record<string, any>) => {
    if (renderTime > 16) { // Slower than 60fps
      console.warn(`🐌 Slow render: ${component} - ${renderTime.toFixed(2)}ms`, props);
    }
  }
};

// Hook for component-level performance tracking
export const usePerformanceTracking = (componentName: string) => {
  const startRender = () => {
    performanceMonitor.startTimer(`render_${componentName}`);
  };
  
  const endRender = () => {
    return performanceMonitor.endTimer(`render_${componentName}`);
  };
  
  return { startRender, endRender };
};
