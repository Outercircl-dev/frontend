// Performance utilities for measuring and optimizing load times

export const measurePerformance = (label: string) => {
  const startTime = performance.now();
  
  // Create start mark for DevTools Performance tab
  if (typeof performance.mark === 'function') {
    try {
      performance.mark(`${label}-start`);
    } catch (error) {
      console.warn(`Failed to create performance mark: ${label}-start`, error);
    }
  }
  
  return {
    end: () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.log(`⚡ ${label}: ${duration.toFixed(2)}ms`);
      
      // Mark for DevTools Performance tab with error handling
      if (typeof performance.mark === 'function' && typeof performance.measure === 'function') {
        try {
          performance.mark(`${label}-end`);
          performance.measure(label, `${label}-start`, `${label}-end`);
        } catch (error) {
          console.warn(`Failed to measure performance for: ${label}`, error);
        }
      }
      
      return duration;
    },
    mark: (checkpoint: string) => {
      const currentTime = performance.now();
      const elapsed = currentTime - startTime;
      console.log(`📍 ${label} - ${checkpoint}: ${elapsed.toFixed(2)}ms`);
      return elapsed;
    }
  };
};

export const measureAsync = async <T>(label: string, asyncFn: () => Promise<T>): Promise<T> => {
  const measure = measurePerformance(label);
  try {
    const result = await asyncFn();
    measure.end();
    return result;
  } catch (error) {
    measure.end();
    throw error;
  }
};

export const reportWebVitals = () => {
  if (typeof window === 'undefined') return;

  // Largest Contentful Paint
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    console.log('📊 LCP:', lastEntry.startTime.toFixed(2), 'ms');
  }).observe({ entryTypes: ['largest-contentful-paint'] });

  // First Input Delay
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry: any) => {
      const fid = entry.processingStart - entry.startTime;
      console.log('📊 FID:', fid.toFixed(2), 'ms');
    });
  }).observe({ entryTypes: ['first-input'] });

  // Cumulative Layout Shift
  let clsValue = 0;
  new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry: any) => {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
      }
    });
    console.log('📊 CLS:', clsValue.toFixed(3));
  }).observe({ entryTypes: ['layout-shift'] });
};

// Database query performance tracking
export const trackDatabaseQuery = (queryName: string) => {
  if (typeof performance.mark === 'function') {
    try {
      performance.mark(`db-${queryName}-start`);
    } catch (error) {
      console.warn(`Failed to create database query start mark: ${queryName}`, error);
    }
  }
  
  return {
    end: () => {
      if (typeof performance.mark === 'function' && typeof performance.measure === 'function') {
        try {
          performance.mark(`db-${queryName}-end`);
          performance.measure(`database-query-${queryName}`, `db-${queryName}-start`, `db-${queryName}-end`);
          
          const measure = performance.getEntriesByName(`database-query-${queryName}`)[0];
          if (measure) {
            console.log(`🗄️ DB Query (${queryName}): ${measure.duration.toFixed(2)}ms`);
            return measure.duration;
          }
        } catch (error) {
          console.warn(`Failed to measure database query: ${queryName}`, error);
        }
      }
      return 0;
    }
  };
};

// Component render time tracking
import { useEffect } from 'react';

export const useRenderTime = (componentName: string) => {
  useEffect(() => {
    const measure = measurePerformance(`Render: ${componentName}`);
    return () => {
      measure.end();
    };
  }, [componentName]);
};