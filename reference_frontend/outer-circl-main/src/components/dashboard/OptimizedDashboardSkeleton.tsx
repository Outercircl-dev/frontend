import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedDashboardSkeletonProps {
  showNavbar?: boolean;
  eventCount?: number;
  isMobile?: boolean;
}

export const OptimizedDashboardSkeleton: React.FC<OptimizedDashboardSkeletonProps> = ({
  showNavbar = true,
  eventCount = 6,
  isMobile = false
}) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Beta Banner Skeleton */}
      <div className="bg-primary text-background text-center py-1">
        <Skeleton className="h-4 w-64 mx-auto bg-background/20" />
      </div>

      {/* Navbar Skeleton */}
      {showNavbar && (
        <div className="h-16 border-b bg-background">
          <div className="container mx-auto px-4 h-full flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        </div>
      )}

      <div className={`container mx-auto px-4 ${isMobile ? 'py-4' : 'py-6'}`}>
        {/* Filters Skeleton */}
        <div className="mb-6">
          <div className="flex gap-2 mb-4 flex-wrap">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-36" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        {/* Header Skeleton */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Tabs Skeleton */}
        <div className="mb-6">
          <div className="flex gap-1 border-b">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>

        {/* Pinterest-style Grid Skeleton */}
        <div className={`columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4`}>
          {Array.from({ length: eventCount }).map((_, index) => {
            // Vary heights for Pinterest effect
            const heights = ['h-64', 'h-72', 'h-80', 'h-60', 'h-68', 'h-76'];
            const randomHeight = heights[index % heights.length];
            
            return (
              <div 
                key={index} 
                className={`break-inside-avoid bg-card border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 ${
                  index % 3 === 0 ? 'animate-pulse' : index % 3 === 1 ? 'animate-pulse delay-100' : 'animate-pulse delay-200'
                }`}
              >
                {/* Image skeleton with varied height */}
                <Skeleton className={`w-full ${randomHeight} rounded-t-xl`} />
                
                {/* Content skeleton */}
                <div className="p-4 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  
                  {/* Date and location */}
                  <div className="flex items-center gap-2 pt-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  
                  {/* Host info */}
                  <div className="flex items-center gap-2 pt-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex justify-between items-center pt-3">
                    <Skeleton className="h-4 w-16" />
                    <div className="flex gap-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-8 w-20 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Load more skeleton */}
        <div className="flex justify-center mt-8">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Development performance panel skeleton */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 w-64">
          <div className="bg-background border rounded-lg p-4 shadow-lg">
            <Skeleton className="h-5 w-32 mb-3" />
            <div className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-8" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
            <Skeleton className="h-6 w-full mt-3" />
          </div>
        </div>
      )}
    </div>
  );
};