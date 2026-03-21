import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ServiceWorkerManagerProps {
  enabled?: boolean;
  updateCheckInterval?: number; // minutes
}

export const ServiceWorkerManager: React.FC<ServiceWorkerManagerProps> = ({
  enabled = false, // PHASE 2: DISABLED
  updateCheckInterval = 60
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Service Worker registration and update management
  useEffect(() => {
    if (!enabled || !('serviceWorker' in navigator)) {
      console.log('🚫 Service Worker not supported or disabled');
      return;
    }

    const registerSW = async () => {
      try {
        console.log('🔧 Registering Service Worker...');
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none' // Always check for updates
        });

        setRegistration(registration);
        console.log('✅ Service Worker registered:', registration.scope);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
                toast.info('App update available', {
                  action: {
                    label: 'Update',
                    onClick: () => {
                      newWorker.postMessage({ type: 'SKIP_WAITING' });
                      window.location.reload();
                    }
                  }
                });
              }
            });
          }
        });

      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    };

    registerSW();
  }, [enabled]);

  return null; // This component doesn't render anything
};

export default ServiceWorkerManager;