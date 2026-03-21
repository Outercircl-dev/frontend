import { useEffect, useState } from 'react';

interface ImagePreloaderOptions {
  priority?: boolean;
  threshold?: number;
}

export const useImagePreloader = (src: string, options: ImagePreloaderOptions = {}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const { priority = false, threshold = 0.1 } = options;

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    
    const handleLoad = () => {
      setIsLoaded(true);
      setIsError(false);
    };

    const handleError = () => {
      setIsError(true);
      setIsLoaded(false);
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    if (priority) {
      // High priority - load immediately
      img.src = src;
    } else {
      // Low priority - use Intersection Observer for lazy loading
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              img.src = src;
              observer.disconnect();
            }
          });
        },
        { threshold }
      );

      // Create a dummy element to observe
      const dummyElement = document.createElement('div');
      observer.observe(dummyElement);
      
      return () => {
        observer.disconnect();
        img.removeEventListener('load', handleLoad);
        img.removeEventListener('error', handleError);
      };
    }

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [src, priority, threshold]);

  return { isLoaded, isError };
};

// Batch image preloader for multiple images
export const useBatchImagePreloader = (sources: string[]) => {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [errorImages, setErrorImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!sources.length) return;

    const loadPromises = sources.map(src => {
      return new Promise<{ src: string; success: boolean }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ src, success: true });
        img.onerror = () => resolve({ src, success: false });
        img.src = src;
      });
    });

    Promise.all(loadPromises).then(results => {
      const loaded = new Set<string>();
      const errors = new Set<string>();

      results.forEach(({ src, success }) => {
        if (success) {
          loaded.add(src);
        } else {
          errors.add(src);
        }
      });

      setLoadedImages(loaded);
      setErrorImages(errors);
    });
  }, [sources]);

  return {
    loadedImages,
    errorImages,
    allLoaded: loadedImages.size === sources.length,
    progressPercent: sources.length > 0 ? (loadedImages.size / sources.length) * 100 : 0
  };
};