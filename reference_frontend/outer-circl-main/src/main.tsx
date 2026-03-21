import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

console.log('⚡ outercircl - instant startup');

// PHASE 1: Import ApplicationController for centralized control
import { ApplicationController } from './core/ApplicationController';

// STEP 1.1: Check localStorage quota BEFORE any operations
const checkStorageQuota = (): boolean => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    console.error('❌ localStorage quota exceeded or blocked');
    // Clear everything except critical auth data
    const authToken = localStorage.getItem('sb-bommnpdpzmvqufurwwik-auth-token');
    localStorage.clear();
    if (authToken) {
      localStorage.setItem('sb-bommnpdpzmvqufurwwik-auth-token', authToken);
    }
    return false;
  }
};

// Run storage check immediately
const storageOk = checkStorageQuota();
console.log(storageOk ? '✅ Storage quota OK' : '⚠️ Storage quota cleared');

// STEP 1.2: BLOCKING service worker cleanup (mobile devices need this)
if ('serviceWorker' in navigator) {
  let swCleared = false;
  const swPromise = navigator.serviceWorker.getRegistrations().then(regs => {
    return Promise.all(regs.map(reg => {
      console.log('🗑️ Unregistering service worker:', reg.scope);
      return reg.unregister();
    }));
  }).then(() => {
    swCleared = true;
    console.log('✅ Service workers cleared');
  }).catch(err => {
    console.warn('SW cleanup error:', err);
    swCleared = true; // Continue even if error
  });
  
  // Busy-wait up to 1 second (critical for mobile to ensure clean state)
  const start = Date.now();
  while (!swCleared && Date.now() - start < 1000) {
    // Intentionally block to ensure SW is cleared before React loads
  }
}

// Utility: Persistent debug logging to localStorage
const MAX_DEBUG_LOGS = 20; // Reduced from 50 to prevent quota issues on mobile
const persistLog = (message: string, data?: any) => {
  try {
    const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
    logs.push({
      timestamp: new Date().toISOString(),
      message,
      data
    });
    // Keep only last 50 entries
    if (logs.length > MAX_DEBUG_LOGS) logs.shift();
    localStorage.setItem('debug_logs', JSON.stringify(logs));
    console.log(message, data);
  } catch (e) {
    console.warn('Failed to persist log:', e);
  }
};

// Make debug logs accessible globally
(window as any).getDebugLogs = () => {
  try {
    const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
    console.table(logs);
    return logs;
  } catch (e) {
    console.error('Failed to read debug logs:', e);
    return [];
  }
};

persistLog('🚀 App started');

// PHASE 1 ARCHITECTURAL FIX: Validate React module BEFORE initialization
const validateReactModule = (): boolean => {
  try {
    // @ts-ignore - Checking React global availability
    if (typeof React === 'undefined') {
      console.error('❌ React module not loaded');
      return false;
    }
    
    // @ts-ignore
    if (typeof React.useState !== 'function' || 
        typeof React.useEffect !== 'function' || 
        typeof React.createElement !== 'function') {
      console.error('❌ React hooks not available');
      return false;
    }
    
    console.log('✅ React module validated');
    return true;
  } catch (e) {
    console.error('❌ React validation failed:', e);
    return false;
  }
};

// Emergency escape - shows after 20 seconds if app doesn't load
const showEmergencyEscape = () => {
  setTimeout(() => {
    // Only show if app is still stuck loading
    const appContainer = document.querySelector('[data-provider="app-providers"]');
    if (!appContainer) {
      persistLog('🆘 Emergency escape triggered - app not loaded after 8s');
      
      const escapeDiv = document.createElement('div');
      escapeDiv.id = 'emergency-escape';
      escapeDiv.innerHTML = `
        <div style="position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); z-index: 99999; background: white; padding: 20px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); text-align: center; max-width: 320px; font-family: system-ui;">
          <h3 style="color: #E60023; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">App Loading Issues?</h3>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button id="clear-reload-btn" style="background: #E60023; color: white; padding: 12px 20px; border: none; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 14px;">
              Clear Cache & Reload
            </button>
            <button id="go-login-btn" style="background: #F0F0F0; color: #333; padding: 12px 20px; border: none; border-radius: 12px; cursor: pointer; font-weight: 600; font-size: 14px;">
              Go to Login
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(escapeDiv);
      
      document.getElementById('clear-reload-btn')?.addEventListener('click', () => {
        persistLog('🆘 User clicked Clear Cache & Reload');
        localStorage.clear();
        sessionStorage.clear();
        location.href = location.origin + '?v=' + Date.now();
      });
      
      document.getElementById('go-login-btn')?.addEventListener('click', () => {
        persistLog('🆘 User clicked Go to Login');
        location.href = location.origin + '/login?v=' + Date.now();
      });
    }
  }, 8000); // STEP 1.4: Reduced to 8 seconds for mobile (was 20s)
};

// Performance-optimized initialization with detailed metrics
const initializeApp = async () => {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    persistLog('❌ Root element not found');
    return;
  }

  // CRITICAL: Validate React BEFORE creating root
  if (!validateReactModule()) {
    persistLog('❌ React validation failed');
    rootElement.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #fff; font-family: system-ui;">
        <div style="text-align: center; padding: 20px;">
          <div style="width: 48px; height: 48px; margin: 0 auto 20px; background: #E60023; border-radius: 50%;"></div>
          <h2 style="color: #333; margin-bottom: 8px;">React Module Error</h2>
          <p style="color: #666;">Unable to initialize application</p>
          <button onclick="window.location.reload()" 
                  style="margin-top: 20px; background: #E60023; color: white; padding: 12px 24px; border: none; border-radius: 24px; cursor: pointer; font-weight: 600;">
            Reload
          </button>
        </div>
      </div>
    `;
    throw new Error('React module validation failed - preventing initialization');
  }

  try {
    const startTime = performance.now();
    performance.mark('app-init-start');
    
    persistLog('✅ Creating React root');
    const root = createRoot(rootElement);
    
    performance.mark('app-render-start');
    persistLog('✅ Rendering App component');
    root.render(<App />);
    
    const renderTime = performance.now() - startTime;
    persistLog(`⚡ Initial render: ${renderTime.toFixed(0)}ms`);
    
    performance.mark('app-render-complete');
    performance.measure('app-initialization', 'app-init-start', 'app-render-complete');
    
    // Log detailed performance metrics
    setTimeout(() => {
      const initMeasure = performance.getEntriesByName('app-initialization')[0];
      persistLog('📊 Startup Performance:', {
        initialization: `${initMeasure?.duration?.toFixed(0)}ms`,
        renderTime: `${renderTime.toFixed(0)}ms`
      });
    }, 100);
    
  } catch (error) {
    persistLog('❌ App initialization failed:', error);
    
    rootElement.innerHTML = `
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: hsl(0 0% 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;">
        <div style="text-align: center; padding: 20px;">
          <h3 style="color: hsl(351 84% 57%); margin-bottom: 16px; font-size: 24px; font-weight: 600;">outercircl</h3>
          <p style="color: hsl(215.4 16.3% 46.9%); margin-bottom: 20px;">The application failed to load properly.</p>
          <button onclick="window.location.reload()" 
                  style="background: hsl(351 84% 57%); color: white; padding: 12px 24px; border: none; border-radius: 16px; cursor: pointer; font-weight: 600;">
            Try again
          </button>
          <p style="color: hsl(215.4 16.3% 46.9%); font-size: 12px; margin-top: 16px;">Error: ${error.message}</p>
        </div>
      </div>
    `;
  }
};

// Start emergency escape timer
showEmergencyEscape();

// Simplified initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}