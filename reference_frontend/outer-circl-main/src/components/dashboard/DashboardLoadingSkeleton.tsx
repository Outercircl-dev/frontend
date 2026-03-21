import React from 'react';
import { PinterestLoadingGrid } from '@/components/PinterestLoadingCard';
import { Skeleton } from '@/components/ui/skeleton';

export const DashboardLoadingSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Pinterest-style navbar skeleton */}
      <div className="h-16 border-b bg-card">
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <Skeleton className="h-8 w-32 rounded-pinterest" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Pinterest-style header */}
        <div className="text-center mb-8 space-y-3">
          <Skeleton className="h-10 w-64 mx-auto rounded-pinterest" />
          <Skeleton className="h-4 w-80 mx-auto rounded-pinterest" />
        </div>

        {/* Filter chips - Pinterest style */}
        <div className="mb-8 flex gap-3 flex-wrap justify-center">
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-22 rounded-full" />
        </div>

        {/* Pinterest-style grid loading */}
        <PinterestLoadingGrid count={9} />
      </div>
    </div>
  );
};