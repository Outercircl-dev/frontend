import React, { useEffect } from 'react';

interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

const PerformanceMonitor: React.FC = () => {
  useEffect(() => {
    // Only run in production, when Performance API is available, and sample 10% of sessions
    if (process.env.NODE_ENV !== 'production' || !window.performance || Math.random() > 0.1) {
      return;
    }

    const metrics: PerformanceMetrics = {};

    // Measure Time to First Byte (TTFB)
    const measureTTFB = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        metrics.ttfb = navigation.responseStart - navigation.requestStart;
      }
    };

    // Measure First Contentful Paint (FCP)
    const measureFCP = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          metrics.fcp = fcpEntry.startTime;
          observer.disconnect();
        }
      });
      observer.observe({ entryTypes: ['paint'] });
    };

    // Measure Largest Contentful Paint (LCP)
    const measureLCP = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        metrics.lcp = lastEntry.startTime;
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    };

    // Measure First Input Delay (FID)
    const measureFID = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          metrics.fid = entry.processingStart - entry.startTime;
        });
      });
      observer.observe({ entryTypes: ['first-input'] });
    };

    // Measure Cumulative Layout Shift (CLS)
    const measureCLS = () => {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        metrics.cls = clsValue;
      });
      observer.observe({ entryTypes: ['layout-shift'] });
    };

    // Initialize measurements
    measureTTFB();
    measureFCP();
    measureLCP();
    measureFID();
    measureCLS();

    // Report metrics after page load
    const reportMetrics = () => {
      if (Object.keys(metrics).length > 0) {
        console.log('📊 Performance Metrics:', {
          'TTFB (ms)': metrics.ttfb?.toFixed(2),
          'FCP (ms)': metrics.fcp?.toFixed(2),
          'LCP (ms)': metrics.lcp?.toFixed(2),
          'FID (ms)': metrics.fid?.toFixed(2),
          'CLS': metrics.cls?.toFixed(3),
        });

        // In a real app, you might send these to an analytics service
        // sendToAnalytics(metrics);
      }
    };

    // Report when page is fully loaded
    if (document.readyState === 'complete') {
      setTimeout(reportMetrics, 1000);
    } else {
      window.addEventListener('load', () => {
        setTimeout(reportMetrics, 1000);
      });
    }

  }, []);

  return null;
};

export default PerformanceMonitor;