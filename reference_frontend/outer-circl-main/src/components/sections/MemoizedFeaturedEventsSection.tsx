import React from 'react';
import { EventData } from '@/components/ActivityCard';
import { FeaturedEventsSection } from '@/components/sections';

interface MemoizedFeaturedEventsSectionProps {
  featuredEvents: EventData[];
}

export const MemoizedFeaturedEventsSection = React.memo<MemoizedFeaturedEventsSectionProps>(
  ({ featuredEvents }) => {
    return <FeaturedEventsSection featuredEvents={featuredEvents} />;
  },
  (prevProps, nextProps) => {
    // Deep comparison for events array
    if (prevProps.featuredEvents.length !== nextProps.featuredEvents.length) {
      return false;
    }
    
    // Check if event IDs and imageUrls have changed (most common updates)
    for (let i = 0; i < prevProps.featuredEvents.length; i++) {
      const prev = prevProps.featuredEvents[i];
      const next = nextProps.featuredEvents[i];
      
      if (prev.id !== next.id || prev.imageUrl !== next.imageUrl) {
        return false;
      }
    }
    
    return true;
  }
);

MemoizedFeaturedEventsSection.displayName = 'MemoizedFeaturedEventsSection';