import React from 'react';
import type { EventData } from '@/components/ActivityCard';
import { getRelevantActivityImage } from '@/utils/activityImageMapping';

interface ImageCache {
  [key: string]: string;
}

export const useFeaturedActivitiesImages = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const imageCache = React.useRef<ImageCache>({});
  const usedImages = React.useRef<Set<string>>(new Set());

  const getCacheKey = React.useCallback((event: EventData): string => {
    return `${event.title}-${event.categories.join('-')}`;
  }, []);

  const getImageForEvent = React.useCallback((event: EventData): string => {
    const cacheKey = getCacheKey(event);
    
    // Return cached image if available
    if (imageCache.current[cacheKey]) {
      return imageCache.current[cacheKey];
    }

    // Get relevant image based on activity mapping
    const relevantImage = getRelevantActivityImage(event.title, event.categories);
    
    // Cache the result
    imageCache.current[cacheKey] = relevantImage;
    
    return relevantImage;
  }, [getCacheKey]);

  const enhanceEventsWithStockImages = React.useCallback((events: EventData[]): EventData[] => {
    // Synchronously enhance events with relevant images
    usedImages.current.clear();
    
    const enhancedEvents = events.map(event => {
      // Only enhance image if it's missing or invalid
      const hasValidImage = event.imageUrl && 
        (event.imageUrl.startsWith('/lovable-uploads/') || 
         event.imageUrl.startsWith('https://'));
      
      return {
        ...event,
        imageUrl: hasValidImage ? event.imageUrl : getImageForEvent(event)
      };
    });

    return enhancedEvents;
  }, [getImageForEvent]);

  const clearCache = React.useCallback(() => {
    imageCache.current = {};
    usedImages.current.clear();
  }, []);

  return {
    isLoading,
    getImageForEvent,
    enhanceEventsWithStockImages,
    clearCache
  };
};