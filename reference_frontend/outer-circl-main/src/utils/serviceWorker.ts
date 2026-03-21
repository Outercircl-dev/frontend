// Service Worker Registration and Management
export interface ServiceWorkerConfig {
  enableOffline: boolean;
  cacheStrategy: 'cacheFirst' | 'networkFirst' | 'staleWhileRevalidate';
  maxCacheAge: number;
  maxCacheSize: number;
}

const defaultConfig: ServiceWorkerConfig = {
  enableOffline: true,
  cacheStrategy: 'staleWhileRevalidate',
  maxCacheAge: 24 * 60 * 60 * 1000, // 24 hours
  maxCacheSize: 50 * 1024 * 1024, // 50MB
};

class ServiceWorkerManager {
  private config: ServiceWorkerConfig;
  private registration: ServiceWorkerRegistration | null = null;

  constructor(config: Partial<ServiceWorkerConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  async register(): Promise<boolean> {
    // PHASE 2: DISABLED - Service workers removed for stability
    console.log('🚫 Service Worker registration disabled (PHASE 2)');
    return false;
  }

  private sendConfigToWorker(): void {
    if (this.registration?.active) {
      this.registration.active.postMessage({
        type: 'CONFIG_UPDATE',
        config: this.config
      });
    }
  }

  private showUpdateNotification(): void {
    // Show user notification that an update is available
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('App Update Available', {
        body: 'A new version of the app is available. Refresh to update.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'app-update'
      });
    }
  }

  async unregister(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      const result = await this.registration.unregister();
      console.log('Service Worker unregistered:', result);
      return result;
    } catch (error) {
      console.error('Service Worker unregister failed:', error);
      return false;
    }
  }

  async clearCache(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('All caches cleared');
    }
  }

  async getCacheSize(): Promise<number> {
    if (!('caches' in window)) return 0;

    let totalSize = 0;
    const cacheNames = await caches.keys();

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      
      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }

    return totalSize;
  }

  // Force service worker update
  async forceUpdate(): Promise<void> {
    if (this.registration) {
      await this.registration.update();
      if (this.registration.waiting) {
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
  }

  // Check if app is running offline
  isOffline(): boolean {
    return !navigator.onLine;
  }

  // Add offline event listeners
  addOfflineListeners(callbacks: {
    onOnline?: () => void;
    onOffline?: () => void;
  }): void {
    window.addEventListener('online', () => {
      console.log('📶 App is online');
      callbacks.onOnline?.();
    });

    window.addEventListener('offline', () => {
      console.log('📴 App is offline');
      callbacks.onOffline?.();
    });
  }
}

export const serviceWorkerManager = new ServiceWorkerManager();

// Hook for React components
export const useServiceWorker = () => {
  const register = () => serviceWorkerManager.register();
  const unregister = () => serviceWorkerManager.unregister();
  const clearCache = () => serviceWorkerManager.clearCache();
  const getCacheSize = () => serviceWorkerManager.getCacheSize();
  const forceUpdate = () => serviceWorkerManager.forceUpdate();
  const isOffline = () => serviceWorkerManager.isOffline();

  return {
    register,
    unregister,
    clearCache,
    getCacheSize,
    forceUpdate,
    isOffline
  };
};