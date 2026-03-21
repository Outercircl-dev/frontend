import React, { useState, useEffect, useCallback } from 'react';
import { measurePerformance } from '@/utils/performanceUtils';

interface PerformanceBudget {
  maxPageLoadTime: number;
  maxBundleSize: number;
  maxImageSize: number;
  maxCacheSize: number;
  maxDatabaseQueryTime: number;
  maxRenderTime: number;
  maxMemoryUsage: number;
}

interface PerformanceViolation {
  type: keyof PerformanceBudget;
  current: number;
  budget: number;
  severity: 'warning' | 'error';
  timestamp: number;
}

const DEFAULT_BUDGET: PerformanceBudget = {
  maxPageLoadTime: 3000, // 3 seconds
  maxBundleSize: 500 * 1024, // 500KB
  maxImageSize: 200 * 1024, // 200KB
  maxCacheSize: 50 * 1024 * 1024, // 50MB
  maxDatabaseQueryTime: 500, // 500ms
  maxRenderTime: 16, // 16ms (60fps)
  maxMemoryUsage: 50 * 1024 * 1024, // 50MB
};

export const usePerformanceBudget = (customBudget: Partial<PerformanceBudget> = {}) => {
  const [budget] = useState<PerformanceBudget>({ ...DEFAULT_BUDGET, ...customBudget });
  const [violations, setViolations] = useState<PerformanceViolation[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const addViolation = useCallback((violation: Omit<PerformanceViolation, 'timestamp'>) => {
    const newViolation: PerformanceViolation = {
      ...violation,
      timestamp: Date.now(),
    };

    setViolations(prev => {
      // Limit to last 10 violations
      const updated = [newViolation, ...prev].slice(0, 10);
      
      // Log violation
      const severity = newViolation.severity === 'error' ? '🚨' : '⚠️';
      console.warn(
        `${severity} Performance Budget Violation:`,
        `${newViolation.type} exceeded budget`,
        `Current: ${newViolation.current}${getUnit(newViolation.type)}`,
        `Budget: ${newViolation.budget}${getUnit(newViolation.type)}`
      );
      
      return updated;
    });
  }, []);

  const getUnit = (type: keyof PerformanceBudget): string => {
    switch (type) {
      case 'maxPageLoadTime':
      case 'maxDatabaseQueryTime':
      case 'maxRenderTime':
        return 'ms';
      case 'maxBundleSize':
      case 'maxImageSize':
      case 'maxCacheSize':
      case 'maxMemoryUsage':
        return ' bytes';
      default:
        return '';
    }
  };

  const checkBudget = useCallback((type: keyof PerformanceBudget, current: number) => {
    const budgetValue = budget[type];
    const exceedsWarning = current > budgetValue * 0.8; // 80% threshold
    const exceedsBudget = current > budgetValue;

    if (exceedsBudget) {
      addViolation({
        type,
        current,
        budget: budgetValue,
        severity: 'error',
      });
      return false;
    } else if (exceedsWarning) {
      addViolation({
        type,
        current,
        budget: budgetValue,
        severity: 'warning',
      });
    }

    return true;
  }, [budget, addViolation]);

  // Monitor page load performance
  useEffect(() => {
    if (!isMonitoring) return;

    const checkPageLoad = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        const loadTime = navigation.loadEventEnd - navigation.fetchStart;
        checkBudget('maxPageLoadTime', loadTime);
      }
    };

    if (document.readyState === 'complete') {
      checkPageLoad();
    } else {
      window.addEventListener('load', checkPageLoad);
      return () => window.removeEventListener('load', checkPageLoad);
    }
  }, [isMonitoring, checkBudget]);

  // Monitor memory usage
  useEffect(() => {
    if (!isMonitoring) return;

    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        checkBudget('maxMemoryUsage', memory.usedJSHeapSize);
      }
    };

    const interval = setInterval(checkMemory, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [isMonitoring, checkBudget]);

  // Monitor render performance
  const measureRender = useCallback((componentName: string) => {
    const measure = measurePerformance(`render-${componentName}`);
    
    return {
      end: () => {
        const duration = measure.end();
        checkBudget('maxRenderTime', duration);
        return duration;
      },
    };
  }, [checkBudget]);

  // Monitor database query performance
  const measureDatabaseQuery = useCallback((queryName: string) => {
    const startTime = performance.now();
    
    return {
      end: () => {
        const duration = performance.now() - startTime;
        checkBudget('maxDatabaseQueryTime', duration);
        return duration;
      },
    };
  }, [checkBudget]);

  // Check resource sizes
  const checkResourceSize = useCallback((url: string, size: number) => {
    if (url.match(/\.(js|css)$/)) {
      checkBudget('maxBundleSize', size);
    } else if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
      checkBudget('maxImageSize', size);
    }
  }, [checkBudget]);

  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    const recentViolations = violations.filter(v => Date.now() - v.timestamp < 60000); // Last minute
    const errorCount = recentViolations.filter(v => v.severity === 'error').length;
    const warningCount = recentViolations.filter(v => v.severity === 'warning').length;

    return {
      totalViolations: violations.length,
      recentViolations: recentViolations.length,
      errorCount,
      warningCount,
      budget,
      isHealthy: errorCount === 0 && warningCount < 3,
    };
  }, [violations, budget]);

  // Clear old violations
  const clearViolations = useCallback(() => {
    setViolations([]);
  }, []);

  // Start/stop monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    console.log('📊 Performance budget monitoring started');
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    console.log('📊 Performance budget monitoring stopped');
  }, []);

  return {
    budget,
    violations,
    isMonitoring,
    checkBudget,
    measureRender,
    measureDatabaseQuery,
    checkResourceSize,
    getPerformanceSummary,
    clearViolations,
    startMonitoring,
    stopMonitoring,
  };
};