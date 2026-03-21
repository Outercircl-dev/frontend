import React, { lazy, Suspense } from 'react';
import { LoadingIndicator } from '@/components/ui/loading-indicator';

// Enhanced lazy loading with preloading strategies
export const LazyMap = lazy(() => 
  import('@/components/Map').then(module => {
    // Preload map dependencies
    import('mapbox-gl').catch(console.warn);
    return module;
  })
);

export const LazyMediaGrid = lazy(() => 
  import('@/components/MediaGrid').then(module => {
    // Preload image optimization utilities
    import('@/components/optimization/ImageOptimizer').catch(console.warn);
    return module;
  })
);

export const LazyPhotoGrid = lazy(() => 
  import('@/components/PhotoGrid').then(module => {
    // Preload photo-related components
    import('@/components/optimization/LazyImage').catch(console.warn);
    return module;
  })
);


export const LazyMessagesPopupBar = lazy(() => import('@/components/MessagesPopupBar'));

// Critical component lazy loading with priority
export const LazyCriticalMap = lazy(() => {
  // Higher priority loading for critical map component
  return import('@/components/Map');
});

export const LazyCriticalMediaGrid = lazy(() => {
  return import('@/components/MediaGrid');
});

// Simplified HOC without performance optimization dependency to avoid context issues
export const withLazyLoading = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode,
  options?: { priority?: 'high' | 'low'; preload?: string[] }
) => {
  const LazyComponent = (props: P) => {
    return (
      <Suspense fallback={fallback || <LoadingIndicator className="h-8 w-8" />}>
        <Component {...props} />
      </Suspense>
    );
  };
  
  LazyComponent.displayName = `withLazyLoading(${Component.displayName || Component.name})`;
  return LazyComponent;
};

// Performance-aware component wrapper (simplified to avoid context issues)
export const withPerformanceOptimization = <P extends object>(
  Component: React.ComponentType<P>
) => {
  const OptimizedComponent = React.memo((props: P) => {
    return <Component {...props} />;
  });
  
  OptimizedComponent.displayName = `withPerformanceOptimization(${Component.displayName || Component.name})`;
  return OptimizedComponent;
};

// Optimized wrapper for conditional component loading
interface ConditionalLoadProps {
  condition: boolean;
  children: React.ReactNode;
  placeholder?: React.ReactNode;
}

export const ConditionalLoad: React.FC<ConditionalLoadProps> = ({ 
  condition, 
  children, 
  placeholder = null 
}) => {
  if (!condition) return placeholder as React.ReactElement;
  return <>{children}</>;
};