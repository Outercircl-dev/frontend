import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import LazyImage from '@/components/optimization/LazyImage';
import { Skeleton } from '@/components/ui/skeleton';

interface VirtualImageGridProps {
  images: string[];
  onImageSelect: (imageUrl: string) => void;
  selectedImage: string;
  gridSize: 'small' | 'large';
  containerHeight?: number;
  onImageError?: (imageUrl: string) => void;
}

const ITEM_HEIGHT = {
  small: 180, // Base height for aspect ratio 4:3 with padding
  large: 240
};

const ITEMS_PER_ROW = {
  small: { mobile: 2, tablet: 3, desktop: 4 },
  large: { mobile: 1, tablet: 2, desktop: 3 }
};

const VirtualImageGrid: React.FC<VirtualImageGridProps> = ({
  images,
  onImageSelect,
  selectedImage,
  gridSize,
  containerHeight = 400,
  onImageError
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  
  // Determine items per row based on screen size
  const itemsPerRow = useMemo(() => {
    if (containerWidth < 640) return ITEMS_PER_ROW[gridSize].mobile;
    if (containerWidth < 1024) return ITEMS_PER_ROW[gridSize].tablet;
    return ITEMS_PER_ROW[gridSize].desktop;
  }, [containerWidth, gridSize]);

  const itemHeight = ITEM_HEIGHT[gridSize];
  const rowHeight = itemHeight + 16; // Include gap

  // Calculate visible rows
  const { visibleRows, offsetY, totalHeight } = useMemo(() => {
    const totalRows = Math.ceil(images.length / itemsPerRow);
    const overscan = 2; // Extra rows to render for smooth scrolling
    
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endRow = Math.min(
      totalRows - 1,
      Math.floor((scrollTop + containerHeight) / rowHeight) + overscan
    );

    const visibleRows = [];
    for (let row = startRow; row <= endRow; row++) {
      const startIndex = row * itemsPerRow;
      const endIndex = Math.min(startIndex + itemsPerRow, images.length);
      const rowImages = images.slice(startIndex, endIndex);
      
      if (rowImages.length > 0) {
        visibleRows.push({ row, images: rowImages, startIndex });
      }
    }

    return {
      visibleRows,
      offsetY: startRow * rowHeight,
      totalHeight: totalRows * rowHeight
    };
  }, [images, itemsPerRow, scrollTop, containerHeight, rowHeight]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
    if (entries[0]) {
      setContainerWidth(entries[0].contentRect.width);
    }
  }, []);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(handleResize);
    const container = document.getElementById('virtual-grid-container');
    if (container) {
      resizeObserver.observe(container);
      setContainerWidth(container.clientWidth);
    }
    
    return () => resizeObserver.disconnect();
  }, [handleResize]);

  return (
    <div
      id="virtual-grid-container"
      className="overflow-auto"
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleRows.map(({ row, images: rowImages, startIndex }) => (
            <div
              key={row}
              className={`grid gap-4 mb-4`}
              style={{
                gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)`,
                height: itemHeight
              }}
            >
              {rowImages.map((imageUrl, colIndex) => {
                const imageIndex = startIndex + colIndex;
                return (
                  <ImageGridItem
                    key={imageUrl}
                    imageUrl={imageUrl}
                    imageIndex={imageIndex}
                    isSelected={selectedImage === imageUrl}
                    onClick={() => onImageSelect(imageUrl)}
                    onError={() => onImageError?.(imageUrl)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface ImageGridItemProps {
  imageUrl: string;
  imageIndex: number;
  isSelected: boolean;
  onClick: () => void;
  onError?: () => void;
}

const ImageGridItem: React.FC<ImageGridItemProps> = React.memo(({
  imageUrl,
  imageIndex,
  isSelected,
  onClick,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer group relative rounded-2xl overflow-hidden border-2 transition-all hover:shadow-lg ${
        isSelected 
          ? 'border-pink-500 ring-4 ring-pink-200 shadow-lg' 
          : 'border-pink-100 hover:border-pink-300'
      }`}
    >
      <AspectRatio ratio={4/3}>
        {isLoading && (
          <Skeleton className="w-full h-full absolute inset-0" />
        )}
        <LazyImage
          src={imageUrl}
          alt={`Stock image ${imageIndex + 1}`}
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            onError?.();
          }}
          priority={imageIndex < 8} // Priority load first 8 images
        />
      </AspectRatio>
      
      {isSelected && (
        <div className="absolute inset-0 bg-pink-500/20 flex items-center justify-center">
          <div className="bg-pink-500 text-white rounded-full p-3 shadow-lg">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
});

ImageGridItem.displayName = 'ImageGridItem';

export default VirtualImageGrid;