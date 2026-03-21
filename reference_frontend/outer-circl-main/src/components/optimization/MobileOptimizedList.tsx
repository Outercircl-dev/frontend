import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingIndicator } from '@/components/ui/loading-indicator';

interface MobileOptimizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  estimateSize?: number;
  className?: string;
}

export function MobileOptimizedList<T>({
  items,
  renderItem,
  keyExtractor,
  onLoadMore,
  hasMore = false,
  loading = false,
  estimateSize = 300,
  className = ''
}: MobileOptimizedListProps<T>) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Simple virtualization without external dependencies
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: Math.min(20, items.length) });
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const containerHeight = e.currentTarget.clientHeight;
    const itemHeight = estimateSize;
    
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + 5, items.length); // 5 items buffer
    
    setVisibleRange({ start: Math.max(0, start - 2), end });
  }, [estimateSize, items.length]);

  // Intersection observer for load more
  useEffect(() => {
    if (!onLoadMore || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading) {
          setIsIntersecting(true);
          onLoadMore();
        } else {
          setIsIntersecting(false);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loading]);

  // Use simple virtualization for mobile with many items
  const shouldUseVirtualScrolling = items.length > 20 && window.innerWidth < 768;

  if (shouldUseVirtualScrolling) {
    const visibleItems = items.slice(visibleRange.start, visibleRange.end);
    const totalHeight = items.length * estimateSize;
    const offsetY = visibleRange.start * estimateSize;

    return (
      <div
        ref={containerRef}
        className={`h-screen overflow-auto ${className}`}
        onScroll={handleScroll}
        style={{ contain: 'strict' }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleItems.map((item, index) => (
              <div 
                key={keyExtractor(item, visibleRange.start + index)}
                style={{ height: estimateSize }}
              >
                {renderItem(item, visibleRange.start + index)}
              </div>
            ))}
          </div>
        </div>
        
        {hasMore && (
          <div ref={loadMoreRef} className="py-4 text-center">
            {loading ? (
              <LoadingIndicator className="h-6 w-6 mx-auto" />
            ) : (
              <Button variant="outline" onClick={onLoadMore}>
                Load More
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Regular rendering for smaller lists or desktop
  return (
    <div className={className}>
      {items.map((item, index) => (
        <div key={keyExtractor(item, index)}>
          {renderItem(item, index)}
        </div>
      ))}
      
      {hasMore && (
        <div ref={loadMoreRef} className="py-4 text-center">
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <LoadingIndicator className="h-6 w-6" />
              <span className="text-muted-foreground">Loading more...</span>
            </div>
          ) : isIntersecting ? (
            <LoadingIndicator className="h-6 w-6 mx-auto" />
          ) : (
            <Button variant="outline" onClick={onLoadMore}>
              Load More
            </Button>
          )}
        </div>
      )}
    </div>
  );
}