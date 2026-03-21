// Enhanced AdSense components with Pinterest-style integration
export { default as EnhancedAdSenseManager } from './EnhancedAdSenseManager';
export { default as PinterestStyleAdCard } from './PinterestStyleAdCard';
export { default as AdFallbackCard } from './AdFallbackCard';
export { default as ProductionAdSenseDebugger } from './ProductionAdSenseDebugger';
export { default as SmartAdPlacement } from './SmartAdPlacement';

// Legacy components (still available for compatibility)
export { default as AdSenseManager } from './AdSenseManager';
export { default as GoogleAutoAds } from './GoogleAutoAds';
export { default as ProductionOptimizedAds } from '../optimization/ProductionOptimizedAds';
export { default as AdSenseDebugPanel } from './AdSenseDebugPanel';
export { default as AdDebugger } from './AdDebugger';
export { default as AdDebugInfo } from './AdDebugInfo';

// Backward compatibility aliases - using existing components
export { default as BannerAd } from './BannerAd';
export { default as SidebarAd } from './SidebarAd';
export { default as PinterestStyleAd } from './PinterestStyleAd'; // Use existing component