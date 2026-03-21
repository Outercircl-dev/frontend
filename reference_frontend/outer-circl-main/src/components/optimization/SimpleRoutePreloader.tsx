import React from 'react';

interface SimpleRoutePreloaderProps {
  children: React.ReactNode;
}

// Simplified route preloader using service approach instead of hooks
class RoutePreloadService {
  private static instance: RoutePreloadService;
  private preloadedRoutes = new Set<string>();
  private isInitialized = false;

  static getInstance(): RoutePreloadService {
    if (!RoutePreloadService.instance) {
      RoutePreloadService.instance = new RoutePreloadService();
    }
    return RoutePreloadService.instance;
  }

  init() {
    if (this.isInitialized) return;
    
    // Check connection type to avoid preloading on slow connections
    const connection = (navigator as any).connection;
    if (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
      return;
    }

    this.isInitialized = true;
    this.setupPreloading();
  }

  private setupPreloading() {
    // Preload critical fonts after initial render
    setTimeout(() => {
      this.preloadFont('/fonts/inter-var.woff2');
    }, 1000);

    // DNS prefetch for external services
    setTimeout(() => {
      this.dnsPrefetch('https://api.mapbox.com');
      this.dnsPrefetch('https://randomuser.me');
    }, 500);
  }

  private preloadFont(href: string) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = 'font';
    link.type = 'font/woff2';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }

  private dnsPrefetch(href: string) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = href;
    document.head.appendChild(link);
  }

  preloadRoute(route: string) {
    if (this.preloadedRoutes.has(route)) return;
    
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = route;
    document.head.appendChild(link);
    this.preloadedRoutes.add(route);
  }
}

const SimpleRoutePreloader: React.FC<SimpleRoutePreloaderProps> = ({ children }) => {
  const serviceRef = React.useRef<RoutePreloadService | null>(null);

  React.useEffect(() => {
    try {
      if (!serviceRef.current) {
        serviceRef.current = RoutePreloadService.getInstance();
      }
      serviceRef.current.init();
    } catch (error) {
      console.warn('RoutePreloadService initialization failed:', error);
    }
  }, []);

  return <>{children}</>;
};

export default SimpleRoutePreloader;