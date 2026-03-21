import React, { useEffect, useState } from 'react';

interface PerformanceData {
  pageLoadTime: number;
  databaseQueryTime: number;
  renderTime: number;
  totalTime: number;
}

const PerformanceMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceData | null>(null);

  useEffect(() => {
    // Only run performance tracking in development
    if (process.env.NODE_ENV !== 'development') {
      return;
    }

    const startTime = performance.now();
    
    // Track page load performance
    const trackPageLoad = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      if (navigation) {
        const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
        const databaseQueryTime = performance.getEntriesByName('database-query').reduce((total, entry) => total + entry.duration, 0);
        const renderTime = performance.now() - startTime;
        
        const totalTime = pageLoadTime + databaseQueryTime + renderTime;
        
        setMetrics({
          pageLoadTime,
          databaseQueryTime,
          renderTime,
          totalTime
        });
        
        console.log('📊 Performance Metrics:', {
          'Page Load (ms)': pageLoadTime.toFixed(2),
          'Database Queries (ms)': databaseQueryTime.toFixed(2),
          'Render Time (ms)': renderTime.toFixed(2),
          'Total Time (ms)': totalTime.toFixed(2)
        });
      }
    };

    // Wait for page to fully load
    if (document.readyState === 'complete') {
      setTimeout(trackPageLoad, 100);
    } else {
      window.addEventListener('load', () => setTimeout(trackPageLoad, 100));
    }
  }, []);

  // Only show metrics in development
  if (process.env.NODE_ENV !== 'development' || !metrics) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-3 rounded-lg text-xs font-mono z-50 opacity-75">
      <div className="space-y-1">
        <div>Load: {metrics.pageLoadTime.toFixed(0)}ms</div>
        <div>DB: {metrics.databaseQueryTime.toFixed(0)}ms</div>
        <div>Render: {metrics.renderTime.toFixed(0)}ms</div>
        <div className="border-t pt-1">Total: {metrics.totalTime.toFixed(0)}ms</div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;