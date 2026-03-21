import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface PinterestDashboardSkeletonProps {
  showNavbar?: boolean;
  eventCount?: number;
  isMobile?: boolean;
}

export const PinterestDashboardSkeleton: React.FC<PinterestDashboardSkeletonProps> = ({
  showNavbar = true,
  eventCount = 6, // Reduced to 6 for fastest initial load
  isMobile = false
}) => {
  // Optimized static heights for maximum performance
  const getHeight = (index: number) => {
    return 260; // Single height to reduce computation
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Beta Banner Skeleton */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-primary/20">
        <div className="container mx-auto px-4 py-2">
          <Skeleton className="h-4 w-96 mx-auto" />
        </div>
      </div>

      {/* Navbar Skeleton */}
      {showNavbar && (
        <div className="border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/95">
          <div className="container mx-auto px-4">
            <div className="flex h-16 items-center justify-between">
              <Skeleton className="h-8 w-32" />
              <div className="hidden md:flex items-center space-x-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-20" />
                ))}
              </div>
              <div className="flex items-center space-x-4">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-8 w-32 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Filters Skeleton */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Skeleton className="h-10 flex-1" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
        </div>

        {/* Header Skeleton */}
        <div className="mb-8 text-center">
          <Skeleton className="h-8 w-64 mx-auto mb-2" />
          <Skeleton className="h-4 w-96 mx-auto" />
        </div>

        {/* Pinterest-style Masonry Grid Skeleton - Optimized */}
        <div 
          className={`
            columns-1 
            ${isMobile ? '' : 'md:columns-2 lg:columns-3 xl:columns-4'}
            gap-4 space-y-4
          `}
        >
          {Array.from({ length: eventCount }).map((_, index) => (
            <div
              key={index}
              className="break-inside-avoid"
            >
              <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                {/* Optimized image skeleton */}
                <Skeleton 
                  className="w-full" 
                  style={{ height: `${getHeight(index)}px` }} 
                />
                
                {/* Streamlined content skeleton */}
                <div className="p-4 space-y-3">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />

                  {/* Essential details only */}
                  <div className="flex items-center gap-2 pt-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-24" />
                  </div>

                  {/* Host info */}
                  <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-3">
                    <Skeleton className="h-9 flex-1 rounded-lg" />
                    <Skeleton className="h-9 w-16 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More Button Skeleton */}
        <div className="flex justify-center pt-8">
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Development Panel Skeleton */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8 p-4 bg-card/50 border border-dashed border-border rounded-lg">
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <div className="flex gap-4">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-36" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};