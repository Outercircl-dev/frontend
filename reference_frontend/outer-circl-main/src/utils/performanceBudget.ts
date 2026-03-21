// Performance budget and monitoring utilities
export class PerformanceBudget {
  private static instance: PerformanceBudget;
  private violations: string[] = [];
  private isMonitoring = false;

  static getInstance() {
    if (!PerformanceBudget.instance) {
      PerformanceBudget.instance = new PerformanceBudget();
    }
    return PerformanceBudget.instance;
  }

  startMonitoring() {
    if (this.isMonitoring || process.env.NODE_ENV !== 'development') return;
    
    this.isMonitoring = true;
    
    // Monitor LCP (should be < 2.5s)
    if ('PerformanceObserver' in window) {
      try {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry.startTime > 2500) {
            this.addViolation(`LCP too slow: ${lastEntry.startTime.toFixed(0)}ms`);
          }
        }).observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {}
    }

    // Monitor navigation timing
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation.loadEventEnd - navigation.fetchStart > 3000) {
        this.addViolation(`Page load too slow: ${(navigation.loadEventEnd - navigation.fetchStart).toFixed(0)}ms`);
      }
    });
  }

  addViolation(message: string) {
    this.violations.push(`${new Date().toISOString()}: ${message}`);
    console.warn('⚠️ Performance violation:', message);
  }

  getViolations() {
    return [...this.violations];
  }

  clearViolations() {
    this.violations = [];
  }

  getSummary() {
    return {
      totalViolations: this.violations.length,
      isMonitoring: this.isMonitoring,
      violations: this.getViolations()
    };
  }
}

export const performanceBudget = PerformanceBudget.getInstance();