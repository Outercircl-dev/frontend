// Performance configuration and budgets
export const PERFORMANCE_BUDGETS = {
  // Page load times (milliseconds)
  INITIAL_RENDER: 1000,
  CONTENT_PAINT: 1500,
  INTERACTIVE: 2000,
  
  // Component render times
  NAVBAR_RENDER: 200,
  FORM_RENDER: 500,
  
  // Image loading
  HERO_IMAGE: 800,
  GALLERY_IMAGE: 1200,
  
  // Network requests
  API_CALL: 2000,
  DATABASE_QUERY: 1500,
};

export const PERFORMANCE_FEATURES = {
  // Enable/disable features based on device capabilities
  LAZY_LOADING: true,
  IMAGE_PRELOADING: true,
  VIRTUAL_SCROLLING: true,
  REAL_TIME_SUBSCRIPTIONS: true,
  HEAVY_ANIMATIONS: true,
};

// Adaptive performance settings based on device/connection
export const getAdaptiveSettings = () => {
  const connection = (navigator as any)?.connection;
  const deviceMemory = (navigator as any)?.deviceMemory;
  
  const isSlowConnection = connection?.effectiveType === 'slow-2g' || connection?.effectiveType === '2g';
  const isLowMemory = deviceMemory && deviceMemory < 2;
  
  return {
    enableImagePreloading: !isSlowConnection && !isLowMemory,
    enableHeavyAnimations: !isLowMemory,
    enableRealTimeSubscriptions: !isSlowConnection,
    deferNonCriticalFeatures: isSlowConnection || isLowMemory,
    reduceImageQuality: isSlowConnection || connection?.saveData,
  };
};

export const DEFERRED_FEATURES = {
  // Features that can be loaded after initial render
  IMAGE_PRELOADER: 2000,
  ANALYTICS: 3000,
  NON_CRITICAL_SUBSCRIPTIONS: 1500,
  HEAVY_FORM_FEATURES: 1000,
  INVITATION_SYSTEM: 2500,
};