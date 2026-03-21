/**
 * PWA utility functions for enhanced mobile experience
 */

export interface PWAInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWACapabilities {
  canInstall: boolean;
  isInstalled: boolean;
  canShare: boolean;
  hasNotifications: boolean;
  isOnline: boolean;
  hasVibration: boolean;
}

/**
 * Check PWA capabilities
 */
export const checkPWACapabilities = (): PWACapabilities => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isInWebAppiOS = 'standalone' in window.navigator && (window.navigator as any).standalone;
  
  return {
    canInstall: 'serviceWorker' in navigator && !isStandalone && !isInWebAppiOS,
    isInstalled: isStandalone || isInWebAppiOS,
    canShare: 'share' in navigator,
    hasNotifications: 'Notification' in window,
    isOnline: navigator.onLine,
    hasVibration: 'vibrate' in navigator
  };
};

/**
 * Request notification permission
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'default') {
    return await Notification.requestPermission();
  }

  return Notification.permission;
};

/**
 * Show local notification
 */
export const showNotification = (title: string, options?: NotificationOptions): void => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/lovable-uploads/b4e2c4bb-eb54-48e0-b1ff-69d41bc537fa.png',
      badge: '/lovable-uploads/b4e2c4bb-eb54-48e0-b1ff-69d41bc537fa.png',
      ...options
    });
  }
};

/**
 * Share content using Web Share API or fallback
 */
export const shareContent = async (data: {
  title: string;
  text?: string;
  url: string;
}): Promise<boolean> => {
  try {
    if (navigator.share && navigator.canShare?.(data)) {
      await navigator.share(data);
      return true;
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(data.url);
      return false; // Indicates fallback was used
    }
  } catch (error) {
    console.error('Share failed:', error);
    return false;
  }
};

/**
 * Install PWA programmatically
 */
export const installPWA = async (event: PWAInstallPromptEvent): Promise<boolean> => {
  try {
    event.prompt();
    const choiceResult = await event.userChoice;
    return choiceResult.outcome === 'accepted';
  } catch (error) {
    console.error('Install failed:', error);
    return false;
  }
};

/**
 * Check if device is iOS
 */
export const isIOSDevice = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

/**
 * Check if device supports standalone mode
 */
export const supportsStandaloneMode = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

/**
 * Add PWA install prompt to iOS Safari
 */
export const addToHomeScreenIOS = (): string => {
  if (isIOSDevice() && !supportsStandaloneMode()) {
    return 'To install this app on your iOS device, tap the Share button and select "Add to Home Screen".';
  }
  return '';
};