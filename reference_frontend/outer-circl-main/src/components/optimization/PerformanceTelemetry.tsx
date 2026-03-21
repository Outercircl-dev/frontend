import React, { useEffect, useCallback } from 'react';
import { usePerformanceBudget } from '@/hooks/usePerformanceBudget';
import { useDatabaseOptimization } from '@/hooks/useDatabaseOptimization';

interface TelemetryData {
  timestamp: number;
  page: string;
  userAgent: string;
  connectionType: string;
  metrics: {
    pageLoadTime?: number;
    renderTime?: number;
    databaseQueryTime?: number;
    memoryUsage?: number;
    errors?: ErrorInfo[];
  };
  userInteraction: {
    clicks: number;
    scrolls: number;
    timeOnPage: number;
  };
}

interface ErrorInfo {
  message: string;
  stack?: string;
  timestamp: number;
  component?: string;
}

export const PerformanceTelemetry: React.FC = () => {
  const { violations, getPerformanceSummary } = usePerformanceBudget();
  const { getCacheStats } = useDatabaseOptimization();

  const sendTelemetry = useCallback(async (data: TelemetryData) => {
    // In production, send to analytics service
    if (process.env.NODE_ENV === 'production') {
      try {
        // Example: Send to analytics endpoint
        await fetch('/api/analytics/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
      } catch (error) {
        console.warn('Failed to send telemetry:', error);
      }
    } else {
      // In development, log to console
      console.group('📊 Performance Telemetry');
      console.table(data.metrics);
      console.log('User Interaction:', data.userInteraction);
      console.log('Violations:', violations);
      console.log('Cache Stats:', getCacheStats());
      console.groupEnd();
    }
  }, [violations, getCacheStats]);

  const collectTelemetryData = useCallback((): TelemetryData => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const memory = (performance as any).memory;
    const connection = (navigator as any).connection;

    return {
      timestamp: Date.now(),
      page: window.location.pathname,
      userAgent: navigator.userAgent,
      connectionType: connection?.effectiveType || 'unknown',
      metrics: {
        pageLoadTime: navigation ? navigation.loadEventEnd - navigation.fetchStart : undefined,
        memoryUsage: memory?.usedJSHeapSize,
      },
      userInteraction: {
        clicks: parseInt(sessionStorage.getItem('telemetry_clicks') || '0'),
        scrolls: parseInt(sessionStorage.getItem('telemetry_scrolls') || '0'),
        timeOnPage: Date.now() - parseInt(sessionStorage.getItem('page_start_time') || Date.now().toString()),
      },
    };
  }, []);

  // Track user interactions
  useEffect(() => {
    sessionStorage.setItem('page_start_time', Date.now().toString());
    
    let clicks = 0;
    let scrolls = 0;

    const trackClick = () => {
      clicks++;
      sessionStorage.setItem('telemetry_clicks', clicks.toString());
    };

    const trackScroll = () => {
      scrolls++;
      sessionStorage.setItem('telemetry_scrolls', scrolls.toString());
    };

    document.addEventListener('click', trackClick);
    document.addEventListener('scroll', trackScroll, { passive: true });

    return () => {
      document.removeEventListener('click', trackClick);
      document.removeEventListener('scroll', trackScroll);
    };
  }, []);

  // Send telemetry on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const data = collectTelemetryData();
      
      // Use sendBeacon for reliable delivery on page unload
      if (navigator.sendBeacon && process.env.NODE_ENV === 'production') {
        navigator.sendBeacon('/api/analytics/performance', JSON.stringify(data));
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const data = collectTelemetryData();
        sendTelemetry(data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [collectTelemetryData, sendTelemetry]);

  // Periodic telemetry collection
  useEffect(() => {
    const interval = setInterval(() => {
      const data = collectTelemetryData();
      sendTelemetry(data);
    }, 60000); // Send every minute

    return () => clearInterval(interval);
  }, [collectTelemetryData, sendTelemetry]);

  // Error boundary telemetry
  useEffect(() => {
    const originalError = window.onerror;
    const originalUnhandledRejection = window.onunhandledrejection;

    window.onerror = function(message, source, lineno, colno, error) {
      const errorInfo: ErrorInfo = {
        message: message.toString(),
        stack: error?.stack,
        timestamp: Date.now(),
      };

      const data = collectTelemetryData();
      data.metrics.errors = [errorInfo];
      sendTelemetry(data);

      if (originalError) {
        originalError(message, source, lineno, colno, error);
      }
    };

    window.onunhandledrejection = function(event: PromiseRejectionEvent) {
      const errorInfo: ErrorInfo = {
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        timestamp: Date.now(),
      };

      const data = collectTelemetryData();
      data.metrics.errors = [errorInfo];
      sendTelemetry(data);

      if (originalUnhandledRejection) {
        originalUnhandledRejection.call(window, event);
      }
    };

    return () => {
      window.onerror = originalError;
      window.onunhandledrejection = originalUnhandledRejection;
    };
  }, [collectTelemetryData, sendTelemetry]);

  return null; // This component doesn't render anything
};

// HOC for component-level performance tracking
export const withPerformanceTelemetry = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  return React.memo((props: P) => {
    useEffect(() => {
      const startTime = performance.now();
      
      return () => {
        const renderTime = performance.now() - startTime;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`🎯 ${componentName} render time: ${renderTime.toFixed(2)}ms`);
        }
        
        // Track component performance
        if (renderTime > 16) { // Slower than 60fps
          console.warn(`⚠️ ${componentName} rendered slowly: ${renderTime.toFixed(2)}ms`);
        }
      };
    });

    return <Component {...props} />;
  });
};