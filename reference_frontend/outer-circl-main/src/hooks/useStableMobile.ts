import { useLayoutEffect } from 'react';
import { useStableState } from './useStableState';

const MOBILE_BREAKPOINT = 768;

/**
 * A stable mobile detection hook that prevents re-render loops
 * Uses useLayoutEffect for synchronous updates before paint
 */
export function useStableMobile() {
  const [isMobile, setIsMobile] = useStableState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= MOBILE_BREAKPOINT;
  });

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number;
    let isScheduled = false;

    const checkMobile = () => {
      const newIsMobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobile(newIsMobile);
      isScheduled = false;
    };

    const scheduleCheck = () => {
      if (!isScheduled) {
        isScheduled = true;
        rafId = requestAnimationFrame(checkMobile);
      }
    };

    // Initial check
    scheduleCheck();

    // Listen for resize with throttling
    window.addEventListener('resize', scheduleCheck, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', scheduleCheck);
    };
  }, [setIsMobile]);

  return isMobile;
}