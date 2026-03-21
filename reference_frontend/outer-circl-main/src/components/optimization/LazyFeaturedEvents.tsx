import React, { lazy, Suspense } from 'react';
import { EventData } from '@/components/ActivityCard';

const MemoizedFeaturedEventsSection = lazy(() => 
  import('@/components/sections/MemoizedFeaturedEventsSection').then(module => ({
    default: module.MemoizedFeaturedEventsSection
  }))
);

interface LazyFeaturedEventsProps {
  featuredEvents: EventData[];
}

const FeaturedEventsLoading = () => (
  <div className="py-16 px-4">
    <div className="container mx-auto">
      <div className="text-center mb-12">
        <div className="h-8 w-64 bg-gray-200 animate-pulse mx-auto mb-4 rounded"></div>
        <div className="h-4 w-96 bg-gray-200 animate-pulse mx-auto rounded"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="h-48 bg-gray-200 animate-pulse"></div>
            <div className="p-4">
              <div className="h-4 bg-gray-200 animate-pulse mb-2 rounded"></div>
              <div className="h-3 bg-gray-200 animate-pulse w-3/4 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const LazyFeaturedEvents: React.FC<LazyFeaturedEventsProps> = ({ featuredEvents }) => {
  return (
    <Suspense fallback={<FeaturedEventsLoading />}>
      <MemoizedFeaturedEventsSection featuredEvents={featuredEvents} />
    </Suspense>
  );
};