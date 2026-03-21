import { useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

export const useOptimizedNavigation = () => {
  // Safe navigation hooks with fallback
  let navigate;
  let location;
  
  try {
    navigate = useNavigate();
    location = useLocation();
  } catch (error) {
    console.warn('⚠️ Router context not available in useOptimizedNavigation');
    // Provide fallback implementations
    navigate = (path: string) => {
      console.log('Fallback navigation to:', path);
      window.location.href = path;
    };
    location = { pathname: window.location.pathname };
  }
  
  const isMobile = useIsMobile();
  
  // Router is guaranteed ready with CoreAppInitializer
  const isRouterReady = !!(navigate && location);

  // Preload critical routes based on current page
  useEffect(() => {
    const preloadRoutes = () => {
      // Only preload on desktop to save mobile bandwidth
      if (isMobile) return;

      const currentPath = location.pathname;
      
      // Preload likely next destinations based on current page
      const preloadMap: Record<string, string[]> = {
        '/dashboard': ['/messages', '/notifications', '/create-event'],
        '/messages': ['/dashboard', '/notifications'],
        '/notifications': ['/dashboard', '/messages'],
        '/': ['/auth', '/membership']
      };

      const routesToPreload = preloadMap[currentPath] || [];
      
      // Simplified immediate preloading for better performance
      setTimeout(() => {
        routesToPreload.forEach(route => {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = route;
          document.head.appendChild(link);
        });
      }, 100);
    };

    preloadRoutes();
  }, [location.pathname, isMobile]);

  // Navigation with debouncing to prevent rapid successive calls
  const lastNavigationRef = useRef<{ to: string; time: number } | null>(null);
  
  const navigateWithOptimization = useCallback((to: string, options?: { replace?: boolean }) => {
    const now = Date.now();
    
    // Prevent duplicate navigation to same route within 1 second
    if (lastNavigationRef.current?.to === to && now - lastNavigationRef.current.time < 1000) {
      console.log('🚫 Navigation debounced:', to);
      return;
    }
    
    lastNavigationRef.current = { to, time: now };
    
    try {
      navigate(to, options);
    } catch (error) {
      console.warn('⚠️ Navigation failed, using window.location:', error);
      window.location.href = to;
    }
  }, [navigate]);

  return {
    navigate: navigateWithOptimization,
    isRouterReady,
    currentPath: location.pathname
  };
};