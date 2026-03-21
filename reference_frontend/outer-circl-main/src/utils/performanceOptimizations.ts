// Performance optimization utilities for the dashboard

export const PERFORMANCE_BUDGETS = {
  INITIAL_LOAD: 2000, // 2 seconds max for first load
  INTERACTION: 100,   // 100ms max for user interactions
  CACHE_REFRESH: 500, // 500ms max for cache refresh
  IMAGE_LOAD: 1500,   // 1.5 seconds max for image loading
} as const;

export interface PerformanceMetrics {
  loadTime: number;
  cacheHitRate: number;
  errorRate: number;
  interactionLatency: number;
}

class PerformanceTracker {
  private metrics: Map<string, number[]> = new Map();
  private startTimes: Map<string, number> = new Map();

  startTimer(operation: string): void {
    this.startTimes.set(operation, performance.now());
  }

  endTimer(operation: string): number {
    const startTime = this.startTimes.get(operation);
    if (!startTime) return 0;
    
    const duration = performance.now() - startTime;
    this.recordMetric(operation, duration);
    this.startTimes.delete(operation);
    
    return duration;
  }

  recordMetric(operation: string, value: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const values = this.metrics.get(operation)!;
    values.push(value);
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }

  getAverageMetric(operation: string): number {
    const values = this.metrics.get(operation);
    if (!values || values.length === 0) return 0;
    
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  getPerformanceReport(): Record<string, any> {
    const report: Record<string, any> = {};
    
    for (const [operation, values] of this.metrics.entries()) {
      if (values.length > 0) {
        report[operation] = {
          average: this.getAverageMetric(operation),
          latest: values[values.length - 1],
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values)
        };
      }
    }
    
    return report;
  }

  checkPerformanceBudget(operation: string, budget: number): boolean {
    const average = this.getAverageMetric(operation);
    return average <= budget;
  }

  clear(): void {
    this.metrics.clear();
    this.startTimes.clear();
  }
}

// Global performance tracker instance
export const performanceTracker = new PerformanceTracker();

// Performance monitoring utilities
export const withPerformanceTracking = <T extends any[], R>(
  fn: (...args: T) => R,
  operationName: string
) => {
  return (...args: T): R => {
    performanceTracker.startTimer(operationName);
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.finally(() => {
          performanceTracker.endTimer(operationName);
        }) as R;
      }
      
      performanceTracker.endTimer(operationName);
      return result;
    } catch (error) {
      performanceTracker.endTimer(operationName);
      throw error;
    }
  };
};

// Image loading optimization
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timeout = setTimeout(() => {
      reject(new Error(`Image load timeout: ${src}`));
    }, PERFORMANCE_BUDGETS.IMAGE_LOAD);
    
    img.onload = () => {
      clearTimeout(timeout);
      resolve();
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error(`Failed to load image: ${src}`));
    };
    
    img.src = src;
  });
};

// Debounced function for search and filters
export const debounce = <T extends any[]> (
  func: (...args: T) => void,
  delay: number
): (...args: T) => void => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: T) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

// Throttled function for scroll events
export const throttle = <T extends any[]> (
  func: (...args: T) => void,
  limit: number
): (...args: T) => void => {
  let inThrottle: boolean;
  
  return (...args: T) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memory usage monitoring
export const getMemoryUsage = (): any => {
  if ('memory' in performance) {
    return {
      used: Math.round((performance as any).memory.usedJSHeapSize / 1048576),
      total: Math.round((performance as any).memory.totalJSHeapSize / 1048576),
      limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1048576)
    };
  }
  return null;
};

// Network connection monitoring
export const getConnectionInfo = (): any => {
  if ('connection' in navigator) {
    const conn = (navigator as any).connection;
    return {
      effectiveType: conn.effectiveType,
      downlink: conn.downlink,
      rtt: conn.rtt,
      saveData: conn.saveData
    };
  }
  return null;
};

// Core Web Vitals monitoring
export const monitorCoreWebVitals = (): void => {
  if (typeof PerformanceObserver !== 'undefined') {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      performanceTracker.recordMetric('LCP', lastEntry.startTime);
    });
    
    try {
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // LCP not supported
    }

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        performanceTracker.recordMetric('FID', entry.processingStart - entry.startTime);
      });
    });
    
    try {
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      // FID not supported
    }

    // Cumulative Layout Shift (CLS)
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          performanceTracker.recordMetric('CLS', entry.value);
        }
      });
    });
    
    try {
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // CLS not supported
    }
  }
};

// Initialize performance monitoring
export const initPerformanceMonitoring = (): void => {
  if (process.env.NODE_ENV === 'development') {
    monitorCoreWebVitals();
    
    // Log performance report every 30 seconds
    setInterval(() => {
      const report = performanceTracker.getPerformanceReport();
      if (Object.keys(report).length > 0) {
        console.table(report);
      }
    }, 30000);
  }
};
