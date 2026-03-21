// Dashboard performance monitoring utilities

interface PerformanceEntry {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class DashboardPerformanceTracker {
  private entries: Map<string, PerformanceEntry> = new Map();
  private isEnabled = process.env.NODE_ENV === 'development';

  start(name: string): void {
    if (!this.isEnabled) return;
    
    this.entries.set(name, {
      name,
      startTime: performance.now()
    });
    
    console.log(`🚀 ${name}: Started`);
  }

  end(name: string): void {
    if (!this.isEnabled) return;
    
    const entry = this.entries.get(name);
    if (!entry) return;
    
    const endTime = performance.now();
    const duration = endTime - entry.startTime;
    
    entry.endTime = endTime;
    entry.duration = duration;
    
    // Color-coded performance logging
    const color = duration > 3000 ? '🔴' : duration > 1000 ? '🟡' : '🟢';
    console.log(`${color} ${name}: Completed in ${duration.toFixed(2)}ms`);
    
    // Warn about slow operations
    if (duration > 5000) {
      console.warn(`⚠️ Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }
  }

  measure(name: string, fn: () => Promise<any>): Promise<any> {
    if (!this.isEnabled) return fn();
    
    this.start(name);
    return fn().finally(() => this.end(name));
  }

  getEntries(): PerformanceEntry[] {
    return Array.from(this.entries.values()).filter(entry => entry.duration !== undefined);
  }

  clear(): void {
    this.entries.clear();
  }

  // Get summary of performance data
  getSummary(): string {
    const entries = this.getEntries();
    if (entries.length === 0) return 'No performance data';
    
    const total = entries.reduce((sum, entry) => sum + (entry.duration || 0), 0);
    const average = total / entries.length;
    const slowest = Math.max(...entries.map(e => e.duration || 0));
    
    return `Total: ${total.toFixed(2)}ms, Avg: ${average.toFixed(2)}ms, Slowest: ${slowest.toFixed(2)}ms`;
  }
}

// Global instance
export const dashboardPerf = new DashboardPerformanceTracker();

// Helper functions for common dashboard operations
export const trackDashboardInit = () => dashboardPerf.start('Dashboard Init');
export const trackDataFetch = () => dashboardPerf.start('Data Fetch');
export const trackComponentRender = (componentName: string) => 
  dashboardPerf.start(`${componentName} Render`);

export const endDashboardInit = () => dashboardPerf.end('Dashboard Init');
export const endDataFetch = () => dashboardPerf.end('Data Fetch');
export const endComponentRender = (componentName: string) => 
  dashboardPerf.end(`${componentName} Render`);

// Dashboard-specific timeout thresholds
export const DASHBOARD_TIMEOUTS = {
  INIT: 3000,      // 3 seconds for initial dashboard load
  DATA_FETCH: 5000, // 5 seconds for data fetching
  RENDER: 1000,     // 1 second for component rendering
  TIMEOUT_WARNING: 8000 // 8 seconds before showing timeout warning
} as const;

// Check if operation is taking too long
export const isSlowOperation = (startTime: number, threshold: number): boolean => {
  return performance.now() - startTime > threshold;
};