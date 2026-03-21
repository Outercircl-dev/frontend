import { useState, useEffect } from 'react';
import { notificationService } from '@/services/notificationService';

interface UseNotificationPermissionsReturn {
  permission: NotificationPermission;
  isSupported: boolean;
  requestPermission: () => Promise<boolean>;
  isInitialized: boolean;
}

export const useNotificationPermissions = (): UseNotificationPermissionsReturn => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    const supported = 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      
      // Initialize the notification service
      notificationService.initialize().then(() => {
        setIsInitialized(true);
        setPermission(Notification.permission);
      });
    } else {
      setIsInitialized(true);
    }
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  return {
    permission,
    isSupported,
    requestPermission,
    isInitialized
  };
};