import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useVirtualScrolling } from '@/hooks/usePerformanceOptimization';

interface VirtualScrollListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
}

export const VirtualScrollList = <T,>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
  overscan = 5
}: VirtualScrollListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const { visibleItems, offsetY, totalHeight } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const visibleItems = [];
    for (let i = startIndex; i <= endIndex; i++) {
      visibleItems.push({ item: items[i], index: i });
    }

    return {
      visibleItems,
      offsetY: startIndex * itemHeight,
      totalHeight: items.length * itemHeight
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan, items]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div key={index} style={{ height: itemHeight }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Optimized grid with virtual scrolling
interface VirtualGridProps<T> {
  items: T[];
  itemHeight: number;
  itemsPerRow: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  gap?: number;
  className?: string;
}

export const VirtualGrid = <T,>({
  items,
  itemHeight,
  itemsPerRow,
  containerHeight,
  renderItem,
  gap = 16,
  className = ''
}: VirtualGridProps<T>) => {
  const rowHeight = itemHeight + gap;
  const totalRows = Math.ceil(items.length / itemsPerRow);
  
  const { visibleItems, offsetY, handleScroll, totalHeight } = useVirtualScrolling(
    totalRows,
    rowHeight,
    containerHeight
  );

  const visibleRows = useMemo(() => {
    return visibleItems.map(rowIndex => {
      const startIndex = rowIndex * itemsPerRow;
      const endIndex = Math.min(startIndex + itemsPerRow, items.length);
      return items.slice(startIndex, endIndex).map((item, colIndex) => ({
        item,
        index: startIndex + colIndex
      }));
    });
  }, [visibleItems, items, itemsPerRow]);

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleRows.map((row, rowIndex) => (
            <div
              key={visibleItems[rowIndex]}
              className={`grid gap-${gap / 4}`}
              style={{
                gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)`,
                height: itemHeight,
                marginBottom: gap
              }}
            >
              {row.map(({ item, index }) => renderItem(item, index))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};