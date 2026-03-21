
import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileInitOptions {
  onMobile?: () => void;
  onDesktop?: () => void;
  mobileDelay?: number;
}

/**
 * Hook to handle different initialization patterns for mobile vs desktop
 * Prevents race conditions and network overload on mobile devices
 */
export const useMobileInit = (options: MobileInitOptions = {}) => {
  const { onMobile, onDesktop, mobileDelay = 0 } = options;
  const isMobile = useIsMobile();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const initialize = () => {
      if (isMobile && onMobile) {
        onMobile();
      } else if (!isMobile && onDesktop) {
        onDesktop();
      }
      setIsInitialized(true);
    };

    if (isMobile && mobileDelay > 0) {
      // Delay initialization on mobile to prevent blocking
      timeoutId = setTimeout(initialize, mobileDelay);
    } else {
      // Immediate initialization on desktop or when no delay specified
      initialize();
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isMobile, onMobile, onDesktop, mobileDelay]);

  return { isMobile, isInitialized };
};

/**
 * Hook to prevent network requests on mobile during critical initialization phases
 */
export const useMobileNetworkGuard = () => {
  const isMobile = useIsMobile();
  const [allowNetworkRequests, setAllowNetworkRequests] = useState(!isMobile);

  useEffect(() => {
    if (isMobile) {
      // Allow network requests after a delay on mobile to prevent initial crashes
      const timer = setTimeout(() => {
        setAllowNetworkRequests(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  return { isMobile, allowNetworkRequests };
};
