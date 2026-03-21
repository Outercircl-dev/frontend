/**
 * PHASE 3 FIX: Deferred AdSense Loading Utility
 * 
 * Dynamically loads Google AdSense after the app is fully rendered
 * to prevent blocking the main thread during initialization.
 */

let adSenseLoaded = false;

export const loadAdSense = () => {
  // Prevent duplicate loading
  if (adSenseLoaded) {
    console.log('📢 AdSense: Already loaded, skipping');
    return;
  }

  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    return;
  }

  // Skip in development to reduce noise
  if (process.env.NODE_ENV === 'development') {
    console.log('📢 AdSense: Skipped in development');
    return;
  }

  try {
    console.log('📢 AdSense: Loading dynamically after app render...');
    
    const adScript = document.createElement('script');
    adScript.async = true;
    adScript.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2506170791039308';
    adScript.crossOrigin = 'anonymous';
    
    adScript.onload = () => {
      console.log('✅ AdSense: Loaded successfully');
      adSenseLoaded = true;
    };
    
    adScript.onerror = (e) => {
      console.warn('⚠️ AdSense: Failed to load (non-critical)');
      adSenseLoaded = true; // Mark as attempted
    };
    
    document.head.appendChild(adScript);
  } catch (e) {
    console.warn('⚠️ AdSense: Initialization failed (non-critical):', e);
    adSenseLoaded = true; // Mark as attempted
  }
};
