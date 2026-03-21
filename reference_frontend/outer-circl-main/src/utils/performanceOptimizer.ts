// Production performance utilities
export const performanceOptimizer = {
  // Defer non-critical tasks - simplified for better performance
  deferUntilIdle: (callback: () => void, timeout = 100) => {
    // Always use setTimeout for predictable timing
    setTimeout(callback, timeout);
  },

  // Preload critical resources
  preloadResource: (url: string, as: 'script' | 'style' | 'image' = 'script') => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = as;
    document.head.appendChild(link);
  },

  // Check if we should use high-performance mode
  isHighPerformanceMode: () => {
    const connection = (navigator as any).connection;
    if (!connection) return false;
    
    return connection.effectiveType === '4g' && 
           connection.downlink > 2 && 
           !connection.saveData;
  },

  // Optimize images based on connection
  getImageQuality: () => {
    const connection = (navigator as any).connection;
    if (!connection) return 0.8;
    
    if (connection.saveData || connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
      return 0.4;
    }
    if (connection.effectiveType === '3g') {
      return 0.6;
    }
    return 0.8;
  },

  // Check if device has sufficient memory
  hasSufficientMemory: () => {
    const memory = (navigator as any).deviceMemory;
    return !memory || memory >= 2; // 2GB+
  }
};

// Initialize performance optimizations
export const initPerformanceOptimizations = () => {
  // Only run in production
  if (process.env.NODE_ENV !== 'production') return;

  // Preload critical resources
  performanceOptimizer.deferUntilIdle(() => {
    if (performanceOptimizer.isHighPerformanceMode()) {
      performanceOptimizer.preloadResource('/dashboard', 'script');
      performanceOptimizer.preloadResource('/create-event', 'script');
    }
  });
};