import React, { useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  threshold?: number;
  resistance?: number;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 80,
  resistance = 2.5
}) => {
  const isMobile = useIsMobile();
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile || window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile || window.scrollY > 0 || startY.current === 0) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      e.preventDefault();
      const distance = Math.min(diff / resistance, threshold * 1.5);
      setPullDistance(distance);
      setIsPulling(distance > threshold * 0.5);
    }
  }, [isMobile, threshold, resistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!isMobile || pullDistance < threshold) {
      setPullDistance(0);
      setIsPulling(false);
      startY.current = 0;
      return;
    }

    setIsRefreshing(true);
    
    try {
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
      
      await onRefresh();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
      setIsPulling(false);
      startY.current = 0;
    }
  }, [isMobile, pullDistance, threshold, onRefresh]);

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="absolute inset-x-0 top-0 z-10 flex items-center justify-center transition-transform duration-200 ease-out"
        style={{
          height: `${Math.max(pullDistance, 0)}px`,
          transform: `translateY(${Math.max(pullDistance - threshold, -threshold)}px)`
        }}
      >
        <div className={`
          flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 backdrop-blur-sm transition-all duration-200
          ${isPulling ? 'scale-100 opacity-100' : 'scale-75 opacity-60'}
        `}>
          <RefreshCw 
            className={`h-4 w-4 text-primary transition-transform duration-200 ${
              isRefreshing ? 'animate-spin' : isPulling ? 'rotate-180' : ''
            }`} 
          />
          <span className="text-xs font-medium text-primary">
            {isRefreshing ? 'Refreshing...' : isPulling ? 'Release to refresh' : 'Pull to refresh'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${pullDistance}px)`
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;