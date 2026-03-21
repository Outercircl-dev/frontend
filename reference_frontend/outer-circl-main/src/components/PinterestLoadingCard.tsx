import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface PinterestLoadingCardProps {
  variant?: 'default' | 'hero' | 'compact';
}

/**
 * Pinterest-style loading cards that match the real content layout
 * Creates smooth loading-to-content transitions
 */
export const PinterestLoadingCard: React.FC<PinterestLoadingCardProps> = ({ 
  variant = 'default' 
}) => {
  switch (variant) {
    case 'hero':
      return (
        <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
          <Skeleton className="h-64 w-full rounded-pinterest" />
          <div className="text-center space-y-4">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
            <Skeleton className="h-10 w-32 mx-auto rounded-full" />
          </div>
        </div>
      );
    
    case 'compact':
      return (
        <div className="pinterest-card bg-card rounded-pinterest p-4 space-y-3">
          <Skeleton className="h-32 w-full rounded-card" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      );
    
    default:
      return (
        <div className="pinterest-card bg-card rounded-pinterest overflow-hidden">
          <Skeleton className="h-48 w-full" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16 rounded-full" />
            </div>
          </div>
        </div>
      );
  }
};

/**
 * Pinterest-style grid loading
 */
export const PinterestLoadingGrid: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="pinterest-grid">
      {Array.from({ length: count }).map((_, index) => (
        <PinterestLoadingCard key={index} />
      ))}
    </div>
  );
};

export default PinterestLoadingCard;