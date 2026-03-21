// Service-based route preloading without React hooks dependencies
class RoutePreloadService {
  private static instance: RoutePreloadService;
  private preloadedRoutes = new Set<string>();
  private preloadedAssets = new Set<string>();
  private isSlowConnection = false;

  static getInstance(): RoutePreloadService {
    if (!RoutePreloadService.instance) {
      RoutePreloadService.instance = new RoutePreloadService();
    }
    return RoutePreloadService.instance;
  }

  constructor() {
    this.checkConnectionSpeed();
  }

  private checkConnectionSpeed() {
    const connection = (navigator as any).connection;
    if (connection) {
      this.isSlowConnection = connection.effectiveType === 'slow-2g' || 
                             connection.effectiveType === '2g' ||
                             connection.saveData === true;
    }
  }

  preloadRoute(route: string): void {
    if (this.isSlowConnection || this.preloadedRoutes.has(route)) return;
    
    try {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = route;
      document.head.appendChild(link);
      this.preloadedRoutes.add(route);
    } catch (error) {
      console.warn(`Failed to preload route ${route}:`, error);
    }
  }

  preloadAsset(href: string, as: string, type?: string): void {
    if (this.isSlowConnection || this.preloadedAssets.has(href)) return;
    
    try {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = as;
      if (type) link.type = type;
      if (as === 'font') link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
      this.preloadedAssets.add(href);
    } catch (error) {
      console.warn(`Failed to preload asset ${href}:`, error);
    }
  }

  dnsPrefetch(domain: string): void {
    if (this.isSlowConnection) return;
    
    try {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    } catch (error) {
      console.warn(`Failed to DNS prefetch ${domain}:`, error);
    }
  }

  preloadCriticalAssets(): void {
    // Preload critical fonts
    this.preloadAsset('/fonts/inter-var.woff2', 'font', 'font/woff2');
    
    // DNS prefetch external services
    this.dnsPrefetch('https://api.mapbox.com');
    this.dnsPrefetch('https://randomuser.me');
  }

  preloadRouteAssets(currentPath: string): void {
    const routeAssetMap: Record<string, string[]> = {
      '/': ['/dashboard', '/auth'],
      '/auth': ['/dashboard'],
      '/dashboard': ['/profile', '/create-activity'],
      '/profile': ['/dashboard', '/settings'],
    };

    const routesToPreload = routeAssetMap[currentPath] || [];
    routesToPreload.forEach(route => {
      setTimeout(() => this.preloadRoute(route), 2000);
    });
  }
}

export const routePreloadService = RoutePreloadService.getInstance();