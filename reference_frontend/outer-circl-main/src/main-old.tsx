
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';

// Import CSS with error handling for mobile
const loadCSS = async () => {
  try {
    await import('./index.css');
    console.log('✅ CSS loaded successfully');
  } catch (cssError) {
    console.warn('⚠️ CSS loading failed, continuing without styles:', cssError);
    // Create fallback styles for mobile
    const fallbackCSS = document.createElement('style');
    fallbackCSS.textContent = `
      body { 
        margin: 0; 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; 
        background: #f8f9fa; 
      }
      * { box-sizing: border-box; }
      .min-h-screen { min-height: 100vh; }
      .flex { display: flex; }
      .items-center { align-items: center; }
      .justify-center { justify-content: center; }
      .text-center { text-align: center; }
      .bg-gray-50 { background: #f8f9fa; }
    `;
    document.head.appendChild(fallbackCSS);
  }
};

console.log('🚀 Main.tsx loaded successfully');

// Mobile security and error monitoring
window.addEventListener('error', (event) => {
  console.error('🔥 Global error:', {
    message: event.message,
    filename: event.filename,
    line: event.lineno,
    column: event.colno,
    error: event.error?.message,
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  });
  
  // Handle "operation is insecure" errors specifically
  if (event.message.includes('insecure') || event.message.includes('security')) {
    console.warn('🔒 Security error detected:', event.message);
    event.preventDefault();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔥 Unhandled promise rejection:', event.reason);
  
  // Handle authentication-related security errors
  if (event.reason?.message?.includes('insecure') || 
      event.reason?.message?.includes('security') ||
      event.reason?.message?.includes('Supabase')) {
    console.warn('🔒 Auth/Security error handled gracefully');
    event.preventDefault();
  }
});
const init = () => {
  try {
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      console.error('Root element not found');
      return;
    }

    console.log('📱 Creating React root...');
    const root = createRoot(rootElement);
    
    console.log('🎨 Rendering App...');
    root.render(React.createElement(App));
    
    console.log('✅ App initialization complete');
    
  } catch (error) {
    console.error('🔥 App initialization failed:', error);
    
    // Simple fallback without DOM manipulation conflicts
    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8f9fa; font-family: system-ui;">
          <div style="text-align: center; padding: 20px;">
            <h1 style="color: #E60023; margin-bottom: 16px;">outercircl</h1>
            <p style="color: #666; margin-bottom: 20px;">Failed to start the app</p>
            <button onclick="window.location.reload()" style="background: #E60023; color: white; border: none; padding: 12px 24px; border-radius: 24px; cursor: pointer;">
              Refresh Page
            </button>
            <p style="color: #999; font-size: 12px; margin-top: 12px;">Error: ${error.message || 'Unknown error'}</p>
          </div>
        </div>
      `;
    }
  }
};

// Load CSS first, then start the app
loadCSS().then(() => {
  init();
}).catch((error) => {
  console.warn('CSS loading failed, starting app anyway:', error);
  init();
});
