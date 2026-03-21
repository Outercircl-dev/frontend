import { useState, useEffect, useCallback, useMemo } from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // CRITICAL: Verify React hooks are available before using them
  if (typeof useState !== 'function') {
    console.error('❌ React useState not available in useIsMobile');
    // Return safe default without using hooks
    return typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT;
  }

  // Stable initial detection - only use width check for consistency
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false; // Default to desktop for SSR
    return window.innerWidth <= MOBILE_BREAKPOINT;
  })

  // Stabilized detection function with useCallback
  const checkMobile = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    // Only use width for stable detection
    const widthCheck = window.innerWidth <= MOBILE_BREAKPOINT;
    return widthCheck;
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Use requestAnimationFrame to batch updates and prevent thrashing
    let rafId: number;
    
    const handleResize = () => {
      if (rafId) cancelAnimationFrame(rafId);
      
      rafId = requestAnimationFrame(() => {
        const newIsMobile = checkMobile();
        setIsMobile(prev => {
          // Only update if actually changed to prevent unnecessary re-renders
          if (prev !== newIsMobile) {
            console.log('📱 useIsMobile: State stable change from', prev, 'to', newIsMobile);
            return newIsMobile;
          }
          return prev;
        });
      });
    };
    
    // Initial check with RAF to prevent hydration mismatches
    handleResize();
    
    // Use passive listeners for better performance
    window.addEventListener("resize", handleResize, { passive: true });
    
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
    }
  }, [checkMobile])

  return isMobile
}
