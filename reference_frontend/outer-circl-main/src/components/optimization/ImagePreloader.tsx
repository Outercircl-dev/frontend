import React, { useEffect } from 'react';
import { HOMEPAGE_IMAGES } from '@/utils/imageMapping';

interface ImagePreloaderProps {
  priority?: 'high' | 'low';
  children?: React.ReactNode;
}

/**
 * Preloads critical homepage images for faster display
 */
export const ImagePreloader: React.FC<ImagePreloaderProps> = ({ 
  priority = 'high',
  children 
}) => {
  useEffect(() => {
    const preloadImages = () => {
      // Priority images - preload immediately
      const priorityImages = [
        // Featured events (hero section)
        HOMEPAGE_IMAGES.COLD_PLUNGE,
        HOMEPAGE_IMAGES.HIKING,
        HOMEPAGE_IMAGES.COFFEE_CODE,
        // Critical how it works images
        HOMEPAGE_IMAGES.HOW_IT_WORKS.FOOD_EXPERIENCE,
        HOMEPAGE_IMAGES.HOW_IT_WORKS.HIKING_ACTIVITY,
      ];

      // Secondary images - preload after priority
      const secondaryImages = [
        HOMEPAGE_IMAGES.TODDLER_MEETUP,
        HOMEPAGE_IMAGES.JOGGING,
        HOMEPAGE_IMAGES.HOW_IT_WORKS.FRIENDS_MEETING,
        HOMEPAGE_IMAGES.HOW_IT_WORKS.GROUP_ACTIVITY,
        ...Object.values(HOMEPAGE_IMAGES.SAVE_IDEAS),
        ...Object.values(HOMEPAGE_IMAGES.FEATURES),
      ];

      // Preload priority images immediately
      const preloadBatch = (images: string[], delay = 0) => {
        setTimeout(() => {
          images.forEach((src, index) => {
            const img = new Image();
            img.loading = 'eager';
            img.src = src;
            
            // Stagger loading to avoid overwhelming the browser
            img.onload = () => {
              const link = document.createElement('link');
              link.rel = 'prefetch';
              link.href = src;
              document.head.appendChild(link);
            };
          });
        }, delay);
      };

      if (priority === 'high') {
        preloadBatch(priorityImages, 0);
        preloadBatch(secondaryImages, 1000); // Load secondary after 1s
      } else {
        preloadBatch([...priorityImages, ...secondaryImages], 2000);
      }
    };

    // Start preloading after a short delay to not block initial render
    const timeoutId = setTimeout(preloadImages, 100);
    
    return () => clearTimeout(timeoutId);
  }, [priority]);

  return <>{children}</>;
};

export default ImagePreloader;