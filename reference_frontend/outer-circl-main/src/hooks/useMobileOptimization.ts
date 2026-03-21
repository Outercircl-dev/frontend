import { useEffect, useState } from 'react';


interface MobileOptimizationResult {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenSize: 'sm' | 'md' | 'lg' | 'xl';
  orientation: 'portrait' | 'landscape';
  preferredInputMethod: 'touch' | 'mouse';
}

export const useMobileOptimization = (): MobileOptimizationResult => {
  const [state, setState] = useState<MobileOptimizationResult>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouchDevice: false,
        screenSize: 'lg',
        orientation: 'landscape',
        preferredInputMethod: 'mouse'
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    return {
      isMobile: width < 768,
      isTablet: width >= 768 && width < 1024,
      isDesktop: width >= 1024,
      isTouchDevice,
      screenSize: width < 640 ? 'sm' : width < 768 ? 'md' : width < 1024 ? 'lg' : 'xl',
      orientation: height > width ? 'portrait' : 'landscape',
      preferredInputMethod: isTouchDevice ? 'touch' : 'mouse'
    };
  });

  useEffect(() => {
    const updateState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

      setState({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        isTouchDevice,
        screenSize: width < 640 ? 'sm' : width < 768 ? 'md' : width < 1024 ? 'lg' : 'xl',
        orientation: height > width ? 'portrait' : 'landscape',
        preferredInputMethod: isTouchDevice ? 'touch' : 'mouse'
      });
    };

    // Debounce resize events for better performance
    let timeoutId: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateState, 150);
    };

    window.addEventListener('resize', debouncedUpdate);
    window.addEventListener('orientationchange', debouncedUpdate);

    return () => {
      window.removeEventListener('resize', debouncedUpdate);
      window.removeEventListener('orientationchange', debouncedUpdate);
      clearTimeout(timeoutId);
    };
  }, []);

  return state;
};

// Helper hook for mobile-specific touch interactions
export const useMobileInteractions = () => {
  const { isTouchDevice } = useMobileOptimization();

  const getTouchEventProps = (onClick?: () => void) => {
    if (!isTouchDevice || !onClick) return {};

    return {
      onTouchStart: (e: React.TouchEvent) => {
        // Add active state for touch feedback
        const target = e.currentTarget as HTMLElement;
        target.style.transform = 'scale(0.98)';
      },
      onTouchEnd: (e: React.TouchEvent) => {
        // Remove active state
        const target = e.currentTarget as HTMLElement;
        target.style.transform = '';
        onClick();
      },
      onTouchCancel: (e: React.TouchEvent) => {
        // Clean up if touch is cancelled
        const target = e.currentTarget as HTMLElement;
        target.style.transform = '';
      }
    };
  };

  return { getTouchEventProps, isTouchDevice };
};

// Performance optimization hook for mobile
export const useMobilePerformance = () => {
  useEffect(() => {
    // Optimize images for mobile
    const optimizeImages = () => {
      const images = document.querySelectorAll('img[data-optimize]');
      images.forEach((img) => {
        const element = img as HTMLImageElement;
        // Add loading="lazy" for better performance
        if (!element.loading) {
          element.loading = 'lazy';
        }
        // Add decoding="async" for better UX
        if (!element.decoding) {
          element.decoding = 'async';
        }
      });
    };

    // Reduce motion for users who prefer it
    const respectReducedMotion = () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) {
        document.documentElement.style.setProperty('--animation-duration', '0.01ms');
      }
    };

    optimizeImages();
    respectReducedMotion();

    // Set up intersection observer for lazy loading optimization
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            element.classList.add('animate-fade-in');
          }
        });
      }, { threshold: 0.1 });

      // Observe elements with data-animate attribute
      const animateElements = document.querySelectorAll('[data-animate]');
      animateElements.forEach((el) => observer.observe(el));

      return () => observer.disconnect();
    }
  }, []);
};