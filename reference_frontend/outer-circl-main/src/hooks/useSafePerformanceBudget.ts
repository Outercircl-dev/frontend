import { useState, useCallback, useEffect } from 'react';
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

// Adaptive budget configuration based on device and network
const getAdaptiveBudget = (): PerformanceBudget => {
  const isMobile = window.innerWidth < 768;
  const connection = (navigator as any).connection;
  const isSlowConnection = connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g';
  
  return {
    maxPageLoadTime: isMobile ? (isSlowConnection ? 8000 : 5000) : 4000,
    maxBundleSize: isMobile ? 300 * 1024 : 600 * 1024,
    maxImageSize: isMobile ? 150 * 1024 : 250 * 1024,
    maxCacheSize: isMobile ? 30 * 1024 * 1024 : 70 * 1024 * 1024,
    maxDatabaseQueryTime: isSlowConnection ? 3000 : 1500,
    maxRenderTime: isMobile ? 32 : 16, // More lenient on mobile
    maxMemoryUsage: isMobile ? 30 * 1024 * 1024 : 70 * 1024 * 1024,
  };
};

const DEFAULT_BUDGET = getAdaptiveBudget();

export const useSafePerformanceBudget = (customBudget: Partial<PerformanceBudget> = {}) => {
  const [budget] = useState<PerformanceBudget>({ ...DEFAULT_BUDGET, ...customBudget });
  const [violations, setViolations] = useState<PerformanceViolation[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  // Simple performance ready check
  const isPerformanceReady = typeof performance !== 'undefined' && !!performance.now;
  const performanceError = isPerformanceReady ? null : 'Performance API not available';

  const addViolation = useCallback((violation: Omit<PerformanceViolation, 'timestamp'>) => {
    if (!isPerformanceReady) return;

    const newViolation: PerformanceViolation = {
      ...violation,
      timestamp: Date.now(),
    };

    setViolations(prev => {
      const updated = [newViolation, ...prev].slice(0, 10);
      
      const severity = newViolation.severity === 'error' ? '🚨' : '⚠️';
      console.warn(
        `${severity} Performance Budget Violation:`,
        `${newViolation.type} exceeded budget`,
        `Current: ${newViolation.current}${getUnit(newViolation.type)}`,
        `Budget: ${newViolation.budget}${getUnit(newViolation.type)}`
      );
      
      return updated;
    });
  }, [isPerformanceReady]);

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
    if (!isPerformanceReady) return true;

    const budgetValue = budget[type];
    const exceedsWarning = current > budgetValue * 0.8;
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
  }, [budget, addViolation, isPerformanceReady]);

  const measureRender = useCallback((componentName: string) => {
    if (!isPerformanceReady) {
      return { end: () => 0 };
    }

    try {
      const measure = measurePerformance(`render-${componentName}`);
      
      return {
        end: () => {
          const duration = measure.end();
          checkBudget('maxRenderTime', duration);
          return duration;
        },
      };
    } catch {
      return { end: () => 0 };
    }
  }, [checkBudget, isPerformanceReady]);

  const measureDatabaseQuery = useCallback((queryName: string) => {
    if (!isPerformanceReady) {
      return { end: () => 0 };
    }

    const startTime = performance.now();
    
    return {
      end: () => {
        const duration = performance.now() - startTime;
        checkBudget('maxDatabaseQueryTime', duration);
        return duration;
      },
    };
  }, [checkBudget, isPerformanceReady]);

  const checkResourceSize = useCallback((url: string, size: number) => {
    if (!isPerformanceReady) return;

    if (url.match(/\.(js|css)$/)) {
      checkBudget('maxBundleSize', size);
    } else if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
      checkBudget('maxImageSize', size);
    }
  }, [checkBudget, isPerformanceReady]);

  const getPerformanceSummary = useCallback(() => {
    const recentViolations = violations.filter(v => Date.now() - v.timestamp < 60000);
    const errorCount = recentViolations.filter(v => v.severity === 'error').length;
    const warningCount = recentViolations.filter(v => v.severity === 'warning').length;

    return {
      totalViolations: violations.length,
      recentViolations: recentViolations.length,
      errorCount,
      warningCount,
      budget,
      isHealthy: errorCount === 0 && warningCount < 3,
      isPerformanceReady,
      performanceError,
    };
  }, [violations, budget, isPerformanceReady, performanceError]);

  const clearViolations = useCallback(() => {
    setViolations([]);
  }, []);

  const startMonitoring = useCallback(() => {
    if (!isPerformanceReady) {
      console.warn('Performance monitoring unavailable:', performanceError);
      return;
    }
    setIsMonitoring(true);
    console.log('📊 Performance budget monitoring started');
  }, [isPerformanceReady, performanceError]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    console.log('📊 Performance budget monitoring stopped');
  }, []);

  // Safe monitoring effects with sampling
  useEffect(() => {
    if (!isMonitoring || !isPerformanceReady) return;

    // Sample performance monitoring (only check 20% of the time)
    if (Math.random() > 0.2) return;

    const checkPageLoad = () => {
      try {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          const loadTime = navigation.loadEventEnd - navigation.fetchStart;
          checkBudget('maxPageLoadTime', loadTime);
        }
      } catch (error) {
        console.warn('Page load monitoring failed:', error);
      }
    };

    if (document.readyState === 'complete') {
      checkPageLoad();
    } else {
      window.addEventListener('load', checkPageLoad);
      return () => window.removeEventListener('load', checkPageLoad);
    }
  }, [isMonitoring, checkBudget, isPerformanceReady]);

  useEffect(() => {
    if (!isMonitoring || !isPerformanceReady) return;

    // Monitor memory usage less frequently on mobile
    const isMobile = window.innerWidth < 768;
    
    const checkMemory = () => {
      try {
        if ('memory' in performance) {
          const memory = (performance as any).memory;
          checkBudget('maxMemoryUsage', memory.usedJSHeapSize);
        }
      } catch (error) {
        console.warn('Memory monitoring failed:', error);
      }
    };

    const interval = setInterval(checkMemory, isMobile ? 60000 : 30000);
    return () => clearInterval(interval);
  }, [isMonitoring, checkBudget, isPerformanceReady]);

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
    isPerformanceReady,
    performanceError,
  };
};